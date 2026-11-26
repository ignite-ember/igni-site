igni reaches a developer in two forms: the **desktop app**, which is how a person uses it, and the **CLI**, for scripts and CI. Both run the same agent on the developer's own machine and talk to your igni server for sign-in and models. This page covers installing each, signing in, and installing on a machine with no internet access. There are no IDE plugins; the desktop app and the CLI are the clients.

> **Note:** This documentation describes **1.0.7**, the current release. The backend is on PyPI as `igni-core`, so `pip install igni-core` gives you 1.0.7. The `ignite-ember` name on PyPI is now an alias that installs `igni-core`, but it is published only at **1.0.4**, so `pip install ignite-ember` gives you igni-core 1.0.4. `igni-core` keeps its files in `~/.igni` and moves an existing `~/.ember` there on first start. [Changes and upgrades](/docs/core/changelog) has the whole version story.

## The desktop app

The app is called **igni**. It is a Tauri application that shows igni's web interface and runs igni's backend beside it on your machine.

| Platform | Files | Notes |
|---|---|---|
| macOS | `.dmg` | Apple silicon only. macOS 26 or later. Signed with a Developer ID and notarised. |
| Windows | `.msi`, `.exe` | Not code-signed: Windows shows an "unknown publisher" prompt on first launch. |
| Linux | `.AppImage`, `.deb`, `.rpm` | |

