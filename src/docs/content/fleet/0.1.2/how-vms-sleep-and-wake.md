An idle VM does not sit holding a server's memory. Fleet puts it away in stages and brings it back on demand, so hundreds of agents can live on one host while only the working set is resident. This page is the state machine; what actually triggers a wake is in [Running Fleet](/docs/fleet/operations#how-it-ties-into-igni-server).

## How a VM sleeps and wakes

- **Paused.** After 10 seconds idle by default, a VM is paused in place. It keeps its memory and wakes fastest.
- **Suspended.** Under memory pressure, or after a day paused, its changed memory pages are written to disk and the VM is stopped. Each VM stores only the pages that differ from a shared base snapshot, encrypted.
- **Restored.** A suspended VM is restored on demand, filling memory as the guest touches it and prefetching the pages it used last time.
- **Offloaded.** After 7 days suspended, its encrypted state can move to an S3-compatible store.

Memory is elastic. A VM runs with its normal memory and can grow up to its most while it needs more, if the node has room. These sizes come from the VM's **profile**, set in the portal. See [VM profiles](/docs/server/administering-your-organisation).

## Where to go next

- **[Running Fleet](/docs/fleet/operations)** — what wakes a VM, measured wake times, and licensing.
- **[Node agent reference](/docs/fleet/node-agent-reference)** — the ensure-running lifecycle, the shared base snapshot and the working-set prefetch in detail.
- **[What a host needs, and configuring the binaries](/docs/fleet/configuration)** — the storage and encryption a suspend and restore rely on.
