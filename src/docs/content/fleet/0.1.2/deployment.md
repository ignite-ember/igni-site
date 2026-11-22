The two components deploy differently, because the gateway is a network service and the node agent runs microVMs on a KVM host. The manifests and their references are in [`deploy/`](https://github.com/ignite-ember/igni__cloudvm/tree/master/deploy) in the Fleet repository; deploy the gateway first, then register node agents with it. For what the host itself must provide, and the fields these manifests fill in, see [What a host needs, and configuring the binaries](/docs/fleet/configuration).

## The gateway

A **Helm chart** (`deploy/gateway/chart`) on Kubernetes, or a **Docker Compose** file (`deploy/gateway/compose.yaml`) on a single host. The chart writes the whole `gateway.toml` from its values and mounts every secret and certificate it names as a file; it refuses `helm install` with a named reason for each thing it will not guess — the image, igni server's identity, the database DSN, the nodes listener's certificates. Because Fleet ships binaries rather than a container, you build the gateway image once from `deploy/gateway/Dockerfile` and push it to the registry your cluster pulls from:

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

## The node agent

A **systemd unit** (`deploy/node-agent/igni-node-agent.service`) on each KVM host, not a container: it runs as root for the jailer, dm-crypt, namespaces and fscrypt, with a long stop timeout so a stop suspends every VM to disk rather than losing it. `deploy/node-agent/fetch-release.sh` pulls and verifies the signed release artefact and lays the binaries and guest image out; `deploy/node-agent/README.md` is the full install and config reference. `node-agent.example.toml` shows a production shape (OpenBao Transit keys, internal-only egress).

## Where to go next

- **[Running Fleet](/docs/fleet/operations)** — the portal pages, erasure and what a lapsed licence refuses.
- **[Node agent reference](/docs/fleet/node-agent-reference)** — the host service, its API and the per-VM egress upgrade note.
- **[Gateway reference](/docs/fleet/gateway-reference)** — the state model, the producer feed and the egress guarantee.
- **[Offline updates](/docs/server/offline-updates)** — carrying the signed Fleet artefact into an air-gapped network.
