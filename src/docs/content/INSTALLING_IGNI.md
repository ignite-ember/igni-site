igni reaches a developer in two forms: the **desktop app**, which is how a person uses it, and the **CLI**, for scripts and CI. Both run the same agent on the developer's own machine and talk to your igni server for sign-in and models. This page covers installing each, signing in, and installing on a machine with no internet access. There are no IDE plugins; the desktop app and the CLI are the clients.

> **Note:** The current release is 1.0.3, which keeps its files in `~/.ember`. The next release keeps them in `~/.igni` and moves an existing `~/.ember` there on first start. This documentation describes the next release.

## The desktop app

The app is called **igni**. It is a Tauri application that shows igni's web interface and runs igni's backend beside it on your machine.

| Platform | Files | Notes |
|---|---|---|
| macOS | `.dmg` | Apple silicon only. macOS 26 or later. Signed with a Developer ID and notarised. |
| Windows | `.msi`, `.exe` | Not code-signed: Windows shows an "unknown publisher" prompt on first launch. |
| Linux | `.AppImage`, `.deb`, `.rpm` | |

Builds are attached to each release at [github.com/ignite-ember/igni/releases](https://github.com/ignite-ember/igni/releases).

**On first launch it installs its own backend.** The app downloads `uv`, uses it to install Python 3.12, creates a private virtual environment, installs `ignite-ember[decisions]` at the app's own version, and downloads igni's decision model (about 1.7 GB). It needs network access for this, and at least 1 GB free before it starts. Everything lands in a per-user cache:

| Platform | Cache |
|---|---|
| macOS | `~/Library/Caches/ember-code` |
| Linux | `$XDG_CACHE_HOME/ember-code` |
| Windows | `%LOCALAPPDATA%\ember-code` |

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
pip install ignite-ember
```

The package is `ignite-ember`. It needs **Python 3.12** exactly. It installs the command `igni`, and `ignite-ember` as an alias. There is also a Homebrew formula:

```bash
brew install ignite-ember/tap/ignite-ember
```

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

Two subcommands exist: `igni ext`, for [extensions](/docs/building-extensions), and `igni migrate`, which migrates igni's own database.

## Signing in

Neither client asks for a server address if you have published one. A developer types their work email; igni looks up the address's domain and finds your server from a record you publish, either the file `https://<domain>/.well-known/igni.json` or the DNS TXT record `_igni.<domain>`. How to publish it is in [Administering your organisation](/docs/administering-your-organisation). Without a record, the app asks "Where is your igni?" and takes a URL.

Sign-in then opens **your** deployment's sign-in page in a browser, with whichever methods you enabled. Picking an organisation gives the client a token for 30 days. The CLI writes it to `~/.igni/credentials.json` with mode `0600`.

The CLI's settings point it at the server:

```yaml
# ~/.igni/config.yaml
api_url: https://igni.example.com
# portal_url is worked out from api_url when not set
```

**There is no headless sign-in.** `/login` opens a browser, no environment variable supplies a token, and there are no machine accounts. To run the CLI in CI, sign in once on a machine with a browser and copy `~/.igni/credentials.json` across. The token expires after 30 days.

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
  "ignite-ember[decisions]==<version>"
```

**The desktop app** cannot download its backend, so give it one. Install `ignite-ember[decisions]` at the app's version into a Python 3.12 environment as above, then point the app at it:

```yaml
air_gapped: true
runtime_python: /opt/igni/venv/bin/python
```

`IGNI_RUNTIME_PYTHON` in the environment does the same and wins. The app uses that interpreter as it is and downloads nothing. If it is missing or cannot import igni, the app refuses with a message naming the setting.

**The decision model** has to be copied in. On a machine that can reach Hugging Face:

```bash
HF_HOME=/tmp/laya python -m ember_code.prefetch_models
```

Then copy `/tmp/laya/hub/models--convaiinnovations--laya` into the target machine's `~/.cache/huggingface/hub`. Without it, Bypass mode asks rather than allows.

## Not finished

- **No Intel Mac build.** macOS builds are for Apple silicon only.
- **Windows and Linux builds are not code-signed and do not update themselves.**
- **No headless sign-in** for CI, as above.
- **The offline update bundle does not carry the clients.** See [Offline updates](/docs/offline-updates).

## Where to go next

- **[Project context, rules and memory](/docs/project-context-and-memory)** — what igni reads in a project before it answers.
- **[Agents and orchestration](/docs/agents-and-orchestration)** — the agents that ship, and how to write your own.
