**Fleet** gives each person and each app in your organisation its own igni agent, in its own microVM, on your servers. An idle VM is paused and then suspended to disk, and woken when something needs it: a person connecting, a command, an event from a service, or a task the agent scheduled. It is a paid module. This page covers what it is made of, what it needs, how it ties into igni server, and what is not finished.

> **Note:** Fleet is at **0.1.2** and versions on its own cadence, in the `ignite-ember/igni__cloudvm` repository. Its gateway and node agent now ship with deployment manifests — a Helm chart and a Compose file for the gateway, a systemd unit for the node agent (see [Deployment](#deployment)) — and clients can reach it: the SDK's `igni-client` discovers a person's cloud igni from igni server, and the desktop app has a Local/Cloud switch. The node agent still needs a real KVM host. Read [what is not finished](#what-is-not-finished) before planning a rollout.

A Fleet release is a **signed set of binaries and a guest image, not a runnable container**: the gateway, node agent, `cvm` and guest-agent binaries, the guest kernel and read-only base, and their SBOMs, pushed as one signed OCI artefact to `ghcr.io/ignite-ember/igni-fleet:0.1.2` and carried in igni server's [offline update bundle](/docs/server/offline-updates). The node host pulls and verifies it with `deploy/node-agent/fetch-release.sh`; you build the gateway's own container image from `deploy/gateway/Dockerfile`. Running Fleet still needs a licence.

## What runs where

Every **producer** gets one VM. A producer is a person in your organisation, an app (a review bot, an integration), or a space — one end user of an app. Each VM runs the same igni backend the desktop app runs, against the producer's own `/workspace`, with igni as root inside the guest.

| Component | Binary | Where it runs | What it does |
|---|---|---|---|
| Gateway | `igni-gateway` | Anywhere that reaches the nodes and igni server | The only thing clients connect to. Authenticates, wakes and routes, delivers events and commands, provisions VMs. Keeps its state in PostgreSQL. Enforces the licence. |
| Node agent | `igni-node-agent` | One per KVM host | Runs the microVMs: boot, pause, suspend, restore, volumes, encryption. |
| Guest agent | `igni-guest-agent` | Inside every VM | Talks to the node over vsock only. It never opens a network socket. |

The VMs are **Firecracker** microVMs on KVM. Fleet uses Firecracker 1.17.0 with a patch for snapshots, run under Firecracker's jailer with its seccomp policy.

## How a VM sleeps and wakes

- **Paused.** After 10 seconds idle by default, a VM is paused in place. It keeps its memory and wakes fastest.
- **Suspended.** Under memory pressure, or after a day paused, its changed memory pages are written to disk and the VM is stopped. Each VM stores only the pages that differ from a shared base snapshot, encrypted.
- **Restored.** A suspended VM is restored on demand, filling memory as the guest touches it and prefetching the pages it used last time.
- **Offloaded.** After 7 days suspended, its encrypted state can move to an S3-compatible store.

Memory is elastic. A VM runs with its normal memory and can grow up to its most while it needs more, if the node has room. These sizes come from the VM's **profile**, set in the portal. See [VM profiles](/docs/server/administering-your-organisation).

## What a host needs

- **Linux on x86_64 with KVM.** Bare metal with local NVMe is recommended. Nested virtualisation works but makes the first request after a restore several times slower.
- **ext4 with encryption enabled** (`mkfs.ext4 -O encrypt`) for the node's `data_dir`. VM state is encrypted with fscrypt, which XFS does not have.
- **dm-crypt and loop devices** for the per-VM volumes, which are `aes-xts-plain64`.
- **cgroup v2** for the jailer, and **nftables** for VM networking.
- **No swap**, unless you set `storage.allow_swap`.
- **Shared storage** for volumes (`storage.volumes_dir`, for example NFS), so a VM can move between nodes.
- **A key service.** Vault or OpenBao, with the Transit engine (`keys.provider = "transit"`).
- **PostgreSQL** for the gateway.

Arm64 hosts are not supported yet.

## Configuration

Each binary reads one TOML file and checks it with `--check`:

```bash
igni-gateway    --config /etc/igni/gateway.toml    --check
igni-gateway    --config /etc/igni/gateway.toml    --migrate
igni-node-agent --config /etc/igni/node-agent.toml --check
```

The gateway needs at least:

| Section | Keys |
|---|---|
| `[public]` | `listen` — where clients connect |
| `[nodes]` | `listen`, plus TLS and client-certificate settings; nodes connect over mutual TLS |
| `[database]` | `url` |
| `[igni_server]` | `url`, `client_id`, `private_key_file` |
| `[licence]` | `file` (default `/etc/igni/licence/licence.json`) |

The node agent needs at least `data_dir`, `[firecracker] binary` and `jailer`, `[image] kernel`, `rootfs` and `version`, `[storage] volumes_dir` and `keys_dir`, `[network] egress_interface`, and `[api] unix_socket`. On an air-gapped network, also set `air_gapped = true` and list what VMs may reach under `[[network.allow]]`.

No ports have defaults; every listener is one you set. Inside each VM, igni listens on port 8765, and the guest agent on vsock port 1024.

The gateway and the node agent each register with igni server as a **platform** client and are approved by a super admin on the portal's **Services** page, the same way a service is.

## Deployment

The two components deploy differently, because the gateway is a network service and the node agent runs microVMs on a KVM host. The manifests and their references are in [`deploy/`](https://github.com/ignite-ember/igni__cloudvm/tree/master/deploy) in the Fleet repository; deploy the gateway first, then register node agents with it.

**The gateway** — a **Helm chart** (`deploy/gateway/chart`) on Kubernetes, or a **Docker Compose** file (`deploy/gateway/compose.yaml`) on a single host. The chart writes the whole `gateway.toml` from its values and mounts every secret and certificate it names as a file; it refuses `helm install` with a named reason for each thing it will not guess — the image, igni server's identity, the database DSN, the nodes listener's certificates. Because Fleet ships binaries rather than a container, you build the gateway image once from `deploy/gateway/Dockerfile` and push it to the registry your cluster pulls from:

```bash
docker build -f deploy/gateway/Dockerfile -t registry.example.com/igni/igni-gateway:0.1.2 .
helm install fleet-gateway ./deploy/gateway/chart --namespace fleet --create-namespace \
  --set image.repository=registry.example.com/igni/igni-gateway --set image.tag=0.1.2 \
  --set igniServer.url=https://igni.example.com --set igniServer.clientId=<platform-client-id> \
  --set-file secrets.igniServerKey=platform-key.pem \
  --set secrets.databaseUrl='postgres://gateway:...@pg.internal:5432/igni_gateway' \
  --set public.tls.existingSecret=gw-public-tls --set licence.existingSecret=fleet-licence
```

The gateway migrates its own schema on start under an advisory lock, so there is no separate migration step, and more than one replica is safe. Node agents reach it over mutual TLS the gateway terminates, so that listener is published with TLS passthrough, not an L7 ingress.

**The node agent** — a **systemd unit** (`deploy/node-agent/igni-node-agent.service`) on each KVM host, not a container: it runs as root for the jailer, dm-crypt, namespaces and fscrypt, with a long stop timeout so a stop suspends every VM to disk rather than losing it. `deploy/node-agent/fetch-release.sh` pulls and verifies the signed release artefact and lays the binaries and guest image out; `deploy/node-agent/README.md` is the full install and config reference. `node-agent.example.toml` shows a production shape (OpenBao Transit keys, internal-only egress).

## How it ties into igni server

You manage Fleet from igni's portal, not from Fleet itself. The pages are **Apps**, **VM profiles**, **Commands in VMs**, **VM credentials** and, for a super admin, **Cloud limits**. What each does is in [Administering your organisation](/docs/server/administering-your-organisation).

The defaults for the **Standard** profile, and the platform's caps, are igni server settings with the prefix `CLOUD_VM__`:

| Setting | Default |
|---|---|
| `CLOUD_VM__STANDARD_NORMAL_MEMORY_MIB` | `1024` |
| `CLOUD_VM__STANDARD_MEMORY_MIB` | `4096` — the most |
| `CLOUD_VM__STANDARD_VCPUS` | `1` |
| `CLOUD_VM__STANDARD_IDLE_BEFORE_PAUSE_S` | `10` |
| `CLOUD_VM__STANDARD_VOLUME_GIB` / `..._VOLUME_MAX_GIB` | `10` / `50` |
| `CLOUD_VM__CAP_MAX_MEMORY_MIB` | `8192` |
| `CLOUD_VM__CAP_MAX_VCPUS` | `4` |
| `CLOUD_VM__CAP_MAX_IDLE_BEFORE_PAUSE_S` | `3600` |
| `CLOUD_VM__CAP_MAX_VOLUME_GIB` | `200` |
| `CLOUD_VM__CAP_MAX_ERASE_AFTER_IDLE_DAYS` | none — the longest an app's VM may go unwoken before it is erased |

A VM is provisioned for each active producer from igni server's producer feed, so nobody waits for a first boot. It is woken by:

- a connection to the gateway (`GET /v1/connect`, a WebSocket);
- a command, through **Commands in VMs** or `POST /v1/vm/commands` on igni server;
- an event a service sends to the producer. See [Building extensions](/docs/core/building-extensions);
- a task the agent scheduled for itself.

Removing a person from the organisation closes their connection, suspends their VM, and keeps it for the organisation's retention period before erasing it.

## Discarding and erasing

Erasing a VM means its memory state, snapshots, volume and keys: the node agent deletes them and destroys the VM's key in your key service, so no copy anywhere can be read again.

- **Discarding an app.** On the app's page in the portal, **Discard app** removes the app at once: its VM can never be woken again, its credential stops working, and its place under your licence is free straight away. The erasure runs in the background. You can ask for a fresh app with the same name, key and settings in the same step, and its new VM starts at once. A space goes the same way when its app deletes it.
- **Discarding a former member's VM.** A removed person's VM waits for your retention period. On the portal's **Erasures** page, **Discard now** erases it at once instead. A current member's VM is never discarded.
- **Erasing an app's VM after inactivity.** A VM profile can erase an app's or a space's VM that has not been woken for a number of days. The app stays, and its next wake starts from a clean VM, signs in again by itself and gets a new database login. A super admin can set the longest allowed. People's VMs are never erased this way.
- **Legal holds.** A hold on a former member, or on an app, stops these erasures. A held app can still be discarded: the app is gone and its place is free, but its data is kept until the hold is released.
- **Visible and audited.** The **Erasures** page shows each one as scheduled, held, erasing or erased. The discard and the finished erasure are both in your organisation's audit trail, with what was erased.

Fleet's licence covers as many app and space VMs at a time as it does people. At that number, the gateway refuses to start a new one with a reason the app can show; VMs that already exist keep working. Discarding an app frees its place before its erasure finishes.

## When the licence lapses

Only the gateway checks Fleet's licence, before it starts or resumes any VM. See [Licensing and evaluations](/docs/server/licensing-and-evaluations) for the states.

- **Read-only** refuses anything that starts, resumes or provisions a VM: connections, sign-in, commands, events, timed wakes and moves. Health, metrics, node registration, the admin API, suspending, erasures and exports keep working. Events and commands wait at igni server; nothing is lost.
- A refused HTTP request gets `403`. A refused WebSocket is closed with code `1008`.
- The gateway exports `igni_gateway_licence_state{state}` and counts refusals in `igni_gateway_wakes_refused_total{why="licence"}`.

A node agent resumes a VM for the agent's own scheduled tasks without asking the gateway. Those wakes are not yet refused in read-only.

## Measured wake times

Measured with the real igni image doing real work through the gateway, on one bare-metal server (Google Cloud c3-highcpu-192-metal) with every producer's volume on Filestore, first answer at the client, one wake at a time (November 2026):

| Starting from | 100 agents, p50 | p95 | 200 agents, p50 | p95 | 300 agents, p50 | p95 |
|---|---|---|---|---|---|---|
| Paused, back within 10 minutes | 31 ms | 41 ms | 33 ms | 620 ms | 27 ms | 158 ms |
| Paused for over 15 minutes | 40 ms | 224 ms | 37 ms | 83 ms | 36 ms | 79 ms |
| Suspended snapshot | 148 ms | 287 ms | 142 ms | 291 ms | – | – |
| Cold | 135 ms | 285 ms | 141 ms | 912 ms | – | – |

- **After a long idle** igni renews its own credential with igni server. It does so after the first answer, so the wake costs only a few milliseconds more.
- **The slow tail** (p95) is a few wakes held up in the gateway's start step, while the VM itself unpaused in 3–5 ms. It is being investigated.
- **300 agents:** snapshot and cold were measured with fewer wakes and no model turn after each, so they are left out. 400 agents were not measured in this run.
- **Earlier runs:** an earlier run on the same server had 29 ms paused at 50 agents. 398 paused agents used 79 GiB of the server's 503 GiB.

The raw results, and earlier measurements with a smaller test guest and on bare metal, are in `RESULTS.md` in the Fleet repository. Measure on your own hardware before you size a cluster.

## What is not finished

- **The node agent still needs a real KVM host.** Its [manifest](#deployment) is a systemd unit on bare metal or a nested-virtualisation host, not a generic container or Kubernetes workload — one per host.
- **The gateway image is one you build.** Fleet ships signed binaries, not a runnable container, so the Helm chart and Compose file point at a gateway image you build from `deploy/gateway/Dockerfile` and push to your own registry.
- **Clients connect.** The SDK's [`igni-client`](/docs/core/sdks) discovers a person's cloud igni from igni server (`Fleet.from_server`) and connects to the gateway, and the desktop app's **Local/Cloud switch** runs its pages against that cloud igni instead of the local backend. Fleet's VMs are also reached through the gateway's API, and by services and commands.
- **The node agent does not register itself** with igni server yet; an operator does it (through the gateway's admin API or `nodes.static_nodes`).
- **The organisation's quota of awake VM time is recorded, not enforced.**
- **A former member's export holds only their database rows**, not the files on their VM's volume.
- **Discarding and erasing have been tested against simulated nodes**, not yet on a real Fleet host.
- **Building the guest kernel and image fetches packages** from the internet, so it is not yet an offline build.
- **A valid licence is required outside development.** Ignite Ember's Ed25519 release key (`ie-2026`) is built into the Fleet gateway, which verifies the licence against it offline; without a valid licence Fleet starts no VM except in development (`[licence] trust_test_key = true`). See [Licensing and evaluations](/docs/server/licensing-and-evaluations).

## Where to go next

- **[Administering your organisation](/docs/server/administering-your-organisation)** — apps, VM profiles, commands in VMs and VM credentials.
- **[Building extensions](/docs/core/building-extensions)** — how a service reaches a producer's agent, in a VM or on a desktop.
