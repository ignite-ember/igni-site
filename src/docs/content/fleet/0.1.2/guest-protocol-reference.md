This is the contract between the [node agent](/docs/fleet/node-agent-reference) and anything inside a producer's microVM, spoken over vsock. It is implemented by `crates/guest-agent` (guest side) and `crates/node-agent` (host side), with the framing and messages in `crates/guest-proto`. A custom guest image must install and start the guest agent and honour this contract. Protocol version: **v1**.

## What the image must provide

| Item | Contract |
|---|---|
| Binary | `/usr/local/sbin/igni-guest-agent`, a static x86_64 musl binary (`cargo build --release -p igni-guest-agent --target x86_64-unknown-linux-musl`). No runtime dependencies. |
| Start | as **root**, early in boot, **before igni** and before the warm base snapshot is taken: `igni-guest-agent` (defaults: vsock port `1024`, hooks in `/etc/igni-guest`, run directory `/run/igni`; `--activity-stale-s` 10; `--exec-timeout-s` 600). Restart it if it exits; it is stateless. |
| Kernel, memory | `CONFIG_PSI` on by default (the node agent grows a VM under memory pressure from `/proc/pressure/memory`). |
| Kernel | `CONFIG_VIRTIO_VSOCKETS`, `CONFIG_VSOCKETS`, cgroup v2 with `memory.reclaim` (5.19+), `CONFIG_PAGE_REPORTING`, `CONFIG_VIRTIO_BALLOON`. VMGenID (5.18+) recommended; the agent reseeds either way. |
| `/run/igni` | a tmpfs (or any directory on tmpfs) owned by root, mode 0755. The agent creates it if missing. |
| Hooks (optional) | executables in `/etc/igni-guest/hooks/`, described below. In a `*.d` directory only **executable regular files** run, in lexical order, each within the `hook_timeout_ms` the request carries (default 30 s); a README, a directory, a dotfile or an editor backup is skipped. Without hooks the agent's built-in defaults apply. |

The agent never opens a network socket; the only way in is vsock from the host. Root inside the guest is the producer's own (igni runs as root), so the host treats every answer as untrusted input: sizes are capped, every call has a deadline.

## Transport

- Firecracker's vsock device; guest CID 3. The guest agent listens on **vsock port 1024**. The host reaches it through the VM's vsock unix socket: connect, write `CONNECT 1024\n`, read `OK <port>\n`, then speak frames.
- **One request per connection.** The host opens a connection, sends one request frame, reads response frames until a final one, then closes. `exec` and `watch` keep the connection open while they stream; for `exec` the host may send one more frame (`kill`) on the same connection.
- Every connection is dropped by a snapshot restore. The host reconnects.

### Frames

`u32` big-endian length, then that many bytes of UTF-8 JSON. Maximum frame 1 MiB; a larger length closes the connection.

Request: `{"v": 1, "op": "<name>", ...arguments}`. Response: one or more frames; the last has `"final": true`. An error is a final frame `{"final": true, "ok": false, "error": {"code": "...", "message": "..."}}`. Success: `{"final": true, "ok": true, ...result}`. Unknown fields are ignored on both sides; a request with a higher `v` than the agent knows is refused with `code: "version"`.

## Operations

