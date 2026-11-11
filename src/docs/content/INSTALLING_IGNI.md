igni reaches a developer in two forms: the **desktop app**, which is how a person uses it, and the **CLI**, for scripts and CI. Both run the same agent on the developer's own machine and talk to your igni server for sign-in and models. This page covers installing each, signing in, and installing on a machine with no internet access. There are no IDE plugins; the desktop app and the CLI are the clients.

> **Note:** This documentation describes **1.0.4**, which is not published yet. Today PyPI serves `ignite-ember` **1.0.3** — the pre-split monolith, whose module is `ember_code` and which keeps its files in `~/.ember`. The package `igni-core` is not on PyPI, so `pip install igni-core` does not work yet, and `pip install ignite-ember` gives you 1.0.3. The next release keeps its files in `~/.igni` and moves an existing `~/.ember` there on first start. [Changes and upgrades](/docs/changes-and-upgrades) has the whole version story.

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

Later launches start straight away. If the backend is damaged, **Reinstall Backend (Clean)** in the app's menu starts again; **Diagnose Backend** reports what it found.

The app does not put an `igni` command on your `PATH`. Install the CLI separately if you want one.

### Updates

The macOS app checks for updates when it connects and installs them itself. The Windows and Linux builds do not update themselves yet; install each new release by hand.

| Setting | Effect |
|---|---|
| `update_check_ttl: 0` | No update checks at all. |
| `update_endpoint: https://…/latest.json` | Check a release mirror inside your network instead of GitHub. |
| `air_gapped: true` | No request unless `update_endpoint` names a mirror. |

Set these in `~/.igni/config.yaml`, in the managed-settings file, or in a group's settings policy. Managed settings win, then group policy, then the user file.

## The CLI

```bash
pip install igni-core
```

The package is **`igni-core`** — the name igni's backend and CLI were renamed to when the monolith was split. From 1.0.4 the old name keeps working through an alias package that carries metadata and nothing else and depends on `igni-core` at the same version, so `pip install ignite-ember` resolves to the same thing. Until 1.0.4 is published, `pip install ignite-ember` gives you 1.0.3, the pre-split monolith. Either way it needs **Python 3.12** exactly. It installs the command `igni`, and `ignite-ember` as an alias.

There is also a Homebrew formula:

```bash
brew install ignite-ember/tap/ignite-ember
```

It installs the published 1.0.3, and it puts the `ignite-ember` command on your `PATH` — not `igni`.

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

Other flags set the permission mode (`--read-only`, `--accept-edits`, `--auto-approve`, `--strict`), turn off web tools (`--no-web`), work in a git worktree (`--worktree`) or add directories (`--add-dir`). See [Permissions and safety](/docs/permissions-and-safety).

Four subcommands exist: `igni ext`, for [extensions](/docs/building-extensions); `igni login`, which signs in to your igni server; `igni migrate`, which migrates igni's own database; and `igni trust`, which records whether a folder may run its own code.

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

Neither client asks for a server address if you have published one. A developer types their work email; igni looks up the address's domain and finds your server from a record you publish, either the file `https://<domain>/.well-known/igni.json` or the DNS TXT record `_igni.<domain>`. How to publish it is in [Administering your organisation](/docs/administering-your-organisation). Without a record, the app asks "Where is your igni?" and takes a URL.

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

After sign-in, the client asks your server which models it serves and registers them. See [Models and the Factory](/docs/models-and-the-factory).

## Where igni keeps things

| Path | What |
|---|---|
| `~/.igni/config.yaml` | Your settings |
| `~/.igni/credentials.json` | Your sign-in token |
| `~/.igni/group-policy/` | What your organisation's group ships: agents, skills, hooks, settings |
| `<project>/.igni/` | The project's settings, agents, skills and commands |
| `<project>/igni.md` | The project's instructions to the agent |

The full order in which these apply is in [Configuration and precedence](/docs/configuration-and-precedence).

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
- **Windows and Linux builds are not code-signed and do not update themselves.**
- **The desktop app has no headless sign-in.** The CLI signs in headlessly with `igni login --token-stdin`, as above.
- **The offline update bundle does not carry the clients.** See [Offline updates](/docs/offline-updates).

## Where to go next

- **[Project context, rules and memory](/docs/project-context-and-memory)** — what igni reads in a project before it answers.
- **[Agents and orchestration](/docs/agents-and-orchestration)** — the agents that ship, and how to write your own.
- **[Changes and upgrades](/docs/changes-and-upgrades)** — which version is which, where each one's release notes live, and what changed between them.
