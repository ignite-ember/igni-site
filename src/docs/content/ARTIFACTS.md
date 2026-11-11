**Artifacts** are the documents the agent writes — a design note, an understanding of a subsystem, a decision record — with their versions, comments, drafts and a record of what each version was built on. They are a paid module: a service you deploy beside igni server, and an igni extension the service ships to people's machines. This page is about what your team gets from it: how documents are written and shared, who may open one, and what versions, comments and lineage do once more than one person is involved. Deploying the service is [Running the documents service](/docs/running-the-documents-service).

## Where documents live

**Every document lives in the documents service, and only there.** The extension on a person's machine holds no store, no graph and no copy. It reaches the service over HTTP as the signed-in person, with a ten-minute token the igni app gets for it. A document is a row in the service from the moment it is written.

**A folder's documents belong to a project.** A project is something people create, by name, unique in the organisation. Each folder on a person's machine is bound to one project, and a project can have many folders. A fresh clone whose git remote is bound to exactly one project joins it with no question. Otherwise the first document action asks: join an existing project, or create one with a name you type. Nothing is created silently. `/artifacts project use <name>` switches a folder's project.

## What the agent does with them

The extension installs the **archivist**, an agent of its own, and gives its tools to that agent only. It has 19, including `artifact_search`, `artifact_read`, `artifact_create`, `artifact_revise`, `artifact_lineage`, `artifact_cypher`, `artifact_edit_draft` and `artifact_publish_draft`. It is told to publish a draft only when someone asked it to: writing the draft and publishing it are two acts on purpose, and the second is a decision about what everybody reads.

The extension also replaces four sections of igni's main prompt — what the main agent is told about project knowledge, durable knowledge, reading, and the project's documents — so the main agent knows to hand that work to the archivist.

**The archivist's Cypher runs in the service, not on your machine.** `artifact_cypher` and `artifact_ask` send a query to `POST /v1/artifacts/cypher`. The service runs it in a read-only session and rewrites it first so that every node it can touch is a document the caller may open, in the folder's project. A lineage path through a document you cannot open stops there. Procedure calls, several statements and writes are refused. A query runs for at most 10 seconds and returns at most 200 rows.

**Switching it off.** Artifacts reaches a group only when an org admin switches its extension on for that group. Switched off, the archivist and its tools are gone, and igni's own prompt tells the agent there is nowhere to file project knowledge this session: it says so plainly rather than promising to record something, and it will not file a codebase convention into your personal memory instead. See [Administering your organisation](/docs/administering-your-organisation).

## Sharing a document

A document starts `private`. Sharing it means choosing who may open it, from the Artifacts page in the igni app, which calls the service:

```jsonc
// POST {service URL}/v1/artifacts/shared
{
  "project_id": "…",          // the folder's project; required
  "artifact_id": "…",
  "title": "Auth design",
  "kind": "note",
  "version": 7,
  "html": "<!doctype html>…",  // the rendered page, at most 4 MB
  "visibility": "users",
  "audience": ["sam@acme.test"]
}
```

The service URL is the documents service's own, on a hostname of its own such as `https://artifacts.example.com` — never a path on igni server. The schema sets `extra='forbid'`, so a client that sends an unknown field gets a 422 instead of having it quietly stored.

**The page is a projection, not a dump.** The extension renders the chosen version — the same code path as a local HTML, Markdown or PDF export, so a shared page never holds more than a file you exported yourself. Sharing several documents together keeps the confirmed links between them; a link to a document that was not shared is dropped, not rendered, because a dangling reference leaks the name of private work.

**Re-sharing keeps the link.** The row is upserted per owner and document, so the document keeps the same slug and URL.

The response is the URL, the slug and the version:

```json
{ "url": "https://igni.acme.example/?open=igni.artifacts&slug=9f4c1ad73e2b8056c1d4ef", "slug": "9f4c1ad73e2b8056c1d4ef", "version": 7 }
```

A **public** document's link is the service's own reader, `https://artifacts.example.com/d/<slug>`, which needs no igni account. Every other link opens the document in the igni app, at the address set as the service's `APP_BASE_URL`; without it, the link falls back to the reader. The slug is 22 random hex characters (about 88 bits), never derived from the title — a guessable slug would be an access-control decision made by whoever picked the title.

## What a recipient gets

`GET /v1/artifacts/shared/{slug}` returns the stored page as `text/html`, with `nosniff`, `Cache-Control: no-store` on every response, and a Content-Security-Policy of `default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'`. The page is self-contained by construction; the header means one that somehow is not fails closed in the browser instead of quietly fetching.

