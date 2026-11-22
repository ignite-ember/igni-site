The gateway (`igni-gateway`) is the only thing producers — people and apps — connect to. It authenticates them, wakes and routes to their VM, delivers events and commands, provisions VMs, and enforces the licence. It keeps all of its state in PostgreSQL, so any number of instances run at once. This page is its reference; for how to deploy it see [Deployment](/docs/fleet/deployment), and for the host see [What a host needs](/docs/fleet/configuration).

## What it does

| | |
|---|---|
| Authentication | A person presents their igni session; an app presents its app token, which it gets from igni server with `client_credentials` + `private_key_jwt`. Tokens are RS256, `iss` = `aud` = igni's issuer, checked against igni server's JWKS (cached for its `max-age`, refetched on an unknown `kid`). Everything else is refused. The bearer is in `Authorization`, or for browsers the WebSocket subprotocol `igni.bearer.<token>` next to `igni.v1`. |
| The gateway's own identity | A **platform client** of igni server: `client_credentials` with a `private_key_jwt` assertion signed with its own key (ES256 or RS256), a ten-minute platform token cached until a minute before expiry. It is registered once (`POST /v1/clients`, `kind: platform`) and approved by a super admin, who compares the portal's key thumbprint with the one the gateway logs at start (`key_thumbprint`, RFC 7638, with `client_id`). |
| Wake and route | Finds the producer's node (or places it), ensures it is running there, holds the client while it resumes (the WebSocket is accepted at once; messages are buffered), then relays igni's host object model between the client's socket and igni's WebSocket inside the VM, reached through the node agent's vsock stream over mutual TLS. |
| Events, commands, timed wakes | Polls igni server for wakes; wakes VMs for events (pull, hand to igni, acknowledge what igni confirmed) and commands; mirrors every node's timed wakes and honours them on another node after a node loss. |
| Provisioning | New and changed producers are provisioned in the background, so a first request is a resume, not a cold boot. |
| Cluster | Node registry, heartbeats, failure detection, placement with affinity, drain, gradual rebalance, an autoscaling signal. |
| Observability | Prometheus metrics, JSON logs, an audit log of admin actions. |

## State: PostgreSQL only

Any number of gateway instances run at once against one PostgreSQL; none owns anything in memory.

