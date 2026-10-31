**CodeIndex** reads your repositories and gives the agent a graph of them it can query. It is a paid module: a service you deploy beside igni server, plus an igni extension that the service ships to people's machines. This page covers what it builds, where each half runs, how to deploy it, and what it does when its licence lapses.

## What it builds

The service clones a repository, parses it with tree-sitter, writes AI summaries of files and entities, and emits one **changeset per commit** as JSON Lines to an object store. A run is full or incremental; an incremental run carries only the diff. It works in six phases:

| Phase | What happens |
|---|---|
| 0 | File extraction: clone, syntax tree, entities and the relationships between them |
| 1 | First file summaries |
| 2 | Entity summaries and domain tags |
| 3 | Final file summaries |
| 4 | Folder summaries |
| 5 | Changeset emission |

For each entity it records a summary, a quality assessment, a security analysis, issues and concerns, and testing status. For each file it records purpose, architecture, code quality, security, technical debt, testing, dependencies and recommendations. It also records tags (frameworks, domain, layers, patterns, vulnerabilities and others) and a reference graph: calls, imports, extends, implements, decorates and types-as, each in both directions. A repository-level project map sits on top.

It can also review pull and merge requests and post its findings as comments. That is switched per repository.

**The service holds no index.** It emits changesets and embeds nothing. The index is built on each developer's machine from those changesets, by the extension.

## The index on your machine

The CodeIndex extension (`igni.codeindex`) keeps one local Neo4j database per project and commit. It downloads the changeset for your `HEAD`, applies it, and makes the embeddings locally with `all-MiniLM-L6-v2` on ONNX Runtime — 384 dimensions, cosine, in an HNSW vector index, beside a full-text index. Everything it needs is in the extension bundle and pinned by hash: Neo4j Community 5.26.0, a Java 21 runtime per platform, and the embedding model. So it works on a machine with no internet access.

Each of those databases listens on `127.0.0.1` only, with Neo4j's HTTP connector (Browser and the HTTP API) switched off, and needs a password: a random one per project and commit, generated on its first start and kept beside its data in a file only your user can read (mode `0600`; on Windows, under your user profile). Nothing else on the machine or the network can read the index without it. The index is not encrypted at rest — Neo4j Community has no encryption at rest — so it relies on the machine's disk encryption (FileVault, BitLocker, LUKS); keep that on wherever you index code you would not leave on an unencrypted disk.

The client never asks for indexing. When `HEAD` moves, the extension asks the service whether a changeset exists for that commit and pulls it if so.

There are no client settings. The extension finds the repository from its git remote. There is no repository id, URL or token to configure; it reaches the service with a ten-minute token the igni host gives it.

## What the agent gets

While the local index covers `HEAD`, the extension changes what the agent is told and what it can do:

- **A tool, `codeindex_cypher`.** It runs read-only Cypher against the local graph. A call must pass `confirm_raw_cypher=True`. A guard refuses anything that writes (`CREATE`, `MERGE`, `SET`, `DELETE`, `REMOVE`, `DROP` and so on) and allows only the vector and full-text index procedures. Results default to 50 rows and are capped at 500.
- **The `data-architect` agent.** The main agent's prompt tells it to hand code questions to `data-architect`, which writes the Cypher. Without a covering index this guidance is not in the prompt, and the agent falls back to shell search.
- **Prompt changes for other agents.** The explorer and plan researcher are replaced, and the architect, debugger, reviewer, security and simplifier prompts gain sections. These apply only while the index covers `HEAD`.
- **A plan check.** While the index covers `HEAD`, a plan that names fewer than two files is sent back to the agent.
- **`/codeindex`**, a page showing the index, and the skill **`/resolve-issues`**.
- **A status indicator** in the client showing whether the index is fresh, checked every 30 seconds.

An administrator can switch the extension on or off per group. See [Administering your organisation](/docs/administering-your-organisation).

## Languages

Parsing uses `tree-sitter` 0.25.2 and `tree-sitter-language-pack` 0.13.0. Languages checked against real repositories include Python, TypeScript, TSX, JavaScript, Go, Rust, Java, Kotlin, Scala, C, C++, C#, Swift, Ruby, PHP, Dart, Lua, Perl and Nim. Other languages the parser pack covers are extracted too, but several have only one repository behind their validation and should be treated as provisional. Markup and configuration files are extracted and dropped.

## How indexing is triggered

- **Webhooks.** GitHub `push` and `pull_request` (opened, synchronize, reopened), and GitLab `push` and `merge_request`, posted straight to CodeIndex at `/v1/webhooks/github` and `/v1/webhooks/gitlab`. GitHub deliveries are checked with `X-Hub-Signature-256`, GitLab ones with `X-Gitlab-Token`. A push with several commits is processed oldest first.
- **Linking a repository.** It syncs members, then indexes the tip of the default branch, then the tips of the other branches.
- **Index now.** An organisation admin can start a run from CodeIndex's own site, or with `POST /v1/admin/repositories/{repository_id}/index`.

Each repository has three switches: indexing, pull-request comments, and which categories of comment to post.

Indexing uses the **`codeindex` pool** of inference nodes. CodeIndex reads its own node list, in the same JSON format igni server uses, from `INFERENCE_BACKENDS_PATH` or `INFERENCE_BACKENDS`, and re-reads it every 30 seconds. igni server does not pass its list on. See [Connecting your GPUs](/docs/inference-backends) for the format.

## Deploying it

One image, built from the `igni__code-index` repository with `containers/be/Dockerfile`. The build also builds the extension bundle. The same image runs three things:

