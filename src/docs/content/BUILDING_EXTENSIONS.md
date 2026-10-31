An **extension** adds to igni on people's machines: tools the agent can call, pages and commands in the app, prompt changes, agents, skills and hooks. Most extensions belong to a **service** — a system of yours that runs beside igni server — and the service ships its extension through igni. CodeIndex and Artifacts are built exactly this way. This page is for the engineer writing one: the manifest, how it is approved and distributed, the host API, the SDKs, and the two ways a service reaches a person's agent.

## The pieces

| Piece | What it is | SDK |
|---|---|---|
| **A service** | Your backend. It registers with igni server, ships the extension, and can send messages and events to people's agents. | `igni-service` (Python) |
| **The extension's process** | A Python program igni starts on each machine. It serves tools over MCP, and talks to the igni app it runs in through the **host API**. | `igni-extension` (Python) |
| **Pages** | Web pages shown inside the igni app, talking to the host and to your service. | `@ignite-ember/extension-bridge`, `@ignite-ember/ui-react`, `@ignite-ember/ui-css` (npm) |

Extensions run in the igni desktop app and in igni on a [Fleet](/docs/fleet) VM. Their pages render only in the igni app.

## The manifest

Every extension has a `manifest.json` at its root, against the schema `https://igni.sh/schema/extension-manifest-1.json`. Four fields are required: `id`, `version`, `contract` and `trust`. A trimmed copy of Artifacts' manifest:

```json
{
  "$schema": "https://igni.sh/schema/extension-manifest-1.json",
  "id": "igni.artifacts",
  "version": "0.1.0",
  "contract": ">=1.0 <2",
  "name": "Artifacts",
  "vendor": "Ignite Ember",
  "trust": "unsigned",
  "python": {
    "package": "igni_artifacts_extension",
    "entry": "igni-artifacts-extension",
    "wheels": "wheels",
    "mcp": {"transport": "stdio"}
  },
  "permissions": {
    "workspace": "read",
    "egress": [],
    "tools": [
      {"name": "igni.artifacts.artifact_read",
       "annotations": {"readOnlyHint": true, "destructiveHint": false,
                       "idempotentHint": true, "openWorldHint": false}}
    ],
    "rpc": ["ext.igni.artifacts.*"],
    "host": ["account", "chat.post", "chat.read", "links", "ui"],
    "toolAudience": "own-agents"
  },
  "contributes": {
    "pages": [{"kind": "igni.artifacts", "label": "Artifacts", "sidebar": true}],
    "commands": [{"command": "/artifacts", "desc": "project documents"}],
    "settings": [{"key": "serviceUrl", "type": "string", "label": "Artifacts service", "default": ""}],
    "plugin": "plugin"
  }
}
```