| Table | Holds |
|---|---|
| `gw_producers` | each producer's node, **fencing number**, placement lease, awake flag, timed wake (`wake_at_ms`), replica generation, provisioning state. A gateway changes where a producer runs only while holding its lease; every acquisition bumps the fence, which is sent to the node. The fast path (the producer's node is serving) needs no lease and no write. |
| `gw_nodes` | one row per node: URL, state, capabilities, image, memory, ceilings, VMs, last heartbeat — one transaction per heartbeat. |
| `gw_jobs` | events, commands, timed wakes, provisioning, moves. Claimed with `FOR UPDATE SKIP LOCKED`, ordered by class, then the org with the fewest producers awake, then age; one per (kind, producer), with a backoff that survives re-listing. Workers claim nothing while a live client waits for room. |
| `gw_node_work` | places taken in nodes' background budgets (`erase`, `prestart`), under an advisory lock per node and budget, so a limit holds across every instance. |
| `gw_waiters` | wakes waiting for room, ranked fairly; a waiter retries when its rank is below the free slots the nodes report. |
| `gw_ticks` | periodic work, each tick claimed by one instance per period. |
| `gw_instances`, `gw_rate`, `gw_kv`, `gw_audit` | instance heartbeats (a dead instance's leases, claims and waiters are released), cluster-wide per-minute rate limits, cursors and settings, the admin audit. |

Routes and node rows are cached in each instance; a change is announced with `NOTIFY` and every instance drops what it cached. The channels are namespaced by the gateway's schema, so two gateways on two schemas of one database never act on each other's.

## Waking a producer

1. **Fast path.** The producer's node from the route cache; if it is active, ensure it is running there — `running` costs a round trip, a suspended VM resumes. **Never a producer that is not active:** every wake first reads the producer's row and refuses one the feed removed or deactivated, or one asked for under another organisation than its own; a live client is closed with 1008. That row is all a wake reads — the feed keeps the producer's VM profile on it, so no wake asks igni server anything.
2. **Placement**, under the producer's lease (a new producer; its node dead, draining, or full): candidates are the node holding its snapshot first, then active nodes with room by most free memory, preferring the producer's image. Before waking it elsewhere the old node, if it answers, is told to suspend and release its state and volume lease. One VM per producer, one node at a time; the node agent's volume lease, with fencing numbers, is the last word.
3. **No room anywhere:** the wake joins a fair queue by class — **live** → **event** → **timed** → **command** → **background** — and within a class organisations take turns, the one with the fewest producers awake first. A live client's wait is bounded, then it is closed with **1013 "busy, retry"** (HTTP: 503 with `Retry-After`). Nothing at igni server is ever dropped: events and commands wait there until acknowledged.

## Connections

- The client's WebSocket is accepted as soon as its token checks out, then the producer is woken: the client sees a pause (its first message waits), not a disconnect. Messages it sends meanwhile are buffered (`public.max_buffered_messages`).
- igni's WebSocket is opened through the node agent's stream and frames are relayed unchanged, over a connection already open to the node, so there is no fresh TCP + mTLS handshake.
- If igni's side ends under a connected client (a drain, a node loss), the gateway wakes the producer again — on another node if need be — and reconnects behind the client. RPCs in flight are answered with an error; igni's new `welcome` reaches the client as on any reconnect.
- Reconnects are limited in a sliding window: at most `public.max_reconnects` (3) within `public.reconnect_window_s` (300 s); one more within the window closes the client 1011. Opening igni's WebSocket is given up after `nodes.stream_timeout_s` (15 s).
- Close codes: **1013** busy, retry; **1008** refused (the reason starts with a stable token); **1011** anything else. A connection is closed 1008 `token_expired` once its token's `exp`, plus 30 s leeway, has passed; the client dials again with a current token.

## What igni server provides

The gateway reads **a feed of new and changed producers** with its platform token, rather than a per-producer call:

```
GET /v1/platform/producers?since=<cursor>&limit=500&wait=25
→ 200 {"producers": [{"org_id", "producer": {"kind": "person"|"app"|"space", "id"}, "incarnation", "owner",
                      "active": bool, "removed", "erase_at", "profile_version", "packages_version", "volume_gib",
                      "profile": {"profile_id", "profile_name", "memory_mib", "normal_memory_mib",
                                  "expected_memory_mib", "vcpus", "idle_before_pause_s", "packages",
                                  "setup_script", "volume_max_gib"} | null,
                      "changed_at"}],
       "cursor": "<opaque, pass back as since>"}
```

A row appears whenever a person joins, leaves, is deactivated or moves to a group with another profile; an app is registered, gets the cloud enabled or disabled, or is deleted; or a profile, its packages or the caps change the effective values. The feed is ordered by change, and a producer may appear again. The effective `profile` rides on the row, so the gateway wakes from it directly.

## API

| Listener | Method and path | Does |
|---|---|---|
| public | `GET /v1/connect[?sign_in=1][&pages=1]` (WebSocket) | igni's host object model; `pages=1`: a person's page host |
| public | `GET /v1/pages/{extension_id}/{path…}` | an extension's page file from the person's running igni (never wakes it) |
| public | `POST /v1/sign-in` | a person hands their session to their igni |
| public | `POST /v1/commands` | run a command, NDJSON output |
| public | `GET /v1/me` | who the token is, and its VM's `vm{state, signed_in}` (never wakes it) |
| public | `GET /healthz` | |
| nodes (mTLS) | `POST /v1/nodes/register`, `/v1/nodes/heartbeat`, `/v1/nodes/suspended` | |
| admin (mTLS or loopback) | `GET`/`POST /v1/admin/nodes`, `DELETE /v1/admin/nodes/{id}`, `POST /v1/admin/nodes/{id}/drain`, `/undrain` | audited |
| admin | `GET /v1/admin/producers/{p}`, `POST …/move {to?}`, `POST …/provision {org}` | audited |
| admin | `POST /v1/admin/rollout {image}`, `GET /v1/admin/audit`, `GET /v1/admin/queue`, `GET /metrics` | |

## Metrics

All prefixed `igni_gateway_`: `wakes_total{how,class}`, `wake_ms{how}` and `resume_ms{how}` histograms, `connect_ms`, `queued_total{class}`, `waiters{class}`, `queue_depth{kind,class}`, `busy_replies_total{class}`, `node_mem_available_mib{node}`, `node_mem_total_mib`, `node_running_vms`, `node_ceilings_mib`, `node_host_rss_mib`, `node_state{node,state}`, `node_busy_total`, `node_unreachable_total`, `node_deaths_total`, `connections`, `reconnects_total`, `events_delivered_total`, `events_failed_total`, `provisioned_total{reason,how}`, `provision_ms`, `moves_total{why,how}`, `move_release_failures_total`, `timed_wakes_total`, `jobs_total{kind,outcome}`, `wakes_unlisted_total{outcome}`, `wakes_refused_total{why}` (`org`, `removed`, `group_local_only`, `inactive`, `licence`), `kicked_total`, `token_expired_total`, `origin_refused_total`, `page_requests_total{status}`, `page_ms`, `autoscale_desired_nodes`, `autoscale_serving_nodes`, `autoscale_signals_total`, `auth_refused_total`, `background_in_flight{node,budget}`, `licence_state{state}`, `licence_clock_behind_seconds`, `db_deadlock_retries`.

## Configuration

`/etc/igni/gateway.toml`; every field and default is in `crates/gateway/src/config.rs`. `igni-gateway --check` validates a file and reads the `[igni_server]` files a start needs (the `private_key_file`, parsed for its `alg`, and `ca_cert`) without connecting to anything; `--migrate` applies the schema. Required: `[public] listen`, `[nodes]`, `[database] url`, `[igni_server] url, client_id, private_key_file`.

`[licence] file` (default `/etc/igni/licence/licence.json`) is Fleet's licence, the same file igni server and every paid module read. Every wake asks it first: while the licence is read-only or absent no VM is started, resumed or provisioned, and events and commands wait at igni server; health, admin, halts, removals and exports carry on. A release trusts Ignite Ember's release keys and nothing else — the published test key and `[licence] trust_test_key` exist only in a build with the `test-licence-key` feature, which only the gateway's own tests enable, and a release build refuses a config that names the setting.

**The clock.** Winding the host's clock back does not wind the licence back. The gateway evaluates it at `max(now, latest time seen − 24 h, issued)`; the latest time seen is the deployment's one high-water mark, which igni server holds in its encrypted integrity file. The gateway reads it over the platform link at start and every 10 minutes, caches the last value, and never advances it. While the host's clock is more than a day behind that mark it logs a warning and `licence_clock_behind_seconds` says by how much.

## Egress

The gateway connects to what its configuration names and nothing else: its PostgreSQL (`[database]`), igni server (`[igni_server] url`), the node agents (`[nodes] static_nodes` and the URLs they register), and the optional `[autoscale]` and `[compliance]` webhooks. There is no telemetry, update check or hard-coded host. Two tests hold the line: a runtime test (`crates/gateway/tests/egress.rs`) runs the built binary with every endpoint on loopback and a preloaded recorder that fails the test on any connection to an address that is not a configured endpoint; and a source test (`no_phone_home.rs`) reads every workspace member's shipped source and `Cargo.lock` for a host literal not on the allow-list or a telemetry crate.

## Where to go next

- **[Node agent reference](/docs/fleet/node-agent-reference)** — the host side the gateway drives, and the contracts it relies on.
- **[Running Fleet](/docs/fleet/operations)** — the portal pages, the licence states and measured wake times.
- **[What a host needs, and configuring the binaries](/docs/fleet/configuration)** — the host, and the gateway config at a glance.