```bash
# API, on port 8081
uvicorn app.main:app --host 0.0.0.0 --port 8081

# workers
python -m app.workers.supervisor

# migrations
alembic upgrade head && python -m app.db.sql.tenant_migrations
```

It runs as user `igni` (uid 10001). `GET /health` and `GET /version` answer without a session. There is no `/ready`.

What it needs:

- **PostgreSQL.** The role needs `CREATEDB`, because each organisation gets its own database, `<POSTGRES_DB>_t<n>`.
- **Redis**, with at least `16 + 3 × organisations` logical databases. `databases 64` holds 16 organisations.
- **An object store or a volume** for changesets: GCS, S3 (or MinIO), or a filesystem path.
- **Inference nodes** in the `codeindex` pool.
- **igni server**, and a hostname of its own.

Neo4j is not a server dependency.

The settings that matter:

| Setting | Default | Notes |
|---|---|---|
| `IGNI_SERVER_URL` | — | igni server's `PUBLIC_BASE_URL`. `IGNI_SERVER_BASE_URL` also works. |
| `PUBLIC_BASE_URL` | `''` | This service's own URL, on a hostname of its own. |
| `SERVICE_NAME` | `CodeIndex` | Its name on the portal's **Services** page. |
| `IGNI_KEY_ENCRYPTION_KEY` | — | A Fernet key. It seals the service's own signing key and derives its other keys. |
| `IGNI_LICENCE_FILE` | `/etc/igni/licence/licence.json` | See [Licensing and evaluations](/docs/licensing-and-evaluations). |
| `CHANGESET_STORAGE_BACKEND` | `filesystem` | `gcs`, `s3` or `filesystem`. |
| `CHANGESET_STORAGE_PREFIX` | `changesets` | |
| `CHANGESET_GCS_BUCKET` | `''` | |
| `CHANGESET_S3_BUCKET` / `CHANGESET_S3_REGION` / `CHANGESET_S3_ENDPOINT_URL` | `''` | The endpoint is for MinIO and other S3-compatible stores. |
| `CHANGESET_FILESYSTEM_ROOT` | `''` | For example `/var/lib/igni/changesets`. |
| `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_DB` | `postgres` / `5432` / `igni_codeindex` | Plus `POSTGRES_USER` and `POSTGRES_PASSWORD`. |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_DB` | `redis` / `6379` / `11` | |
| `INFERENCE_BACKENDS_PATH` / `INFERENCE_BACKENDS` | `''` | The node list, as a file or inline. |
| `WORKER_CONCURRENCY` | `200` | |
| `AI__UPSTREAM_TIMEOUT` | `300` | Seconds to wait for a model. |
| `AI__MAX_DEGRADED_RATIO` | `0.5` | A run stops when half its summaries are placeholders. |
| `APP_ENV` | `prod` | `dev` serves `/docs`. |

Nothing is configured on igni server for CodeIndex. On first start the service makes its own key, registers with igni server, uploads its extension and logs its key's thumbprint. A super admin compares the thumbprint on the portal's **Services** page and approves it. Connecting GitHub (as a GitHub App) or GitLab (with OAuth) is done afterwards on CodeIndex's own site, under **Settings**.

> **Note:** There is no Helm chart for CodeIndex yet. igni server's chart has no `codeindex` values; run the image with your own manifests, and give it its own Ingress and certificate.

## The API

All under `/v1`. The extension uses the first group; you will mostly use CodeIndex's own site for the rest.

| Route | Who | What |
|---|---|---|
| `POST /v1/codeindex/repository` | any member | Find the repository for a git remote |
| `POST /v1/codeindex/preflight` | any member | Is there a changeset for this commit? `ok`, `in_progress`, `failed`, `changeset_not_found`, `repo_not_found`, `link_required` or `no_matching_account` |
| `POST /v1/codeindex/changeset-url` | any member | A download link for a changeset |
| `GET /v1/admin/repositories/{id}/status` | org admin | Indexing state |
| `POST /v1/admin/repositories/{id}/index` | org admin | Start a run (202) |
| `GET /v1/licence` | anyone | The licence state and seat count |

Every route except repository discovery is checked against the git provider: a person sees a repository only if their linked account can.

## When the licence lapses

CodeIndex checks the licence file itself, offline, and re-reads it every 60 seconds, so a renewed file takes effect without a restart. The states are described in [Licensing and evaluations](/docs/licensing-and-evaluations). For CodeIndex they mean:

- **Grace** (90 days after expiry): everything works. Responses carry `igni-licence: grace; days-left=N`.
- **Read-only**: reads still work. That includes changeset downloads, so every machine can still build and query its index. New work is refused: index runs, pull-request reviews, linking accounts and repositories, and settings changes. Webhooks are accepted and answered `{"accepted": false, "reason": "not_licensed"}`, and queued events are marked ignored.
- **Unlicensed**: only health, sign-in, igni's erasure and export calls, and disconnecting things still work.

A refused request gets **403** with a JSON body naming the module, the state and the reason, and the header `igni-licence: <state>`. Seats are counted but not enforced.

## Known gaps

- When `HEAD` moves to a child commit, the local index for that commit starts empty and an incremental changeset fills in only what the commit touched. Carrying the rest of the graph over is not done yet.
- The local Neo4j runtime has not been run on Windows yet.
- The `/codeindex` page does not yet have sync, resync and clean controls.

## Where to go next

- **[Building extensions](/docs/building-extensions)** — the extension CodeIndex ships is built on the same SDK.
- **[Agents and orchestration](/docs/agents-and-orchestration)** — how work reaches `data-architect`.
- **[Licensing and evaluations](/docs/licensing-and-evaluations)** — installing the licence file CodeIndex checks.
