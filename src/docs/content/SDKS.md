igni is built to be reached from your own code. There are two different jobs people mean by "the SDK", and they use different surfaces. If you want to **send prompts to the models** igni serves, you point a standard OpenAI client at the server's OpenAI-compatible API — no igni-specific library needed. If you want to **build on igni itself** — a backend service that talks to people's agents, an extension that adds tools and pages, a page that runs inside the app — you use the igni SDKs: three Python packages and three npm packages. This page covers all of them: where they live, how you authenticate, every public surface, and a worked example of each, for the engineer integrating from outside.

For the lifecycle around an extension — the manifest, how a service is approved, how an extension is distributed to machines — read [Building extensions](/docs/building-extensions). This page is the API reference the SDKs expose.

## Which SDK for what

| You want to… | Use | Language |
|---|---|---|
| Send chat completions to igni's models from any program | The **OpenAI-compatible API** (any OpenAI client) | Any |
| Drive an igni from your own program: sessions, prompts, approvals, every method igni has | `igni-client` | Python |
| Run a backend service that reaches people's agents, mints their tokens, answers erasure/export | `igni-service` | Python |
| Write the extension process igni starts on each machine: tools, hooks, the host API | `igni-extension` | Python |
| Build a page shown inside the igni app | `@ignite-ember/extension-bridge` | TypeScript |
| Use igni's components and styles on that page | `@ignite-ember/ui-react`, `@ignite-ember/ui-css` | TypeScript |
| Drive igni from a terminal or a CI job | The **CLI** (`igni`) | — |

Most real extensions use several at once: a `igni-service` backend that ships an `igni-extension` process, whose pages are built with the three npm packages. The OpenAI-compatible API is independent of all of it — it is just the server, reachable with tools you already have.

## Where the packages live and how they version

The Python packages are on PyPI and require **Python 3.12**. The page packages are on npm.

```bash
uv add igni-client             # or: pip install igni-client
uv add igni-service            # or: pip install igni-service
uv add igni-extension          # or: pip install igni-extension
npm install @ignite-ember/extension-bridge @ignite-ember/ui-react @ignite-ember/ui-css
```

The Python SDKs are versioned together with the rest of igni and are Apache-2.0. The extension host object model carries its own schema version (currently **1.11**), which is what a page's `bridge.host` and the process's `ext.host` are generated from; the manifest's `contract` range (today `1.0`) is the compatibility promise an extension declares against.

Every SDK release is also tagged `sdk-v<version>` on [github.com/ignite-ember/igni](https://github.com/ignite-ember/igni/releases). That release carries every wheel and every npm tarball with their SHA-256 digests, so a build machine with no route to PyPI or npm can install from it — see [Installing without internet access](#installing-without-internet-access).

> **Note:** The SDKs are at an early version and marked alpha. A handful of methods are already deprecated in favour of clearer names, and a few capabilities are declared but not yet wired up; both are called out in the relevant section below and in Errors and limits.

## Calling igni's models: the OpenAI-compatible API

The igni server exposes an **OpenAI-compatible REST API**. You do not install an igni library for this — you point the official `openai` client (or `curl`, or any OpenAI-compatible tool) at your server. Completions are proxied through the server's own key pool to the GPUs you run, so your code never holds an upstream provider URL or key. How the server routes that work is in [Connecting your GPUs](/docs/inference-backends).

The base URL is your server's public URL with `/v1` appended: `https://igni.example.com/v1`.

### Chat completions

`POST /v1/chat/completions` — the OpenAI chat-completions contract.

```bash
curl https://igni.example.com/v1/chat/completions \
  -H "Authorization: Bearer $IGNI_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
        "model": "your-model-id",
        "messages": [{"role": "user", "content": "Summarise this changelog."}]
      }'
```

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://igni.example.com/v1",
    api_key="<IGNI_BEARER_TOKEN>",             # sent as Authorization: Bearer ...
    default_headers={"x-org-id": "<ORG_ID>"},  # org context + active-membership check
)

