You run Fleet from igni's portal, not from Fleet itself. This page is the day-to-day: where the controls are, how a VM is discarded or erased, what a lapsed licence refuses, how fast VMs wake in practice, and what is not finished.

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

- **The node agent still needs a real KVM host.** Its [manifest](/docs/fleet/deployment) is a systemd unit on bare metal or a nested-virtualisation host, not a generic container or Kubernetes workload — one per host.
- **The gateway image is one you build.** Fleet ships signed binaries, not a runnable container, so the Helm chart and Compose file point at a gateway image you build from `deploy/gateway/Dockerfile` and push to your own registry.
- **Clients connect.** The SDK's [`igni-client`](/docs/core/sdks) discovers a person's cloud igni from igni server (`Fleet.from_server`) and connects to the gateway, and the desktop app's **Local/Cloud switch** runs its pages against that cloud igni instead of the local backend. Fleet's VMs are also reached through the gateway's API, and by services and commands.
- **The node agent does not register itself** with igni server yet; an operator does it (through the gateway's admin API or `nodes.static_nodes`).
- **The organisation's quota of awake VM time is recorded, not enforced.**
- **A former member's export holds only their database rows**, not the files on their VM's volume.
- **Discarding and erasing have been tested against simulated nodes**, not yet on a real Fleet host.
- **Building the guest kernel and image fetches packages** from the internet, so it is not yet an offline build.
- **A valid licence is required outside development.** Ignite Ember's Ed25519 release key (`ie-2026`) is built into the Fleet gateway, which verifies the licence against it offline; without a valid licence Fleet starts no VM except in development (`[licence] trust_test_key = true`). See [Licensing and evaluations](/docs/server/licensing-and-evaluations).

## Where to go next

- **[How a VM sleeps and wakes](/docs/fleet/how-vms-sleep-and-wake)** — the pause/suspend/restore states behind these wake times.
- **[Gateway reference](/docs/fleet/gateway-reference)** — the licence clock, the full HTTP API and every metric named above.
- **[Administering your organisation](/docs/server/administering-your-organisation)** — the portal pages that drive all of this.