Builds are attached to each release at [github.com/ignite-ember/igni-app/releases](https://github.com/ignite-ember/igni-app/releases).

**On first launch it installs its own backend.** The app downloads `uv`, uses it to install Python 3.12, creates a private virtual environment, installs `igni-core[decisions]` at the app's own version, and downloads igni's decision model (about 1.7 GB). It needs network access for this, and at least 1 GB free before it starts. Everything lands in a per-user cache:

| Platform | Cache |
|---|---|
| macOS | `~/Library/Caches/igni` |
| Linux | `$XDG_CACHE_HOME/igni` |
| Windows | `%LOCALAPPDATA%\igni` |

An install made before the rename keeps its `ember-code` directory beside the new one, and the app keeps using it — the virtualenv in it records absolute paths, so moving it would cost a full reinstall.

Later launches start straight away. A backend that crashes is started again, and every window follows it; the app gives up after three crashes in five minutes. If the backend is damaged, **Reinstall Backend (Clean)** in the app's menu starts again; **Diagnose Backend** reports what it found.

The app does not put an `igni` command on your `PATH`. Install the CLI separately if you want one.

### Updates

The app checks for updates when it connects and installs them itself: the macOS app, the Linux AppImage, and the Windows `.msi` and NSIS installs. Each install fetches only its own signed payload, and checks its minisign signature against the public key it ships with. A `.deb` or `.rpm` install is not offered updates; install the new package over the old.

If the update check fails on a certificate, the error says why. For an unknown issuer — usually a company proxy that inspects TLS — add your organisation's CA to the system's trust store. The first-launch `uv` download trusts the system's certificates and honours `HTTPS_PROXY` too, so a first launch behind such a proxy works once the CA is installed.

| Setting | Effect |
|---|---|
| `update_check_ttl: 0` | No update checks at all. |
| `update_endpoint: https://…/latest.json` | Check a release mirror inside your network instead of GitHub. |
| `air_gapped: true` | No request unless `update_endpoint` names a mirror. |

Set these in `~/.igni/config.yaml`, in the managed-settings file, or in a group's settings policy. Managed settings win, then group policy, then the user file.

## The desktop window

### The sidebar

"+ New chat" sits at the head of the sidebar, chats are grouped by folder (each group collapses), and the account menu is at the foot, with igni's version and the Appearance toggle at its top. Chats are listed newest first by their last message: a chat moves to the top the moment a message goes in, in every window, before the reply starts. A rename does not move it.

Each chat shows what it is doing:

| What you see | What it means |
|---|---|
| A small turning ring in igni orange | A run is working in that chat. |
| An amber "waiting" pill | The run waits on your approval. |
| A blue dot and a brighter name | A run finished while you were elsewhere. It stays unread until you open the chat. |

**Read state follows you.** The chat on screen is marked seen while the window is visible, so a chat you read in one window, or on one device, is read everywhere. The backend keeps it, and a run that finishes later makes the chat unread again.

### The cat

A small cat sits beside "+ New chat" and shows what igni is doing:

| The cat | When |
|---|---|
| Thinks | A run is starting. |
| Works | The reply is streaming. |
| Waits | A run asks for your approval. |
| Is alarmed, for a few seconds | A run failed. |
| Is happy, for a few seconds | A run of 15 seconds or more finished. |
| Is happy, for 3 seconds | Your message reads as pleased with igni. |
| Closes its eyes, for 3 seconds | Your message reads as displeased with igni. |

When the open chat is idle, the cat shows what your other chats are doing. Its eyes follow the pointer; where the window has no hardware graphics it is drawn still, but its states still change. The account menu's **Cat in the header** switch hides it on this device.

**How it knows how you feel.** The backend's local Laya model reads whether each message you send is pleased or displeased with igni, in any language, and tells the window the verdict and how sure it is. Nothing leaves your machine for this. Without the decision model, the cat simply never reacts to a message. How an integrator can listen to the same reading is in [Building extensions](/docs/core/building-extensions#how-a-message-feels-about-igni).

The cat is [Open Bot Avatar](https://github.com/DominikScholz/open-bot-avatar) (MIT), credited in the app's `NOTICE`.

### Files beside the chat

The folder button in the header, next to the bell, docks a read-only **Files** viewer to the right of the chat, which stays live on the left. The divider resizes it (its width is remembered on this device), and a full-screen toggle hides the chat and the sidebar.

- **Files open as tabs**, each keeping its scroll position. Open tabs survive closing the viewer and reset only when the project folder changes.
- **One search box** browses folders and finds files anywhere in the project.
- **Markdown is rendered**, with sanitised HTML, code blocks you can copy and collapse, and mermaid diagrams. A Source / Preview toggle shows the text, and a link to a file in the project opens in the viewer.
- **Images and PDFs are drawn in place**, up to 10 MiB. Other binary files show a card that opens them with the system app.
- **A file pill in the chat opens the viewer**, on this computer and in the cloud. On the desktop, "Open in editor" is still there.

### Search across chats

Chat search has a **This chat / All chats** scope. All chats searches every conversation in the project, newest chat first, and a result opens the chat it was found in.

### MCPs, Extensions and Plugins

The three pages are one card catalogue, each with a search, a filter and a sort in its header. MCPs filter by connected, disconnected or needs approval; Extensions by ready, failed or starting; Plugins by category, which the marketplace also sorts by.

- **The MCPs page reloads `.mcp.json`.** Its refresh button picks up a server you added, edited or removed, without restarting the app. See [Connecting an MCP server](/docs/core/tools-mcp-and-language-servers#connecting-an-mcp-server).
- **An MCP server that failed says what to check** — for example *"Couldn't start “mcp-server-github”: command not found. Install it, or fix the command in .mcp.json."* The raw error stays in the line's tooltip, and a server's tools are listed without the `mcp_<server>_` prefix.
- **An extension opens onto its own page**: settings, the pages and commands it adds, its tools and its notices.

### Approvals and Stop

While an approval waits, **Stop** takes Send's place and does what Escape does: rejects the waiting approvals and stops the run. The indicator says "Waiting for your approval", and a message you type then starts a new run instead of queueing behind the paused one. An approval the backend dropped leaves the screen.

### This computer or the cloud

The desktop can run igni on this computer or in your cloud igni, as your group's mode allows ([the group's mode](/docs/core/configuration-and-precedence#where-igni-runs-the-group-s-mode)):

| Group mode | What the app does |
|---|---|
| `local` | Nothing new. The app never dials the cloud. |
| `local_and_cloud` | *This computer · Cloud* sits in the account menu. |
| `cloud` | The app runs only a small backend for sign-in and the group's policy, and the status line's chip shows Cloud with no switch. |

A mode change applies while the app runs. The status line says how the cloud is doing — `Cloud`, `waking…`, `sign in` or `offline` — and banners cover signing in, an unreachable cloud (with **Use this computer** when that is allowed), a refusal and a busy cloud. A badge counts runs and approvals still waiting on this computer.

Extensions work in the cloud too: their pages are served through the app's shell. Your session token never enters the window; the shell relays the connection over loopback and dials the gateway over verified TLS, honouring `HTTPS_PROXY` and `NO_PROXY`. What needs a path on your computer — opening or revealing a file, the folder picker, the hooks panel's file links — is hidden in the cloud, and *Restart* and *Reinstall* say "(this computer)".

Until a server offers a cloud igni, the app finds none and behaves as it did before.

## The CLI

```bash
pip install igni-core
```

The package is **`igni-core`** — the name igni's backend and CLI were renamed to when the monolith was split — and it is on PyPI, so install it directly. The `ignite-ember` name is an alias package that carries metadata and nothing else and depends on `igni-core` at the same version, but it is published only at 1.0.4, so `pip install ignite-ember` gives you igni-core 1.0.4; prefer `pip install igni-core`. It needs **Python 3.12** exactly. `igni-core` installs the command `igni`.

There is also a Homebrew formula:

```bash
brew install ignite-ember/tap/igni-core
```

It installs `igni-core` and puts `igni` on your `PATH`, but the formula is still at **1.0.4**. For the current backend, use `pip install igni-core` instead.

Optional extras:

| Extra | Adds |
|---|---|
| `decisions` | igni's local decision model, used by Bypass mode's last check. The desktop app always installs it. |
| `mcp` | MCP server support. |
| `web` | DuckDuckGo search. |

The CLI has no interactive chat in the terminal. Run with no arguments, it says so and lists what it can do:

```bash
igni -m "explain src/auth.py"          # one message, then exit
git diff | igni -p                      # stdin in, answer out
igni -c -m "and the tests?"            # continue the last session
igni --model platform-review-lora -m "review this branch"
```

Other flags set the permission mode (`--read-only`, `--accept-edits`, `--auto-approve`, `--strict`), turn off web tools (`--no-web`), work in a git worktree (`--worktree`) or add directories (`--add-dir`). See [Permissions and safety](/docs/core/permissions-and-safety).

Four subcommands exist: `igni ext`, for [extensions](/docs/core/building-extensions); `igni login`, which signs in to your igni server; `igni migrate`, which migrates igni's own database; and `igni trust`, which records whether a folder may run its own code.

### `igni ext`

`igni ext` has six subcommands:

| Subcommand | What it does |
|---|---|
| `igni ext doctor [bundle]` | Checks a bundle's manifest, then starts it the way igni would and asks it over MCP for its tools |
| `igni ext install <source>` | Installs an extension you are developing, from a directory or a repository |
| `igni ext sync` | Brings the local store in step with the extensions igni server lists as switched on for your group |
| `igni ext list` | Lists what is installed in this deployment |
| `igni ext remove <extension-id>` | Removes an installed extension |
| `igni ext init <directory>` | Scaffolds an extension that runs |

`igni ext sync` is what the desktop app does at start-up and at sign-in, for a terminal. igni server lists the extensions switched on for the signed-in person's group, and the sync downloads, verifies and stores what is new or changed, removes what is no longer listed, and leaves a development install of the same id alone. It starts and stops nothing: igni's backend starts what is stored when it boots, and an `igni -m` run syncs by itself first.

`igni ext install` is for development only. It needs `IGNI_DEV_EXTENSIONS=1`, because extensions otherwise reach a machine from their services through igni server.

## Signing in

Neither client asks for a server address if you have published one. A developer types their work email; igni looks up the address's domain and finds your server from a record you publish, either the file `https://<domain>/.well-known/igni.json` or the DNS TXT record `_igni.<domain>`. How to publish it is in [Administering your organisation](/docs/server/administering-your-organisation). Without a record, the app asks "Where is your igni?" and takes a URL.

Sign-in then opens **your** deployment's sign-in page in a browser, with whichever methods you enabled. Picking an organisation gives the client a token for 30 days. The CLI writes it to `~/.igni/credentials.json` with mode `0600`.

The CLI's settings point it at the server:

```yaml
# ~/.igni/config.yaml
api_url: https://igni.example.com
# portal_url is worked out from api_url when not set
```

**The CLI signs in headlessly; the desktop app does not.** `igni login` runs the same flow as `/login`, printing the address to open so that a machine with no browser of its own can still finish. `igni login --token-stdin` keeps an access token read from stdin, once igni server has accepted it, and is the path for a script or a CI job that already holds one:

```bash
printf %s "$IGNI_TOKEN" | igni login --token-stdin
```

The token is never taken as an argument, so it does not land in the shell's history or in the process list. The token expires after 30 days.

Signing in through a browser also fetches your group's pack of agents, skills, hooks and settings, verifies it and caches it on disk under `~/.igni/group-policy/`. The `--token-stdin` path keeps the token and nothing else; the pack arrives the next time you sign in through a browser.

After sign-in, the client asks your server which models it serves and registers them. See [Models and the Factory](/docs/core/models-and-the-factory).

## Where igni keeps things

| Path | What |
|---|---|
| `~/.igni/config.yaml` | Your settings |
| `~/.igni/credentials.json` | Your sign-in token |
| `~/.igni/group-policy/` | What your organisation's group ships: agents, skills, hooks, settings |
| `<project>/.igni/` | The project's settings, agents, skills and commands |
| `<project>/igni.md` | The project's instructions to the agent |

The full order in which these apply is in [Configuration and precedence](/docs/core/configuration-and-precedence).

## Installing with no internet access

igni works in a network with no route to the internet: everything it needs runs on your servers. Set `air_gapped: true` — in a managed-settings file, a group's settings policy, `~/.igni/config.yaml`, or with `IGNI_AIR_GAPPED=1`. A project's own `.igni/config.yaml` cannot set it or switch it off.

In air-gap mode igni makes no outbound connections of its own:

- no update checks, and no desktop updater call except to your own `update_endpoint`;
- no web search or fetch;
- no public plugin marketplace, and no model downloads on the desktop app's first launch;
- `igni ext install`, MCP servers reached by URL, and HTTP hooks are refused unless their host is inside your network;
- the Agno framework's own run telemetry to `os-api.agno.com` stays off — it is off on every install, and in air-gap mode even an explicit `AGNO_TELEMETRY=true` is overruled;
- OpenTelemetry, if your organisation set a collector (`telemetry.otlp` in managed settings or group policy), is exported only to a collector inside your network.

A host is inside if it is a local path or `file://`, loopback, the host of your igni server, update endpoint or plugin marketplaces, or listed under `network.internal_hosts`:

```yaml
air_gapped: true
network:
  internal_hosts: ["git.acme.internal", "*.svc.acme.internal"]
```

Only user, group-policy and managed settings may set `network`; a project's config cannot widen it.

What the agent runs on a person's behalf — a shell command such as `curl` or `pip`, an MCP server started as a local process, a command hook — is an ordinary program, and your network limits it as it limits any other. Air-gap mode does not sandbox those; run igni behind a deny-all egress rule.

The managed-settings file, which a user cannot override:

| Platform | Path |
|---|---|
| macOS | `/Library/Application Support/igni/managed-settings.yaml` |
| Linux | `/etc/igni/managed-settings.yaml` |
| Windows | `%PROGRAMDATA%\igni\managed-settings.yaml` |

**The CLI** installs from your own package mirror:

```bash
python3.12 -m venv /opt/igni/venv
/opt/igni/venv/bin/pip install --index-url https://pypi.example.internal/simple \
  "igni-core[decisions]==<version>"
```

**The desktop app** cannot download its backend, so give it one. Install `igni-core[decisions]` at the app's version into a Python 3.12 environment as above, then point the app at it:

```yaml
air_gapped: true
runtime_python: /opt/igni/venv/bin/python
```

`IGNI_RUNTIME_PYTHON` in the environment does the same and wins. The app uses that interpreter as it is and downloads nothing. If it is missing or cannot import igni, the app refuses with a message naming the setting.

**The decision model** has to be copied in. On a machine that can reach Hugging Face:

```bash
HF_HOME=/tmp/laya python -m igni_core.prefetch_models
```

Then copy `/tmp/laya/hub/models--convaiinnovations--laya` into the target machine's `~/.cache/huggingface/hub`. Without it, Bypass mode asks rather than allows.

## Not finished

- **No Intel Mac build.** macOS builds are for Apple silicon only.
- **Windows and Linux builds are not code-signed.** A `.deb` or `.rpm` install does not update itself.
- **The cloud switch needs a server that offers a cloud igni.** Until one does, the app finds none and runs igni on this computer.
- **A message a `UserPromptSubmit` hook blocks leaves an old approval card up.** No run starts, and nothing on the wire says the approvals were dropped.
- **The desktop app has no headless sign-in.** The CLI signs in headlessly with `igni login --token-stdin`, as above.
- **The offline update bundle does not carry the clients.** See [Offline updates](/docs/server/offline-updates).

## Where to go next

- **[Project context, rules and memory](/docs/core/project-context-and-memory)** — what igni reads in a project before it answers.
- **[Agents and orchestration](/docs/core/agents-and-orchestration)** — the agents that ship, and how to write your own.
- **[Changes and upgrades](/docs/core/changelog)** — which version is which, where each one's release notes live, and what changed between them.