resp = client.chat.completions.create(
    model="your-model-id",                     # optional — omit to use the group/node default
    messages=[{"role": "user", "content": "hello"}],
)
print(resp.choices[0].message.content)
```

The request body is the usual shape. Only `messages` is required. Recognised fields: `model`, `messages`, `temperature`, `top_p`, `n`, `stream`, `stop`, `max_tokens`, `presence_penalty`, `frequency_penalty`, `user`, `tools`, `tool_choice`, `response_format`. Any other OpenAI field you send is forwarded upstream unchanged. The non-streaming response is a standard `chat.completion` with `choices` and a `usage` object (`prompt_tokens`, `completion_tokens`, `total_tokens`).

### Streaming

Set `"stream": true`. The server returns Server-Sent Events — `data: {…}\n\n` frames ending with `data: [DONE]` — and injects `stream_options.include_usage` so a final chunk carries the `usage` object.

```python
stream = client.chat.completions.create(
    model="your-model-id",
    messages=[{"role": "user", "content": "hello"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

If an upstream node fails *after* the stream has begun, the reason arrives as an SSE `data:` frame carrying the same error envelope as the HTTP path (below), rather than a broken connection. On an internal retry to another node you may see a `: retry` SSE comment frame, which clients ignore.

### Listing models

```bash
curl https://igni.example.com/v1/chat/models \
  -H "Authorization: Bearer $IGNI_TOKEN" -H "x-org-id: $ORG_ID"
# -> {"models":[{"id":"..."}]}
```

> **Important:** Model discovery differs from vanilla OpenAI. igni serves `GET /v1/chat/models` returning `{"models":[{"id":…}]}`, and there is no `/v1/models`. So the OpenAI client's `client.models.list()` will not work — fetch `/v1/chat/models` directly. The response is IDs only; it never reveals a node's address.

### How it differs from vanilla OpenAI

| Behaviour | igni |
|---|---|
| Model discovery | `GET /v1/chat/models`, envelope `{"models":[{id}]}` — not `/v1/models`; `models.list()` unsupported |
| `model` field | Optional. Omitted for a person, the server uses the group's pinned model; otherwise the node's default |
| Caps | `n` ≤ 16, `max_tokens` ≤ 1,000,000, `messages` ≤ 10,000 |
| `usage` | Flat classic shape (`prompt_tokens` / `completion_tokens` / `total_tokens`) — no token-detail breakdowns |
| Errors | OpenAI-shaped `{"error":{…}}`, but `error.code`/`error.param` are always `null`, and a non-standard `detail` key sits alongside |
| Validation errors | A malformed field returns FastAPI's native `{"detail":[…]}` (HTTP 422), not the OpenAI envelope |
| `x-org-id` | Selects the organisation and enforces active membership — no OpenAI analogue |
| Saturation | A request with no free backend is **refused, not queued**: `429` with `Retry-After: 30`. A deploy with no backend configured is `503` (not retryable) |

### Error envelopes

Errors on the chat routes are OpenAI-shaped:

```json
{"error": {"message": "…", "type": "rate_limit_error", "code": null, "param": null}}
```

| Status | `type` | When |
|---|---|---|
| 400 / 404 / 409 / 413 | `invalid_request_error` | Bad request, unknown model, etc. |
| 401 | `authentication_error` | Missing or invalid bearer token |
| 403 | `permission_error` | Token valid but not an active member of the org |
| 429 | `rate_limit_error` | No backend free — honour `Retry-After` |
| ≥ 500 | `server_error` | 502 no node answered, 503 none configured, 504 stream stalled |

## Authentication and identity

Every call carries a **bearer token** in `Authorization: Bearer <token>`, and (for the chat API and most service calls) an **`x-org-id`** header naming the organisation. The header selects which org the token acts in and is checked against live membership on every call — remove someone and their next call is `403` immediately. If you omit `x-org-id`, the server falls back to the token's own `org` claim.

Tokens are RS256 JWTs issued by your server, whose issuer and audience are the server's public URL. There are three kinds of caller:

| Caller | Token | Obtained by |
|---|---|---|
| **A person** | A 30-day session token | Signing in through the app or CLI (browser flow). The CLI writes it to `~/.igni/credentials.json` |
| **A service** | A 10-minute token for itself | `client_credentials` at the token endpoint, with a signed client assertion (`private_key_jwt`) |
| **A person, as seen by a service** | A 10-minute token minted for that person | Handled for you by `igni-service` (see below) |

> **Note:** There is no headless person sign-in. To call the API as a person from CI, sign in once on a machine with a browser and copy `~/.igni/credentials.json` across; the token lasts 30 days. Server-to-server integrations should register a service and use `client_credentials` instead.

### Discovery and the token endpoint

The server publishes standard OIDC discovery at the root of its public URL:

- `GET /.well-known/openid-configuration` — issuer, `jwks_uri`, `token_endpoint`, grant types, and so on.
- `GET /.well-known/jwks.json` — the public signing keys, for verifying a token yourself.

A service obtains its own token at `POST /v1/oauth/token` (form-encoded):

```bash
curl https://igni.example.com/v1/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "organisation=$ORG_ID" \
  -d "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer" \
  -d "client_assertion=$SIGNED_CLIENT_JWT"
# -> {"access_token":"…","token_type":"Bearer","expires_in":600, …}
```

Supported grants are `client_credentials` (a service as itself), `authorization_code` with PKCE (a person via a service's portal), `refresh_token`, and RFC 8693 token exchange (the CLI trading a session for an audience-scoped token). In practice you do not hand-roll any of this for an extension — `igni-service` registers the key, signs the assertion, and mints people's tokens for you.

## The client SDK: igni-client (Python)

`igni-client` drives an igni from your own program — a script, a backend, a CI job, a bot. It speaks the protocol igni's own app speaks, so anything the app can do, your program can.

### Where the igni is

A **target** says where the igni is and how to reach it.

| Target | What it reaches |
|---|---|
| `Fleet(url, auth=…)` | A producer's igni in Fleet, through Fleet's gateway: it authenticates you, wakes the VM if it is asleep, and relays igni's socket |
| `Local(project_dir)` | The igni the desktop app runs for that project on this machine, found from the lockfile it writes there |
| `Local(url=…, token=…)` | An igni you name directly — one started by hand with `--ws-port` |

```python
from igni_client import Fleet, Local, Person

fleet = Fleet("https://gw.acme.internal", auth=Person.from_cli())
here = Local(project_dir="~/code/payments")
by_hand = Local(url="ws://127.0.0.1:8765")
```

### Who you connect as

- **A person** gives a program an **API key**, made on igni's portal. The client exchanges it for a session as them, renewed as needed; the key stops working when it is revoked or expires.
- **An app** signs in as itself with its own key: `App.generate_key("app-key.pem")`, then `App("app-review-bot", server="https://igni.acme.internal", key_file="app-key.pem")`. Its tokens last ten minutes and are renewed for you.
- **A space** is one end user of an app, with an igni of its own: `await app.spaces.declare("customer-42")`.

### Running the agent

```python
from igni_client import Fleet, IgniClient, Person

key = Person.from_api_key("igpak1.…", server="https://igni.acme.internal")
async with IgniClient(Fleet("https://gw.acme.internal", auth=key)) as igni:
    session = await igni.sessions.create(project_dir="/workspace/payments")
    reply = await session.ask("Summarise the open pull requests", approve=False)
    print(reply)
```

`session.ask(…)` waits for the whole answer. `session.send(…)` yields it as it happens — the answer a few tokens at a time, each tool call and its result, the end — as typed models generated from igni's own contract:

```python
from igni_client import ContentDelta, ToolStarted

async for event in session.send("What does the payments service do?"):
    match event:
        case ContentDelta(text=text, is_thinking=False):
            print(text, end="", flush=True)
        case ToolStarted(friendly_name=name):
            print(f"\n[{name}]", end=" ")
```

### Approvals

When the agent wants to run a tool that needs a yes, the run pauses and the loop yields an `ApprovalRequested`; answer it in the loop and the same loop carries on with the resumed run. A program that only answers approvals connects with an approver token instead of a session — `minted = await igni.approvers.mint_token()`.

### Everything else igni has

Every one of igni's methods is a typed Python method, generated from igni's RPC contract: `session.plan`, `session.history`, `session.context`, `session.loop`, `session.models`, `session.mcp`, `session.plugins`, `session.scheduler`, `session.workflows`, `session.notifications`, `igni.files`, `igni.extensions`, `igni.processes`, `igni.window`, and the rest. A call that streams returns a `Call[R, E]` — its result and its events — and follows only its own.

Every page of it is on the site: [igni-client's documentation](/docs/sdk/igni-client).

## The service SDK: igni-service (Python)

`igni-service` is what a backend of yours needs to be part of an igni deployment: its own signing key, registration with igni server, minting and validating the tokens people's apps bring, the directory, notifications, erasure and export, uploading its extension bundle, and reaching people's agents. It is built on FastAPI, httpx, pydantic and PyJWT.

### Setting it up

```python
from fastapi import FastAPI
from igni_service import IgniService, IgniSettings

igni = IgniService.from_settings(IgniSettings())
app = FastAPI(lifespan=igni.lifespan)
igni.install(app)
```

`IgniSettings` reads the environment (every field can also be passed directly). The three that must be set, or construction raises `ConfigurationError`:

| Setting | Env | What |
|---|---|---|
| `igni_server_url` | `IGNI_SERVER_URL` | Where the service reaches igni server |
| `public_base_url` | `PUBLIC_BASE_URL` | The service's own URL — the audience of tokens people bring |
| `service_name` | `SERVICE_NAME` | The service's name |

Others cover where the key is sealed and stored (`IGNI_KEY_ENCRYPTION_KEY`, `IGNI_KEY_DATABASE_URL`), the extension bundle to upload (`IGNI_EXTENSION_BUNDLE`), the server timeout, and revocation-list staleness. `from_settings` keeps the service's key and people's sessions in `IGNI_KEY_DATABASE_URL`; construct `IgniService(...)` directly to supply your own `key_store` and `web_store`.

`igni.lifespan` registers the service with igni server, uploads its extension bundle, and keeps the revocation list fresh for as long as the app runs — from the first request, every token is checked against it, failing closed. `igni.install(app)` adds igni's own routes (erasure and export of a person, and a deleted organisation), the service's sign-in pages, and the `BearerCors` middleware a page needs.

### Validating the tokens people bring

Your routes take a person as a FastAPI dependency. The SDK validates the bearer token against igni's keys and the revocation list for you:

```python
from igni_service import Person

@app.get("/documents/{slug}/summary")
async def summary(slug: str, person: Person = Depends(igni.person)):
    # person.user_id, person.org_id, person.email, person.is_org_admin …
    ...
```

| Dependency | Gives you |
|---|---|
| `igni.person` | The `Person` the token names; `401` if missing or refused, `503` if igni's keys can't be had |
| `igni.optional_person` | The person, or `None` when no token was sent |
| `igni.caller` | A `Person`, `App` or `Space` — whichever kinds the service accepts (people only, by default) |
| `igni.org_admin` | The person, only if they are an admin of their org; `403` otherwise |
| `igni.token` / `igni.optional_token` | The raw bearer string, not yet checked |

By default a service accepts only people; pass `accepted_callers` to also accept an app's or a space's token. Outside an HTTP request, `await igni.person_of(token)` and `await igni.caller_of(token)` do the same checks. `await igni.thumbprint()` returns the RFC 7638 thumbprint a super admin compares when approving the service.

### Reaching a person's agent

A service reaches a producer's agent — a person's or an app's — through `igni.host(org_id)`:

```python
from igni_service import Attachment, Producer

host = igni.host(org_id)
agent = host.agent(Producer.person("u-marieke"))

# A message igni posts into a chat, verbatim, labelled as your extension's:
await agent.send_message(
    "Claim CL-20431 arrived; assess the damage.",
    attachments=[Attachment.from_path("damage.jpg")],
    thread="claim:CL-20431",
    event_key="claim:CL-20431:new",       # a retry is stored once, not twice
)

# Or open a chat and talk into it:
chat = await agent.new_chat("Claim CL-20431", thread="claim:CL-20431")
await chat.send_message("The adjuster replied: see the report.")

# An event igni hands to the extension's process (it posts nothing itself):
accepted = await agent.send_event("index.ready", {"repo": "acme/api"})
state = (await agent.status(accepted.event_id)).state   # pending / delivered / not_handled / …
```

A **message** starts a run (or waits for the one going) and needs the `service.messages` grant (`service.attachments`, `service.chats` for the rest). An **event** needs no grant and lets the extension decide what to do. A `thread` is your own key for a conversation; the first item opens a chat for it. Attachments are at most 5 MiB each, ten per message. Sending is at-least-once, de-duplicated by `event_id`, and items wait up to 14 days. A refused send raises `EventRefused`; `host.notify(...)` tells people something happened and raises `NotificationRefused` if igni declines.

### The directory, erasure and export

```python
members = await host.directory.members(query="mar")   # prefix search, former members optional
who = await host.directory.resolve(["marieke@acme.com"])

@igni.on_erase
async def erase(subject):                       # DELETE /v1/igni/subjects/{user_id}
    await my_store.delete_for(subject.user_id, subject.org_id)

@igni.on_export
async def export(subject):                       # GET  /v1/igni/subjects/{user_id}/export
    return [ExportSection(name="notes", rows=[...])]

@igni.on_organisation_deleted
async def gone(org_id: str):                      # stop routing to a deleted org (idempotent)
    await my_store.forget_org(org_id)
```

If you register no erasure or export handler, igni's call returns `501` and the deployment reports the subject-access request as unconfirmed.

### Errors

Everything the SDK raises on purpose descends from `IgniError`: `IgniUnavailable` (and its `ServiceNotApproved` / `ServiceRevoked`), `EventRefused`, `NotificationRefused`, `VmProfileRefused`, `KeyStoreError`, `BundleError`, `ConfigurationError`, and `TokenRefused`. `igni-service` also installs the `igni-service-bundle` console script for building the extension bundle a service ships — covered in [Building extensions](/docs/building-extensions).

## The extension SDK: igni-extension (Python)

`igni-extension` is the process igni starts on each machine. It serves tools to the agent over MCP, reaches its own service as the signed-in person, reaches the igni app through the host object model, and answers hooks and the events its service sends.

### A tool

```python
from igni_extension import IgniExtension, NotSignedIn, ToolHints

ext = IgniExtension("acme.example")
READS = ToolHints(read_only=True, destructive=False, idempotent=True, open_world=False)

@ext.tool(hints=READS)
async def summarise(slug: str) -> str:
    """Summarise one of the organisation's documents."""
    try:
        response = await ext.service.get(f"/documents/{slug}/summary")
    except NotSignedIn:
        return "Sign in to igni to read documents."
    response.raise_for_status()
    return response.json()["summary"]

def main() -> None:        # the console script the manifest's python.entry names
    ext.run()
```

Every tool must state all four `ToolHints` — `read_only`, `destructive`, `idempotent`, `open_world` — which are what igni's [permission modes](/docs/permissions-and-safety) read; `ext.run()` refuses to start a tool that leaves one unstated. A plain `def` tool runs in a worker thread. A parameter typed `Caller` receives whom the call is for and is not part of the tool's input.

`ext.service` is an `httpx.AsyncClient` subclass pointed at your service, carrying a ten-minute token for the signed-in person that the igni app fetches — the extension holds no address and no secret. `ext.service.anonymous` drops the token, `ext.service.for_(caller)` acts as another caller, and `ext.service.websocket(path)` opens an authenticated WebSocket. When nobody is signed in, a call raises `NotSignedIn`; when igni didn't start the process with what a call needs, `NotConfigured`.

### The host object model

`ext.host` is the igni app as an object model (the same shape a page reaches as `bridge.host`). Each namespace needs the matching grant in `permissions.host`; a call without it raises `HostError` with `code == "not_granted"`.

```python
busy = await ext.host.chat.processing          # await a property to read it
await ext.host.sessions.current.set(session_id)  # .set(...) to write
created = await ext.host.sessions.create(title="Index: acme/api")
await ext.host.sessions.chat(created.session_id).post("The index is ready.")
```

Namespaces include `app`, `windows`, `ui`, `sessions`, `chat`, `plan`, `tasks`, `commands`, `agents`, `workflows`, `scheduler`, `processes`, `workspace`, `models`, `mcp`, `plugins`, `extensions`, `hooks`, `permissions`, `policy`, `account`, `notifications` and `self`. `ext.host.decide(context, questions)` asks igni's local decision model. The full host-API table — which namespaces exist and what each grant covers — is in [Building extensions](/docs/building-extensions).

### Hooks, signals and the events a service sends

```python
from igni_extension import Hooks, Allow, Reject, Modify, ServiceEvent

@ext.hook(Hooks.PRE_TOOL_USE)
async def guard(value):
    if value.tool_name.endswith("delete"):
        return Reject("Deletes are reviewed by a human here.")
    return Allow()

@ext.on(ext.host.chat.run_completed)
async def note(run):
    ...                                      # a reaction; igni never waits on it

@ext.on_service_event("index.ready")
async def index_ready(event: ServiceEvent) -> None:
    repo = event.payload["repo"]
    created = await ext.host.sessions.create(title=f"Index: {repo}")
    await ext.host.sessions.chat(created.session_id).post(f"The index for {repo} is ready.")
```

Deciding hooks (`PRE_TOOL_USE`, `POST_TOOL_USE`, `USER_PROMPT_SUBMIT`, `STOP`, `PLAN_SUBMIT`) answer `Allow()`, `Reject(reason)` or `Modify(value)` within two seconds — returning `None` allows; "told" events like `SESSION_START` decide nothing. One handler per event. A handler may take a second `Caller` parameter. The hook events are described in [Hooks, workflows and scheduled tasks](/docs/hooks-workflows-and-scheduled-tasks). `@ext.on_service_event()` with no type takes every type no other handler names; its return value is ignored. `ext.busy(reason)` / `async with ext.busy_while(reason):` keep igni from suspending the process while it works.

## The page SDKs: extension-bridge, ui-react, ui-css (TypeScript)

An extension's pages render inside the igni app. Three zero-config packages build one: `@ignite-ember/extension-bridge` connects the page to the host, `@ignite-ember/ui-react` gives you igni's components, and `@ignite-ember/ui-css` gives you its styles. The packages ship TypeScript source and are consumed by any bundler that compiles TS (Vite, esbuild, Rollup); Next.js and Jest must list them for transpilation.

### Connecting

```ts
import { connect } from "@ignite-ember/extension-bridge";

const bridge = await connect();   // resolves once igni says hello; the theme is already applied
```

`connect()` resolves to a `Bridge` once the host's handshake arrives (30 s default timeout; it rejects if the page is not framed by a host). By the time it resolves, igni's theme tokens are already on `document.documentElement`, so the page never flashes fallback colours. The `Bridge`:

| Member | What |
|---|---|
| `bridge.extensionId` | The id the host named this frame |
| `bridge.params`, `bridge.onParams(fn)` | Launch params, and a subscription that fires on change (not initially — read `params` for that) |
| `bridge.settings` | The extension's `contributes.settings` for this frame |
| `bridge.theme`, `bridge.tokens`, `bridge.onTheme(fn)` | The current theme, its applied tokens, and theme-change events |
| `bridge.host` | The host object model — same shape as the Python `ext.host` |
| `bridge.service` | The extension's own service, authenticated as the signed-in person |
| `bridge.rpc(method, args?, timeoutMs?)` | Call one of the extension's tools by name (`ext.<id>.<tool>`) |
| `bridge.navigate(to)` | Ask the host app to go to a page it knows |
| `bridge.setLocation(state)` | Record where the page is (string values) so the host can restore it — not navigation |
| `bridge.on(signal, fn)` | Subscribe to a host signal, e.g. `bridge.on(bridge.host.chat.run_completed, …)` |
| `bridge.close()` | Close the frame |

`bridge.host` reaches the same object model as the Python process, with the same names and the same error codes — except that a page's `host.ui` is the window it is framed in, and a page *observes* but cannot answer a hook (that is the process's job). `bridge.service.fetch(path, init?)` adds the person's bearer token (and retries once on a `401` with a fresh one), and `bridge.service.websocket(path)` opens an authenticated socket; both refuse any path that resolves off the service's own origin, so the token never leaks cross-origin.

### Components and styles

```tsx
import { AppShell, Scroll, Table, Toolbar, Button, useToast } from "@ignite-ember/ui-react";
import "@ignite-ember/ui-css";
```

`@ignite-ember/ui-react` exports igni's component set — layout (`AppShell`, `Scroll`, `Split`, `Row`, `Card`, `List`, `Toolbar`), form controls (`Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`, `Field`), display (`Badge`, `Chip`, `Heading`, `Text`, `Progress`, `Spinner`, `Table`, `Tabs`, `Dialog`, `Tooltip`, `Empty`, `Skeleton`, `Markdown`), and hooks (`useToast`, `useAnnounce`) — plus an `ErrorBoundary`. React 18 or 19 is a peer dependency you supply, along with `react-markdown`/`remark-gfm` (and optionally `mermaid`, loaded on demand). `@ignite-ember/ui-css` is a single stylesheet of the same class names igni uses, every value a CSS custom property whose fallback is igni's palette, so the page is styled on its own and re-themed live inside the app.

> **Important:** The stylesheet must be bundled into the page, not linked from igni's origin — the page runs under a strict `default-src 'self'` content-security policy, so a cross-origin `<link>` is refused.

### A page end to end

```tsx
import { createRoot } from "react-dom/client";
import { connect } from "@ignite-ember/extension-bridge";
import { ErrorBoundary, AppShell, Scroll } from "@ignite-ember/ui-react";
import "@ignite-ember/ui-css";

const root = createRoot(document.getElementById("root")!);

connect()
  .then((bridge) => {
    root.render(
      <ErrorBoundary>
        <AppShell>
          <Scroll>{/* render from bridge.params, call bridge.rpc(...) */}</Scroll>
        </AppShell>
      </ErrorBoundary>,
    );
    bridge.onParams(() => {/* re-render */});
  })
  .catch((error: unknown) => {
    root.render(<p>{error instanceof Error ? error.message : String(error)}</p>);
  });
```

## The CLI: ignite-ember / igni

The CLI is the same agent as the desktop app, for scripts and CI. It is the package `ignite-ember` (command `igni`, alias `ignite-ember`), and needs Python 3.12.

```bash
pip install ignite-ember            # or: brew install ignite-ember/tap/ignite-ember
igni -m "explain src/auth.py"       # one message, then exit
git diff | igni -p                  # stdin in, answer out
igni -c -m "and the tests?"         # continue the last session
igni --model platform-review-lora -m "review this branch"
```

It reads its server from `~/.igni/config.yaml` (`api_url:`) and its token from `~/.igni/credentials.json`. Flags set the permission mode (`--read-only`, `--accept-edits`, `--auto-approve`, `--strict`), turn off web tools (`--no-web`), or add directories (`--add-dir`). Two subcommands exist: `igni ext` for extensions, and `igni migrate` for igni's own database. There is no interactive terminal chat and no headless sign-in — see [Installing igni](/docs/installing-igni) for the full flag list and the CI workaround.

## Testing your integration

Each SDK ships an in-process fake so your tests need no running server.

- **`igni_service.testing.FakeIgni`** is every igni endpoint a service calls, in one object. Build an `IgniService` wired to it with `fake.service()`, add organisations and members, sign a person in with `fake.authorize(...)`, then assert on `fake.deliveries`, `fake.events`, `fake.revoked` and the rest. `fake.approve()` / `fake.revoke()` / `fake.hold_uploads="reason"` drive the approval states, and `await fake.upload(bundle, igni)` uploads the bundle as the service would.
- **`igni_extension.testing.HostHarness`** runs the host's MCP session with your extension in-process: `await harness.call("tool", {...}, caller=...)` calls a tool exactly as igni does. **`FakeHost`** plays the host object model (grants, property values, signal emission, hooks). **`FakeHostTokenEndpoint`** issues the per-person tokens `ext.service` expects; pass its `minter` into `FakeIgni` to test a real service and extension together. **`ConcurrencyHarness`** fires calls concurrently and fails on a loop stall or a caller leak.

## Installing without internet access

Everything the SDKs need installs from inside your network. Each `sdk-v<version>` release carries every wheel and npm tarball with SHA-256 digests. Install the Python packages from a local directory of those wheels:

```bash
uv add igni-service --find-links ./sdk-wheels
# or: pip install --index-url https://pypi.example.internal/simple igni-service igni-extension
```

and the npm packages from the packed tarballs (or your internal registry). An air-gapped igni deployment is set with `air_gapped: true`; a page's `egress` host outside the network is unreachable even when the manifest grants it, and the extension process reaches only its own service and declared hosts through igni's proxy. The build and deployment side of this is in [Offline updates](/docs/offline-updates) and [Installing igni](/docs/installing-igni).

## Errors and limits

| Limit | Value |
|---|---|
| Chat `n` / `max_tokens` / `messages` | ≤ 16 / ≤ 1,000,000 / ≤ 10,000 |
| Service → agent rate | 600 items a minute by default (`SERVICE_EVENTS_PER_MINUTE` on the server) |
| Attachments | ≤ 5 MiB each, 10 per message |
| Event payload | ≤ 64 KiB |
| Item delivery | At-least-once, de-duplicated by `event_id`, held up to 14 days |
| Service token lifetime | 10 minutes (refreshed for you); person session token: 30 days |
| Backend saturation | `429` with `Retry-After` — refused, never queued |

**Not built yet.** A few surfaces are declared but not wired up: the host error code `stage_2` is reserved; some host-model JSON values are not yet part of the schema's shape promise; the page bridge has no `identity`, `setTitle`, `setStatus` or `storage` yet; a service cannot replace a view it showed (it shows a new one); sidecar (container) extensions are in the manifest schema but do not run — use a Python package; development mode has no hot reload; and secrets are plain environment variables, not handles. Deprecated in favour of clearer names: `igni_service` `Host.vm_profile()` (use `extension_vm_profile()`), and `IgniApp.request_vm_profile` / `vm_profile_request` (use the `app.vm_profile.{request,status,effective}` trio).

## Where to go next

- **[Building extensions](/docs/building-extensions)** — the manifest, permissions, approval and distribution, and the full host-API table.
- **[Connecting your GPUs](/docs/inference-backends)** — how chat completions are routed to the inference nodes you own.
- **[Administering your organisation](/docs/administering-your-organisation)** — approving a service and switching its extension on per group.
- **[CodeIndex](/docs/codeindex)** — a complete extension built on exactly these SDKs.
