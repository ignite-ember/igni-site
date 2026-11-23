**Fleet** gives each person and each app in your organisation its own igni agent, in its own microVM, on your servers. An idle VM is paused and then suspended to disk, and woken when something needs it: a person connecting, a command, an event from a service, or a task the agent scheduled. It is a paid module. These pages cover what it is made of, what it needs, how it ties into igni server, and what is not finished.

> **Note:** Fleet is at **0.1.2** and versions on its own cadence, in the `ignite-ember/igni__cloudvm` repository. Its gateway and node agent now ship with deployment manifests — a Helm chart and a Compose file for the gateway, a systemd unit for the node agent (see [Deployment](/docs/fleet/deployment)) — and clients can reach it: the SDK's `igni-client` discovers a person's cloud igni from igni server, and the desktop app has a Local/Cloud switch. The node agent still needs a real KVM host. Read [what is not finished](/docs/fleet/operations#what-is-not-finished) before planning a rollout.

A Fleet release is a **signed set of binaries and a guest image, not a runnable container**: the gateway, node agent, `cvm` and guest-agent binaries, the guest kernel and read-only base, and their SBOMs, pushed as one signed OCI artefact to `ghcr.io/ignite-ember/igni-fleet:0.1.2` and carried in igni server's [offline update bundle](/docs/server/offline-updates). The node host pulls and verifies it with `deploy/node-agent/fetch-release.sh`; you build the gateway's own container image from `deploy/gateway/Dockerfile`. Running Fleet still needs a licence.

## What runs where

Every **producer** gets one VM. A producer is a person in your organisation, an app (a review bot, an integration), or a space — one end user of an app. Each VM runs the same igni backend the desktop app runs, against the producer's own `/workspace`, with igni as root inside the guest.

| Component | Binary | Where it runs | What it does |
|---|---|---|---|
| Gateway | `igni-gateway` | Anywhere that reaches the nodes and igni server | The only thing clients connect to. Authenticates, wakes and routes, delivers events and commands, provisions VMs. Keeps its state in PostgreSQL. Enforces the licence. |
| Node agent | `igni-node-agent` | One per KVM host | Runs the microVMs: boot, pause, suspend, restore, volumes, encryption. |
| Guest agent | `igni-guest-agent` | Inside every VM | Talks to the node over vsock only. It never opens a network socket. |

The VMs are **Firecracker** microVMs on KVM. Fleet uses Firecracker 1.17.0 with a patch for snapshots, run under Firecracker's jailer with its seccomp policy.

Each component has a reference of its own: the [gateway](/docs/fleet/gateway-reference), the [node agent](/docs/fleet/node-agent-reference) and the [guest agent protocol](/docs/fleet/guest-protocol-reference) between the node and the VM.

## Where to go next

- **[How a VM sleeps and wakes](/docs/fleet/how-vms-sleep-and-wake)** — pausing, suspending, restoring and the elastic memory behind them.
- **[What a host needs, and configuring the binaries](/docs/fleet/configuration)** — the KVM host, and the gateway and node-agent config files.
- **[Deploying the gateway and the node agent](/docs/fleet/deployment)** — the Helm chart, the Compose file and the systemd unit.
- **[Running Fleet](/docs/fleet/operations)** — the portal, erasure, licensing and what is not finished.
- **[Administering your organisation](/docs/server/administering-your-organisation)** — apps, VM profiles, commands in VMs and VM credentials, in igni's portal.
