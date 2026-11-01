**Fleet** gives each person and each app in your organisation its own igni agent, in its own microVM, on your servers. An idle VM is paused and then suspended to disk, and woken when something needs it: a person connecting, a command, an event from a service, or a task the agent scheduled. It is a paid module. This page covers what it is made of, what it needs, how it ties into igni server, and what is not finished.

> **Note:** Fleet's gateway and node agent are built, but there are no deployment manifests for them yet, and the desktop app and CLI do not connect to Fleet. Read the last section before planning a rollout.

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

Memory is elastic. A VM runs with its normal memory and can grow up to its most while it needs more, if the node has room. These sizes come from the VM's **profile**, set in the portal. See [VM profiles](/docs/administering-your-organisation).

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

## How it ties into igni server

You manage Fleet from igni's portal, not from Fleet itself. The pages are **Apps**, **VM profiles**, **Commands in VMs**, **VM credentials** and, for a super admin, **Cloud limits**. What each does is in [Administering your organisation](/docs/administering-your-organisation).

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
- an event a service sends to the producer. See [Building extensions](/docs/building-extensions);
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

Only the gateway checks Fleet's licence, before it starts or resumes any VM. See [Licensing and evaluations](/docs/licensing-and-evaluations) for the states.

- **Read-only** refuses anything that starts, resumes or provisions a VM: connections, sign-in, commands, events, timed wakes and moves. Health, metrics, node registration, the admin API, suspending, erasures and exports keep working. Events and commands wait at igni server; nothing is lost.
- A refused HTTP request gets `403`. A refused WebSocket is closed with code `1008`.
- The gateway exports `igni_gateway_licence_state{state}` and counts refusals in `igni_gateway_wakes_refused_total{why="licence"}`.

A node agent resumes a VM for the agent's own scheduled tasks without asking the gateway. Those wakes are not yet refused in read-only.

## Measured wake times

Measured with the real igni image doing real work through the gateway, on one bare-metal server (Google Cloud c3-highcpu-192-metal) with every producer's volume on Filestore, first answer at the client, 40 wakes of each:

| Starting from | 50 agents, p50 | p95 | 300 agents, p50 | p95 |
|---|---|---|---|---|
| Paused | 29 ms | 73 ms | 30 ms | 36 ms |
| Suspended snapshot | 155 ms | 194 ms | 146 ms | 203 ms |
| Cold | 137 ms | 188 ms | 139 ms | 206 ms |

The 300-agent column had the gateway keep each producer's VM profile for a day; when it still fetched the profile from igni server on a wake, paused wakes took 92–116 ms p50 at 100–300 agents. The gateway now keeps each producer's profile from igni server's feed of producers and asks igni server nothing on a wake: with 100 agents woken at once after a long idle, its own part of the wake went from 3.9–4.9 s to 0.2–0.5 s p50 (`RESULTS.md`, "The profile from the feed"). 398 paused agents used 79 GiB of the server's 503 GiB.

The raw results, and earlier measurements with a smaller test guest and on bare metal, are in `RESULTS.md` in the Fleet repository. Measure on your own hardware before you size a cluster.

## What is not finished

- **No deployment manifests.** There is no Helm chart, compose file or systemd unit for the gateway or node agent, and they are not in the [offline update bundle](/docs/offline-updates). You build them from source (`scripts/build_agents.sh`, `patches/build_firecracker.sh`, `image/build_all.sh`).
- **No client connects to Fleet yet.** The desktop app and CLI run igni on your own machine. Fleet's VMs are reached through the gateway's API, and by services and commands.
- **The node agent does not register itself** with igni server yet; an operator does it.
- **The organisation's quota of awake VM time is recorded, not enforced.**
- **A former member's export holds only their database rows**, not the files on their VM's volume.
- **Discarding and erasing have been tested against simulated nodes**, not yet on a real Fleet host.
- **Building the guest kernel and image fetches packages** from the internet, so it is not yet an offline build.
- **No release key** is built in yet, so Fleet starts no VM outside development until one is. See [Licensing and evaluations](/docs/licensing-and-evaluations).

## Where to go next

- **[Administering your organisation](/docs/administering-your-organisation)** — apps, VM profiles, commands in VMs and VM credentials.
- **[Building extensions](/docs/building-extensions)** — how a service reaches a producer's agent, in a VM or on a desktop.
