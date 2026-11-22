The node agent (`igni-node-agent`) is one Rust service per KVM host that runs producers' Firecracker microVMs. Its other end inside every VM is the guest agent, over the [vsock protocol](/docs/fleet/guest-protocol-reference). This page is its reference; for how to deploy it see [Deployment](/docs/fleet/deployment), and for the host requirements see [What a host needs](/docs/fleet/configuration).

## Lifecycle

**Ensure running** (`POST /v1/producers/{id}/ensure-running`), in order of preference:

1. **Running.** The VM is already up: a round trip, nothing else.
2. **Resume.** The VM is paused in place: unpaused in a few milliseconds.
3. **Restore.** The producer has its own snapshot taken with the same boot key (image, profile layer, ceiling, vCPUs), over a shared base this node has (or fetches from the replicas). A pre-spawned Firecracker restores it; the default mode (`uffd`) fills anonymous memory page by page from the producer's own changed pages, else zero, else the shared base, and **prefetches the producer's working set** — the pages it faulted on last time, written compressed (`ws.z`) after each merge and read back in first-touch order.
4. **Restore from base / cold boot.** No usable snapshot: the VM boots from the shared warm base, or cold.

**A producer's memory is the shared warm base plus its own changed pages.** The base memory file is plaintext, shared by every producer restored from it, and immutable once built (a random `base_id`; a rebuilt base is a new id). A producer's encrypted state holds only what differs: its changed pages (a sparse file), the ranges that are zero for it while the base has data, the vmstate, its working-set index and its database login. Nothing is copied from the base at a first start.

## Isolation

- **Jailer.** Each Firecracker runs as its own uid in its own chroot, mount and network namespace. The binaries are static musl builds of Firecracker 1.17.0 plus the snapshot patches, using Firecracker's own embedded seccomp policy.
- **Network.** One namespace per VM: a `tap0` with a fixed host-side MAC, and a veth NATed out of `network.egress_interface`. nftables in the namespace drops everything from the guest towards `network.blocked` (RFC 1918, link-local and metadata, CGNAT, the link range) and any new connection to the namespace itself; the root namespace drops forwarded traffic to the same ranges.
- **VM egress is per VM, from its VM profile.** Every VM gets `internal`: it reaches `network.allow` and nothing else — no internet. A VM whose igni server VM profile says `internet: true` (an admin's grant) gets `internet` instead — anything outside `network.blocked` — **on a node that may grant it** (`network.egress = "internet"` is the node's capability, not a default). A grant the node cannot honour (air-gapped, or no capability) still starts the VM, internal-only, logs a warning, counts it (`internet_refused`) and says so in the ensure-running answer's `notes`. A change to a profile applies at the next wake, and to a running VM at once (its namespace's rules replaced in one `nft` transaction).
- **`network.allow`** is the internal destinations igni in the VM needs — the igni API, the paid modules, PostgreSQL, inference, and an internal DNS resolver or package mirror if the image uses one. Each is a name, an IPv4 address or CIDR, and optional ports. They are reachable under either egress. For a service the host publishes with a destination NAT (igni server in Docker on the same host, say), allow the address and port the guests connect to, and nothing more.

## API

JSON over HTTP/1.1, on the unix socket `api.unix_socket` (mode 0660) and, when `[api.tls]` is set, on TCP with mutual TLS. The gateway runs on other hosts and authenticates at the handshake with a certificate from the platform CA, so there is no bearer secret to leak; the unix socket serves operators and a co-located gateway with file permissions as the access control. The gateway decides who may act; the node records the `principal` it is given in the audit log.

