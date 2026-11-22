Fleet's gateway is an ordinary network service, but the node agent runs microVMs on a real KVM host and needs the host set up for it. This page is what a host must bring and the configuration each binary reads; [Deployment](/docs/fleet/deployment) is how you lay the binaries and manifests down.

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

Every field and its default live in the code — `crates/gateway/src/config.rs` and `crates/node-agent/src/config.rs` — and the per-component references spell out the sections that matter in production: see the [gateway reference](/docs/fleet/gateway-reference#configuration) and the [node agent reference](/docs/fleet/node-agent-reference#configuration), which also covers each VM's own egress.

## Where to go next

- **[Deploying the gateway and the node agent](/docs/fleet/deployment)** — the Helm chart, Compose file and systemd unit that write and mount these files.
- **[Node agent reference](/docs/fleet/node-agent-reference)** — VM isolation, per-VM egress and the full configuration surface.
- **[Gateway reference](/docs/fleet/gateway-reference)** — the licence clock, metrics and the egress guarantee.