If they may not read it, they get **404 — the same answer as a slug that was never issued**. That is the rule across the whole surface, including grants and transfers: nothing confirms that a private document exists to somebody who cannot open it.

One narrow exception exists for the case of holding a link that does not work. `GET /v1/artifacts/shared/{slug}/access` requires a session and, for a slug that is real, returns the title and the owner's name and address — enough to know what you were pointed at and whom to ask. A slug that does not exist still 404s. `POST` to the same path raises an access request; the owner reads the queue at `GET /v1/artifacts/shared/{slug}/access-requests` and settles one at `POST /v1/artifacts/shared/{slug}/access-requests/{request_id}`. Granting adds the identity to the audience before the request is marked settled.

## Who may read it

Visibility is one of four values, fixed server-side. There is no `org` visibility. When it existed, every account had a personal organisation of its own, so for most people that scope was a set containing only themselves.

| Visibility | Who may open it | Needs a session |
|---|---|---|
| `private` (default) | the owner, plus anyone named in `audience` | yes |
| `users` | the owner and the named `audience` — a non-empty audience is required, else 400 | yes |
| `domain` | anyone whose account email shares the author's domain | yes |
| `public` | anyone with the link | no |

Three things about this are easy to get wrong:

- **The audience is consulted under every visibility**, not just `users`. Adding a name to a domain-visible document does let that person in. Entries match on account email *or* user id, case-folded.
- **The domain is the server's, not the client's.** It is derived from the account at publish time and stored on the row. A client cannot name its own domain (it could otherwise publish into someone else's), and an author who later changes employer does not silently re-target a document at the new one. Publishing `domain` from an account with no readable address is a 400.
- **An unrecognised visibility denies.** A value this server does not understand never widens access.

`domain` is trustworthy exactly as far as the address on an account is. If your deployment sets `oidc_link_by_email`, it has decided its IdP is authoritative for identity, and `domain` inherits that decision.

Anonymous readers of a public document get the head version only, with author addresses withheld. The chain is how the document got there; that is for the people working on it.

## Writing, comments, versions

Reading and writing are authorised separately. Write is **always an explicit grant**: a `writers` list, set by the owner at `PUT /v1/artifacts/shared/{slug}/writers`, replacing the list wholesale so revoking is the same call as granting. Visibility grants nothing here — a public document is not world-writable, and a link forwarded around a company does not make it company-writable.

Anyone who may open a document may comment on it. A comment is anchored to a specific version and carries the quoted text, because character offsets into a document that has since moved point at the wrong words. Bodies are capped at 20,000 characters. Statuses are `open`, `accepted`, `rejected` and `resolved`; accepting records which version applied it in `resolved_in_n`, and a rejected comment is kept rather than deleted — it is the record of a decision. Only a writer may attach `suggested_text` (replacement wording); a reader who sends it gets a 403 rather than having it silently dropped.

Editing does not write a version. It writes **the draft** — one per document, readable by anyone who may read the document, writable by anyone who may append — and publishing it is a separate, deliberate act. That is why writing the draft and publishing it are two separate calls — `PUT /v1/artifacts/shared/{slug}/draft` and `POST /v1/artifacts/shared/{slug}/draft/publish`: the second is a decision about what everybody reads.

When a draft becomes a version, the server is the **ordering authority** and nothing more. It assigns `n`; the chain stays linear and append-only. An append must state the version it was written from, and `base_n` has no default — a default would mean a client that lost track silently appending over whoever got there first. If the base has moved, the answer is 409 carrying the versions you are missing, so a rebase takes one round trip rather than three:

```json
{ "head_n": 9, "missing": [ { "n": 8, "base_n": 7, "content": "…" }, { "n": 9, "base_n": 8, "content": "…" } ] }
```

Nothing is merged on your behalf. Version content is capped at 512 KB; the rendered page at 4 MB.

```igni-diagram
versioning
```

## Lineage, and what has gone stale

An edge records that this document was built on **a specific version** of another — the pin is the whole feature. "Built on the auth design" is not actionable; "built on v3 of the auth design, which is now at v7" is.

```igni-diagram
lineage
```

Edges are `candidate`, `confirmed` or `dismissed`. Candidates come from reads the agent made: every search records the exact versions it returned, and the next write attaches whatever it did not explicitly cite — which is what keeps lineage cheap to maintain. Capture is always on. A person confirms or dismisses a candidate, and a dismissal is kept so the same candidate is not re-proposed for ever. The **dependent's** writers decide an edge, not the source's author — it is a claim about what this document stands on.

`GET /v1/artifacts/shared/{slug}/lineage` returns both directions plus external citations. Dependents are not scoped to the version you asked about: the question before changing a document is "who do I break", and most dependents are pinned to an earlier version. Edges whose far end you cannot open are removed and counted in `hidden`, so the answer reads "built on 3 documents, 1 you cannot see" rather than quietly being shorter.

A **confirmed** edge goes stale when the source's head moves past the pin; candidates and dismissals never do. `GET /v1/artifacts/stale` is your own queue, furthest behind first, scoped to documents you own. **Re-pinning is the only thing that clears it, and it is never automatic** — moving a pin forward because somebody edited the source would assert that a person had read the change when nobody had.

Where a write cited passages, the quote is stored beside the chunk id, so the citation stays checkable after the source has been rewritten. `cited_passages: 0` on an edge means nobody evidenced it.

## This needs the documents service

Everything above is served by a second deployment — the documents service of the Artifacts module, deployed from that module's own repository — and not by igni server, on a hostname of its own. igni server's Helm chart has nothing for it: no `artifacts` values, no second Ingress and no ConfigMap. It defaults to port 8100, mounts its API under `/v1`, and serves `/health`, `/ready` and `/version` outside it. Each organisation's documents are in a database of their own, beside the service's shared one, and each organisation's drafts and presence in a Redis database of their own. It refuses to start without igni server's URL, its own public URL, `IGNI_KEY_ENCRYPTION_KEY` and `POSTGRES_URL`.

It has no `users` table. It **checks** user tokens and never issues them: igni server signs them with a key only it holds, and the documents service checks them against the public half igni server publishes, and that each names the documents service's own URL as its audience. Names and addresses it asks of igni server's directory. Nothing secret is shared between the two in either direction — the documents service signs its own requests with a key it generated and registered.

It is deployed with two addresses, igni server's and its own, and nothing is configured on igni server for it: the server knows it only as a registered service. It registers itself on first start and serves nobody until a super admin approves it on the portal's *Services* page; see [running the documents service](/docs/running-the-documents-service).

igni server does not proxy document traffic. The documents service ships its igni extension through igni server, which hands it to the machines of every group an org admin switched it on for; on a person's machine, the igni app gets the extension a ten-minute token for the documents service, and the extension calls the service directly. What crosses between the two services is the directory, notifications for people's feeds, and igni server's erasure and subject-access requests. A deployment that has approved no documents service simply has no documents, which is a supported configuration rather than a broken one.

Two optional dependencies degrade rather than break it. An organisation's graph — each organisation has its own Neo4j, which a super admin enters on the documents service's own site (`/settings` on its hostname, signed in through igni), not in this portal — and `embedder_url` enable passage search; with either unset, documents still publish, open and sync, and the search endpoint answers `available: false` so a client can say "search is not set up here" instead of "nothing found". When search is on, it works out which documents you may open *before* ranking anything — a vector index cannot answer an access question, so it is never asked to.

One last operational note: a document records the organisation it was created in, so it can outlive its author. `POST /v1/artifacts/shared/{slug}/owner` hands it to someone else — the current owner may, or an admin of the document's organisation — and the recipient must already be in that organisation. Organisation membership by itself grants no read access; that is still `visibility`, `audience`, `writers` and `domain`.

## Licence

Artifacts checks the paid modules' licence file itself, offline (`IGNI_LICENCE_FILE`, default `/etc/igni/licence/licence.json`). The states are in [Licensing and evaluations](/docs/licensing-and-evaluations). For Artifacts:

| Always | Read — still allowed when read-only | Write — refused when read-only |
|---|---|---|
| `/health`, `/ready`, `/version`, `GET /v1/licence`, igni's erasure and export calls, signing in and out of the service's own site, removing an organisation's graph | Every `GET`: documents, versions, comments, lineage, passages, search, projects, the public reader, the comment stream — everything an export reads; the archivist's read-only Cypher; finding a folder's project; pointing an organisation at its graph | Sharing and deleting documents, new versions, drafts, comments and replies, access, audience and owner changes, folders, projects, lineage decisions; the document room's WebSocket, which carries live edits |

A refused request gets `403` with a JSON body naming the module, state and reason, and the header `igni-licence: <state>`. A refused WebSocket is closed with code `4403`. Only people who change something count towards the licence's band; readers are free.

## Where to go next

- **[Running the documents service](/docs/running-the-documents-service)** — deploying the service that serves them.
- **[Administering your organisation](/docs/administering-your-organisation)** — switching the extension on for a group.
- **[Licensing and evaluations](/docs/licensing-and-evaluations)** — the licence file the module checks.