| Method and path | Result |
|---|---|
| `POST /v1/producers/{id}/ensure-running` | `{"how": running\|resumed\|restored_from_base\|cold_boot, "vm", "timings", "notes"}`; 507 when the node cannot place it, 409 `conflict` when another node holds the volume, 409 `fenced` for a lower fence than the volume has seen. `profile` (the gateway's, from the feed) is required. |
| `POST /v1/producers/{id}/release` | crypto-erase a suspended producer's local snapshot, unmap its volume, release the lease now; 409 while running |
| `POST /v1/producers/{id}/prepare` / `/commit-prepared` | re-provision a suspended producer into a second snapshot while the current one stays servable, then make it current |
| `POST /v1/producers/{id}/suspend` | `{"record_bytes", "timings", "notes"}`; 409 while a command runs unless `force` |
| `GET /v1/producers/{id}` | state, profile, host RSS, connections, pending merge and jobs, the guest's `status` |
| `PUT /v1/producers/{id}/connections` / `/token` | the gateway's open connection count (idle suspend waits for 0); the producer's access token |
| `POST /v1/producers/{id}/commands` | NDJSON output, then a final record; wakes the VM; closing the request kills the command; audited |
| `POST /v1/jobs`, `GET /v1/jobs/{id}` | a command queued per producer and applied at each VM's next wake, never a mass wake; running VMs apply it at once |
| `GET /v1/audit?producer=&limit=` | who, VM, command, source, exit code, duration |
| `GET /v1/wakes` | suspended producers with igni's `wake_at`, for the gateway to mirror |
| `GET /v1/status` | host memory, `placement_free_mib`, cpus, load, capabilities, images, running VMs, suspended producers with their boot keys, mapped volumes, counters, key provider — the heartbeat body |
| `GET /v1/producers/{id}/stream?port=8765[&mark=control\|pages]` | upgrades to a byte stream to `127.0.0.1:<port>` in the VM over vsock; 404 when the VM is not running (it does not wake it) |
| `POST /v1/keys/rewrap` | re-wrap every stored data key under its transit key's newest version |
| `POST /v1/producers/{id}/erase` / `/reset` | erase an incarnation for good, or erase this life's state and volume while keeping the producer |
| `POST /v1/producers/{id}/db/{revoke\|erase\|export}` | igni's database command for a removed incarnation; `export` answers `application/zip` |

The capabilities the gateway relies on are announced in `capabilities` at registration and in `GET /v1/status`: `heartbeat`, `fence`, `release`, `placement_free`, `images`, `prepare`, `managed_settings`, `control_stream`, `pull_commands`, `spaces`, `erase_volume`, `volume_grow`, `incarnations`, `db_revoke`, `erase`, `reset`, `page_host_mark`, `replica` (when `storage.replicas_dir` is set) and `offload` (when `[offload]` is set).

## Configuration

`/etc/igni/node-agent.toml`; every field and default is in `crates/node-agent/src/config.rs`. Required: `data_dir`, `[firecracker] binary, jailer`, `[image] kernel, rootfs, version`, `[storage] volumes_dir, keys_dir`, `[network] egress_interface`, `[api] unix_socket`, and what VMs may reach: `[[network.allow]]` (every VM reaches that), and `[network] egress = "internet"` if this node may give internet to the VMs whose profile grants it. An air-gapped install also sets `air_gapped = true`. `igni-node-agent --check` validates a file.

Two things to know when upgrading an existing install:

- **VMs get no internet egress by default, and it is per VM.** `network.egress = "internet"` used to give every VM on the node the internet; it is now the node's *capability*, and only VMs whose profile grants `internet: true` get it. An install that relied on blanket internet must set **Internet access** on the profiles that need it (in the portal) before upgrading — a node agent on this release refuses a profile carrying `internet: true` until the gateway and igni server are on it too. A node with `network.egress` unset and no `[[network.allow]]` now starts (it used to be refused) with a warning that its VMs reach nothing outside themselves — give it `[[network.allow]]` entries, or `egress = "internet"` and profiles that grant it. `network.allow` takes IPv4 addresses and CIDRs, not host names.
- **Plaintext volume keys are refused unless asked for.** `keys.provider = "file"` (also what an unset provider means) now needs `allow_plaintext_keys = true`. A production node sets `keys.provider = "transit"`, `"gcp_kms"`, `"aws_kms"` or `"azure_key_vault"`; a test or evaluation node that keeps `file` adds the flag.

## Egress

The agent connects to what its configuration names: the gateway (`[gateway]`), igni server (`[igni_server]`), the key service (`[keys.transit]`, `[keys.gcp_kms]`, `[keys.aws_kms]` or `[keys.azure_key_vault]`, each reaching only its own cloud endpoint and, where configured, the instance-metadata service for a token), the object store (`[offload]`), the `[db]` commands' PostgreSQL, and its VMs over vsock and inside their own namespaces. The guests' own traffic is NATed to `network.egress_interface` and is the customer's routing, not the agent's. A runtime test (`tests/integration/egress.py`, run as root) proves it with a preloaded recorder and loopback fakes; the source half is the gateway's `no_phone_home.rs`, which reads every workspace member.

## Not in the service yet

- **Registering itself** with igni server (`POST /v1/clients`): done once by the operator for now.
- **Garbage collection of the bases published to the replicas**: a node removes its own unused bases, but the shared copies stay, since no node knows whether another still needs one.
- **A real-cloud proof of the AWS KMS and Azure Key Vault providers**: both are tested against loopback fakes and against LocalStack and Lowkey Vault, not yet against an AWS account or an Azure subscription.
- **Profile layers** (a third read-only disk) are wired through boot, jail and base keys, but untested without a layer image from the image build.

## Where to go next

- **[Guest agent protocol](/docs/fleet/guest-protocol-reference)** — the vsock contract this agent speaks to the VM.
- **[Gateway reference](/docs/fleet/gateway-reference)** — the service that drives this one, and the contracts it expects.
- **[How a VM sleeps and wakes](/docs/fleet/how-vms-sleep-and-wake)** — the states behind the lifecycle above.