| Field | What it says |
|---|---|
| `id` | Reverse-DNS and permanent. Everything the extension contributes is namespaced by it. |
| `version` | The extension's own semver. |
| `contract` | The range of igni's extension contract it works with. The contract today is `1.0`. |
| `trust` | `first-party`, `partner` or `unsigned`. A label; igni does not decide anything on it. |
| `python` | How it runs: a package, its console-script `entry`, a `wheels` directory, and MCP over `stdio`. This is how a service ships one. |
| `dev` | Instead of `python`, a command to run, for development only. |
| `permissions` | What it may reach. See below. |
| `assets` | Large files per platform (`any`, `macos-arm64`, `linux-x86_64`, `windows-x86_64`), each with its `sha256`. CodeIndex ships Neo4j, a Java runtime and an embedding model this way. |
| `contributes` | `pages`, `menu`, `indicators` (status chips), `commands`, `promptFragments`, `prompt` (overrides and edits to igni's prompts), `settings`, and `plugin` — a directory of agents, skills and hooks. |

**Permissions:**

| Key | Values |
|---|---|
| `workspace` | `none`, `read` or `write` — the person's project. `workspacePaths` narrows it with globs. |
| `egress` | Hosts, or `host:port`, the extension may reach. Its own service is always allowed. |
| `secrets` | Names. Each value arrives as `IGNI_SECRET_<NAME>`. |
| `tools` | Every tool the agent may call, each with all four MCP hints. igni's permission modes decide on those hints — see [Permissions and safety](/docs/permissions-and-safety). |
| `host` | Grants on the host API. See below. |
| `toolAudience` | `all-agents` or `own-agents` — whether only the extension's own agents get its tools. |
| `hooks` | Hook events it answers, such as `PreToolUse` or `PlanSubmit`. |
| `service` | What its service may send to people's agents: `messages`, `attachments`, `chats`. |

**What `egress` and `workspace` enforce.** On the extension's pages they always hold: a page connects only to its own service and its `egress` hosts. On the extension's process they hold where igni can sandbox it:

| | macOS | Linux | Windows |
|---|---|---|---|
| Sandbox | Seatbelt (`sandbox-exec`) | bubblewrap (`bwrap`), in a network namespace of its own | None yet |
| `egress` | The process reaches its own service and its `egress` hosts through a proxy igni runs, and nothing else; a direct connection to any other host fails. It can still reach services listening on the same machine, though not igni's own. | The same, and services on the machine are not reachable either. | Not enforced on the process. |
| `workspace` | `none`: the project is not readable. `read`: readable. `write`: writable. A `workspacePaths` glob is granted as its folder (`docs/**/*.md` grants `docs`). | The same. | Not enforced on the process. |

Under the sandbox the process also cannot read the rest of the person's home folder — `~/.ssh`, `~/.aws`, igni's own credentials, browser profiles — and writes only to its data directory (`IGNI_EXTENSION_DATA`), its temporary directory (`TMPDIR`, which is also its `HOME`) and a `write` workspace. When igni is air-gapped, an `egress` host outside the network is not reachable even though the manifest grants it.

What this means for your code:

- Make HTTP calls with a client that honours `HTTPS_PROXY` (httpx, requests, urllib and `websockets` 15 or later do by default). `NO_PROXY` keeps this machine direct.
- Keep files in `IGNI_EXTENSION_DATA`, not in your bundle, the person's home or a hard-coded path. Java needs `java.io.tmpdir`; igni sets it through `JAVA_TOOL_OPTIONS`.
- Declare every host the process reaches, including a storage host your service hands out signed URLs for. An undeclared one is refused, and the refusal is in igni's log with your extension's id.
- Do not open files or URLs with the operating system (`open`, `xdg-open`): the sandbox does not let the process start other applications.

Two settings, both for an organisation's own machines. `extensions.require_sandbox: true` refuses to start an extension where no sandbox is available — Windows today, or Linux without `bwrap` — instead of running it unconfined with a warning; only the managed settings file, your organisation's group policy or `IGNI_EXTENSIONS_REQUIRE_SANDBOX=1` sets it. `extensions.sandbox: false` turns the sandbox off while you develop an extension; it is read from the managed or the user's settings, never from a project's `.igni` folder.

An extension cannot take one of igni's own commands. When two extensions want the same thing — a prompt section, a command, an agent — the one higher in the priority order on the portal's **Services** page has it.

## Approval and distribution

There is no extension marketplace. An extension reaches people only through its service, and only after two decisions in your own portal:

1. **The service registers and uploads its extension.** On start, `igni-service` registers the service with igni server, uploads the extension bundle signed with the service's key, and logs the key's thumbprint. You write none of this.
2. **A super admin approves the service** on the portal's **Services** page, after comparing the thumbprint and reading what the extension would install: its pages, commands, settings, permissions, prompt changes, agents and skills. Approval is trust. It gives the extension to nobody.
3. **An org admin switches it on per group**, on the group's **Extensions** tab, or per app on the app's page. It is off until they do.

igni then lists, downloads, verifies and installs the extension on each machine of that group, at start-up and sign-in, and removes one that is no longer listed. igni verifies the bundle against the key of the service that uploaded it. It does not sign or review anyone else's extension.

**An update that asks for more waits for a super admin.** Once your service is approved, each new version is compared with the approved one. The same or less goes live at once. More — a new `egress` host, a `workspacePaths` path or wider `workspace`, a secret, a tool or a riskier tool hint, `toolAudience: all-agents`, a host capability, an RPC method, a hook, a `service` grant, a prompt override or section, an anchor, a command, a page, a plugin agent or skill — is **held**: the upload still answers `200`, with `"held": true`, a `reason` and the `added` grants, which `igni-service` logs, and every machine keeps the approved version until a super admin approves the new one on the **Services** page. If they reject it, it is discarded and the approved version stays. Uploading again replaces a held version; there is never more than one waiting. Name, version, menus, indicators, settings and the wording of prompt sections are not grants. How a super admin decides is in [Administering your organisation](/docs/administering-your-organisation).

## The SDKs

| Package | For |
|---|---|
| `igni-service` | A service: registration, people's tokens, the directory, notifications, erasure and export, sending to agents. |
| `igni-extension` | The extension's process: tools, hooks, the host API, calls to its own service. |
| `@ignite-ember/extension-bridge` | A page: `connect()`, then `bridge.host` and `bridge.service`. |
| `@ignite-ember/ui-react`, `@ignite-ember/ui-css` | igni's components and styles for a page. |

The Python packages are on PyPI and require Python 3.12 or later; the page packages are on npm.

```bash
uv add igni-extension          # the extension's process
uv add igni-service            # your service
npm install @ignite-ember/extension-bridge @ignite-ember/ui-react @ignite-ember/ui-css
```

Each SDK release (`sdk-v<version>` on [github.com/ignite-ember/igni](https://github.com/ignite-ember/igni/releases)) also carries every wheel and npm tarball, with their SHA-256 digests, for a build machine that cannot reach PyPI or npm.

## An extension's process

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

def main() -> None:   # the console script the manifest's python.entry names
    ext.run()
```

`ext.service` calls your service as the signed-in person, with a ten-minute token the igni app gets for it. The extension holds no address and no secret. Every tool must state its four hints; `ext.run()` refuses to start otherwise.

Hooks use `@ext.hook(...)` and answer `Allow`, `Reject(reason)` or `Modify(value)` within 2 seconds. An extension that stays silent three times in a row is marked faulty.

## The host API

The host API is the igni app as an object model: `ext.host` in Python, `bridge.host` on a page. Its version is **1.10**. Each part needs a grant in `permissions.host`; a call without one fails with `not_granted`.

| Namespace | What it reaches | Grant |
|---|---|---|
| `host.app` | Display, version, connection; `open_external(url)` | `app`; `links` to open a link |
| `host.ui` | Route, panels, toasts, dialogs; `navigate`, `toast`, `show_dialog` | `ui` |
| `host.sessions` | `list`, `current`, `open`, `create`, `chat(id)` | `sessions` |
| `host.chat` | The chat on screen: messages, status; signals such as `message_added`, `run_started`, `run_completed` | `chat.read` |
| | `post(text, attachments)`, `queue(text)` | `chat.post` |
| | `append(view, title)`, `replace(...)` — show a card | `chat.append` |
| | `cancel`, `compact` and other run control | `chat.control` |
| `host.workspace` | The person's project | `permissions.workspace` |
| `host.notifications` | Its own notifications; everyone's with `notifications` | — |

Others — `commands`, `agents`, `workflows`, `scheduler`, `processes`, `models`, `mcp`, `plugins`, `extensions`, `hooks`, `permissions`, `policy`, `account` — each need the grant of the same name. A grant may end in `*`, such as `chat.*`.

Three parts matter for a service-driven extension:

- **`host.sessions.create(project_dir=None, title=None, focus=None)`** makes a new chat and returns it (`created.session_id`). It moves no window unless you pass `focus=True`, and the title shows at once. Always pass `title=` by name; the first positional argument is the project directory.
- **`host.sessions.chat(id)`** is a handle on any chat, not only the one on screen. Reading needs `chat.read`. Posting or appending to a chat that is **not on screen** also needs **`sessions.post`**, which `chat.*` does not include. A post there starts a run, or is queued for the run going. It never answers an approval.
- **`chat.message_added`** carries `from_extension` and `from_service`. `from_service` is the client id of the service that sent the message, and `None` for the extension's own posts and the person's.

## How a service reaches a person's agent

A service reaches a producer's igni — a person's or an app's, on their desktop or in their Fleet VM — through igni server, in one of two ways.

```python
from igni_service import Attachment, Producer

agent = igni.host(org_id).agent(Producer.person("u-marieke"))
```

### A message, for the agent

```python
await agent.send_message(
    "Claim CL-20431 arrived; assess the damage.",
    attachments=[Attachment.from_path("damage.jpg")],
    thread="claim:CL-20431",
    event_key="claim:CL-20431:new",
)

chat = await agent.new_chat("Claim CL-20431", thread="claim:CL-20431")
await chat.send_message("The adjuster replied: see the report.")
```

igni posts the message exactly as sent, labelled as your extension's, and it starts a run or waits for the one going. No extension code runs.

- **`thread`** is your own key for a conversation. The first item of a thread opens a chat for it, titled by `title` or `"<extension>: <thread>"`. Later items go there. Without a thread, a message goes to the extension's own chat. Nothing lands in the chat the person has open.
- **Attachments**: `Attachment.from_path(path)` or `Attachment.from_bytes(filename, data)`. At most 5 MiB each and 10 per message. Files that arrive during a run wait for it to end.
- **A chat handle** can also `queue`, `show` a view, `rename` and `cancel` — in chats the service opened.
- **Never**: a service cannot answer an approval, read the chat, or move what the person sees.

The extension only watches. It sees the message on `chat.message_added`, with `from_service` set, and cannot rewrite, redirect or drop it.

These need grants in the manifest — `"permissions": {"service": ["messages", "attachments", "chats"]}` — approved with the service. igni server refuses the rest with 403, raised as `EventRefused`.

### An event, for the extension

```python
accepted = await agent.send_event("index.ready", {"repo": "acme/api"})
status = await agent.status(accepted.event_id)
```

igni hands the event to the extension and posts nothing. The extension decides what to do through the host API:

```python
from igni_extension import ServiceEvent

@ext.on_service_event("index.ready")
async def index_ready(event: ServiceEvent) -> None:
    repo = event.payload["repo"]
    created = await ext.host.sessions.create(title=f"Index: {repo}")
    await ext.host.sessions.chat(created.session_id).post(
        f"The index for {repo} is ready; review the open changes."
    )
```

```json
"permissions": {"host": ["sessions", "chat.post", "sessions.post"]}
```

An event needs no service grant. Its payload is at most 64 KiB. `@ext.on_service_event()` with no type takes every type no other handler names. A handler's return value is ignored.

An event is **`not_handled`** when no handler takes its type, the extension is not running, or the handler raises. The service reads that from `agent.status(event_id).state`, with a `not_handled_reason`. igni waits up to 10 seconds for a handler; delivery is at least once and repeats are dropped by `event_id`.

### What became of it

Every send returns an `event_id`. `agent.status(event_id).state` is one of `pending`, `delivered`, `not_handled`, `expired`, `dropped` (the producer no longer has the extension) or `failed`. An item waits at most 14 days for the producer's igni to take it. Pass an `event_key` and a retry is stored once. A service may send 600 items a minute by default (`SERVICE_EVENTS_PER_MINUTE` on igni server).

Send a message when your service knows what the agent should read. Send an event when the extension should decide.

## Developing and packaging

```bash
igni ext init ./acme-example              # a manifest, a server, a page
igni ext doctor ./acme-example            # schema, contract, permissions, collisions, an MCP round trip
IGNI_DEV_EXTENSIONS=1 igni ext install ./acme-example   # --replace to upgrade
igni ext list
igni ext remove acme.example
```

`igni ext install` also takes a git URL, with `--ref` and `--subdir`. An installed extension starts on igni's next start. If `doctor` passes, it loads.

For tests, `igni_extension.testing` has `FakeHost` and `HostHarness`, and `igni_service.testing` has `FakeIgni`, which records events and lets a test settle them.

To ship, build the bundle the service uploads:

```bash
igni-service-bundle --extension extension --out extension-bundle.tar.gz
```

It holds the manifest, the plugin, the pages and a wheelhouse for Python 3.12 on macOS arm64, Linux x86_64 and Windows x86_64. Large assets go beside it in `extension-bundle.assets/`.

## Not built yet

- **Sidecar extensions** (a container image instead of a Python package) are in the manifest schema but do not run. Use `python`.
- **A service cannot replace a view** it showed; it shows a new one.
- **The page bridge** has no `identity`, `setTitle`, `setStatus` or `storage` yet.
- **Development mode** has no hot reload.
- **Secrets** are plain environment variables, not handles.

## Where to go next

- **[CodeIndex](/docs/codeindex)** — a complete extension with assets, prompt overrides, a hook and a status chip.
- **[Administering your organisation](/docs/administering-your-organisation)** — approving services and switching extensions on per group.
- **[Hooks, workflows and scheduled tasks](/docs/hooks-workflows-and-scheduled-tasks)** — the hook events an extension can answer.