| op | Arguments | Result | Notes |
|---|---|---|---|
| `ping` | – | `version`, `uptime_ms`, `boot_id` | Liveness; `boot_id` changes on every cold boot, not on restore. |
| `ready` | – | `ready` (bool) | `true` when `/run/igni/ready` exists — the image (or igni) creates it once the backend is serving. The node agent takes a warm base snapshot only after `ready`. |
| `status` | – | `suspendable`, `activity`, `activity_source`, `bound`, `mem` {`total_kb`, `free_kb`, `available_kb`, `cached_kb`, `anon_kb`}, `load1` | `activity` is the content of `/run/igni/activity.json` (igni's `app.activity`); `suspendable` is its `suspendable`, `null` when the file is absent or older than 10 s while a run is reported. |
| `watch` | `interval_ms` (default 250) | streamed `{"final": false, "suspendable": ..., "state": ...}` on every change, never final | Until the host closes. |
| `forward` | `port` | `ok` `{"port"}`, then **the connection is a byte stream** to `127.0.0.1:<port>` | Only ports the agent was started with (`--forward-port`, repeatable; default 8765, igni's WebSocket); others `forbidden`, a refused connect `failed`. Up to 1,024 connections at once. |
| `post_restore` | `unix_time_ns`, `entropy_b64` (≥ 32 bytes), `hook_timeout_ms` | `clock_step_ms`, `reseeded`, `generation` | Sets `CLOCK_REALTIME`, adds the entropy with credit and forces a CRNG reseed, writes **`/run/igni/restored`** (the generation increments on every restore), then starts `hooks/after-restore.d/*` detached. Sent right after every restore, asynchronously — the VM already answers, the kernel CRNG having been reseeded by VMGenID before the vCPUs ran. igni watches `restored` to empty its database pools and reconnect, instead of inferring a restore from a clock jump. |
| `flush` | – | `ms` | `sync()` of all filesystems. |
| `trim` | `bytes` (default: `max`) | `ms`, `reclaimed_kb`, `mem` | Writes `bytes` to `/sys/fs/cgroup/memory.reclaim`. Never `drop_caches`. `max` means "as much as cold pages allow". |
| `set_reporting_order` | `order` (0–10) | `order` | Writes `/sys/module/page_reporting/parameters/page_reporting_order`. The node agent sends 3 after every cold boot. |
| `before_suspend` | `hook_timeout_ms` | `ms`, `hooks` | Runs `hooks/before-suspend.d/*` (igni hands its free heap back). Then the host calls `trim`, `flush`. |
| `attach_volume` | `device` (default `/dev/vdb`), `hook_timeout_ms` | `ms`, `mounted`, `layout` | After the producer's volume is attached (cold boot, or swapped in after a warm-base restore). Runs `hooks/attach-volume <device>` if present, else the built-in layout below. Idempotent. |
| `write_file` | `path`, `data_b64`, `mode` (octal string, default `"0600"`) | `bytes` | Atomic: temp file in the same directory, `fsync`, rename. Only under `/run/igni/`, and under `/vol/igni/` while the volume is mounted. |
| `exec` | `argv` or `shell`, `env`, `cwd`, `timeout_ms` (default 600 s), `stdin_b64` | streamed stdout/stderr chunks, then a final `{"exit_code", "signal", "timed_out", "killed", "duration_ms"}` | Runs as root in a new session; on timeout or `kill` the whole process group gets `SIGKILL`. The host may send `{"op": "kill"}` on the same connection. Output chunks up to 64 KiB. |

### Built-in volume layout (`attach_volume` without a hook)

- Mount `<device>` (ext4) at `/vol`; create `/vol/upper`, `/vol/work`, `/vol/workspace`.
- Overlay the producer's writable layer over the system directories that installs change — `/etc`, `/usr`, `/var`, `/opt`, `/root`, `/home` — each as `overlay lowerdir=<dir>,upperdir=/vol/upper/<name>,workdir=/vol/work/<name>`. Packages installed as root persist; an image upgrade resets the layer by clearing `/vol/upper`, never `/vol/workspace`.
- Bind `/vol/workspace` on `/workspace`.

Mounts the image placed under one of these directories before the attach (for example a bind-mounted `/etc/resolv.conf`) are hidden by the overlay: put such files in the base image, or re-apply them in an `attach-volume` hook. A warm base snapshot is taken with a placeholder disk and nothing mounted; the node agent swaps the producer's volume in after the restore and calls `attach_volume`.

## Files the host writes into the guest (`write_file`)

| Path | Content | When |
|---|---|---|
| `/run/igni/token` | the producer's access token | after every boot and restore, and on every refresh |
| `/run/igni/producer.env` | `IGNI_DATABASE_URL`, `IGNI_ACCESS_TOKEN_FILE`, `IGNI_ORG`, `IGNI_PRODUCER` (`person:<id>` or `app:<id>`), one `KEY=value` per line | written after the token, both after `attach_volume`; rewritten only when it changes |
| `/vol/igni/vm-credential` | an app's VM credential (`igvm1.…`), mode 0600, on the producer's volume | once, when the app's VM is first created, and again after a re-issue; igni rotates it afterwards |
| `/run/igni/restored` | `{"generation", "at_ms", "clock_step_ms"}` | written by the guest agent itself during `post_restore`; igni watches it for "I was restored" |

## What igni provides, and what the node agent relies on

- **`/run/igni/ready`:** written once the backend serves, before igni is bound to a producer, so the warm base snapshot is taken after igni's imports.
- **Late binding:** igni reads `IGNI_DATABASE_URL`, `IGNI_ORG` and `IGNI_PRODUCER` from `/run/igni/producer.env` when it appears, and the token from `IGNI_ACCESS_TOKEN_FILE` on every load.
- **`/run/igni/activity.json`:** igni's `app.activity` (`state`, `suspendable`, `waiting_approvals`, `sessions`, and more), written atomically only once bound. `status` reports `bound: true` when it exists, and the node agent replies to ensure-running only then.
- **Restore detection:** igni watches `/run/igni/restored` rather than a clock jump; a quick come-back steps the clock by less than 5 s, and the step lands just after the VM answers.

## Parked streams (TCP)

`--park-port N` (default 1025; 0 = off), `--park-peer ADDR` (default the host's address on the VM's link): the guest agent accepts TCP connections on the VM's network from that address only, waits for the first bytes, then relays both ways to the first `--forward-port` (igni's WebSocket). The node agent parks one such connection per VM before pausing it: unlike vsock connections, which a snapshot resets, it survives the unpause. `forward` also takes `"lazy": true` (connect on the first bytes) over vsock.

## Where to go next

- **[Node agent reference](/docs/fleet/node-agent-reference)** — the host side of this protocol, and the lifecycle that drives it.
- **[How a VM sleeps and wakes](/docs/fleet/how-vms-sleep-and-wake)** — where `post_restore`, `before_suspend` and the warm base fit in.
