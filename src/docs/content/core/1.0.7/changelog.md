# igni-core: changes and upgrades

igni-core is the backend, the `igni` command and the decisions service. It is released in lockstep with the igni app: the two share one version number, the app installs the backend at its own version, and the app's release refuses to build unless that version of igni-core is already on PyPI. The app's own changes are in [the app changelog](/docs/app/changelog); the server and the SDKs version on their own cadences.

## Version now

| Package | What it is | Repository | Version now |
|---|---|---|---|
| igni-core | the backend, the `igni` command, the decisions service | `ignite-ember/igni-core` | 1.0.7 |

**The old repository names still work.** `github.com/ignite-ember/igni` redirects to `github.com/ignite-ember/igni-app`, and Homebrew's `ignite-ember/tap` is the repository `ignite-ember/homebrew-tap`.

## What is published, and what this documentation describes

| | Published | Not published |
|---|---|---|
| igni-core | `igni-core` on PyPI, at **1.0.4**, **1.0.5**, **1.0.6** and **1.0.7** — the post-split package, whose module is `igni_core` | `igni-cloud` is not on PyPI. `ignite-ember` on PyPI is the alias that installs `igni-core`, but only at **1.0.4**: `pip install ignite-ember` gives you igni-core 1.0.4, not the current release |

**This documentation describes 1.0.7** — the current release, which is the version the rest of these pages are written against. There is no separate 1.0.6 snapshot: what 1.0.6 changed is below, and these pages include it. [Installing igni](/docs/app/installing-igni) carries the same note.

## igni-core 1.0.4: the package and the module were renamed

The monolith was split. igni's backend and CLI are now the **`igni-core`** distribution, and the module every import uses is **`igni_core`**. The old names are the ones people still have in their scripts:

| | Before | After |
|---|---|---|
| Package on PyPI | `ignite-ember` | `igni-core` (canonical), with `ignite-ember` as an alias |
| Python module | `ember_code` | `igni_core` |
| Command | `ignite-ember`, and `igni` beside it | `igni` — and `ignite-ember` keeps working as an alias of it |
| Cloud layer | inside the monolith | its own package, `igni-cloud` |

The alias package is not a fork. It carries metadata and nothing else, and depends on `igni-core` at the same version:

```bash
pip install 'igni-core[decisions]==1.0.7'   # the backend and the decisions service
```

The alias re-exports every extra `igni-core` has, so `ignite-ember[decisions]` installs the decisions service along with the backend. It is published only at **1.0.4**, though, so `pip install ignite-ember` gives you igni-core 1.0.4. Install `igni-core` directly for the current release.

In 1.0.4 both commands pointed at the same entry point, `igni_core.__main__:main`. **From 1.0.5, `igni-core` installs only `igni`**: a script or shell alias that still calls `ignite-ember` has to call `igni`.

**The cloud layer moved out.** `igni-cloud` is a separate distribution now, found through the `igni.layers` and `igni.storage` entry points: `igni.layers` names `CloudLayer`, and `igni.storage` names `PostgresStorage`. A deployment that used the shared PostgreSQL store installs it explicitly. It is not on PyPI. It shares igni-core's version and pins `igni-core` at that version.

**The decisions service stays in the core**, behind the `decisions` extra: `python -m igni_core.decisions_server`. Leave the extra out on a backend whose `IGNI_DECISIONS_URL` points at a shared one.

### What to change in your own code

| Was | Is now |
|---|---|
| `from ember_code...` | `from igni_core...` |
| `python -m ember_code.backend` | `python -m igni_core.backend` |
| `pip install ignite-ember` | `pip install igni-core` (or leave it: the alias resolves) |
| `ignite-ember -m "..."` | `igni -m "..."` |

**Nothing imports the old package any more, and the old package stays where it was installed.** Upgrading puts the new backend in the same environment; it does not remove what was there.

### The Python version

igni-core requires **Python 3.12 exactly** — `>=3.12,<3.13`. Not a floor. The desktop app ships 3.12 and installs 3.12, and the failure mode on any other version is silent rather than loud.

## Where igni keeps things: `~/.ember` became `~/.igni`

The directory was called `.ember` because the package still was. The new release renames it, once, without losing anything:

| | Before | After |
|---|---|---|
| Home | `~/.ember/` | `~/.igni/` |
| Project | `<project>/.ember/` | `<project>/.igni/` |
| Project instructions | `<project>/ember.md` | `<project>/igni.md` |

The rename is deliberately boring, because the home directory holds `credentials.json` and `client_state.db` — a half-finished rename signs somebody out, and a rename that never happens makes a working install look like a fresh one:

- **Rename, never merge.** If the destination already exists, both are left alone. Two directories with overlapping state is worse than being asked to pick one.
- **Never follow a symlink.** A symlinked `.ember` is left for somebody who knows where it points.
- **It never fails a session.** A migration that cannot run does not stop igni starting; the legacy directory stays and the next run tries again.
- **The fallback is the real guarantee.** Even where the rename never ran, igni reads the legacy directory when the new one is absent. The rename is tidiness; the fallback is correctness.

`ember.md` and `igni.md` are both read, so a project that still has `ember.md` keeps working. A new project gets `igni.md`.

## igni-core 1.0.5

1.0.5 followed 1.0.4, the first post-split release, in the same lockstep with the igni app, so the app installs `igni-core==1.0.5` on first launch and refuses to build unless that version is on PyPI. It carries the backend side of the fixes the end-to-end test campaign turned up against the real backend, server and model, each one held by a test. The window, sign-in and approval changes that shipped in the same lockstep release are in [the app changelog](/docs/app/changelog).

## igni-core 1.0.6

1.0.6 carries the backend half of the desktop app's new sidebar and Files viewer, and of the Local / Cloud switch. The release notes are [docs/releases/v1.0.6.md](https://github.com/ignite-ember/igni-core/blob/main/docs/releases/v1.0.6.md) in igni-core. What a user notices:

- **The sidebar knows what every chat is doing.** Every window is told, as it happens, which chats are running, which wait on the person and which have an approval pending. A chat whose run finished while the person was elsewhere is **unread** until they open it. What the person has seen is kept in the global database, so it follows them across windows, devices and VMs and survives a restart. Chats are listed newest first by their **last message**, and a message sent into a chat moves it to the top before the reply starts.
- **A changed `.mcp.json` takes effect without a restart.** Every `ensure_mcp` call re-reads the `.mcp.json` files, the first one included. A later call reconnects only the servers whose config changed and drops the removed ones. See [Tools, MCP and language servers](/docs/core/tools-mcp-and-language-servers#connecting-an-mcp-server).
- **Images and PDFs can be previewed, and search reaches every chat.** `read_file_bytes` reads a file as bytes (base64, with a media type, up to 10 MiB) inside the same sandbox as `read_file`. `search_all_chats` finds text in every chat of the project, newest chat first, and each hit names its chat. A plugin's category reaches the client, so the marketplace can filter and sort by it.
- **The backend half of the Local / Cloud switch.** A group's signed policy carries a `mode`: `local`, `cloud` or `local_and_cloud` (what a missing or unknown mode means). In `cloud` mode igni does not run on the person's computer and says *"Your organisation runs igni for you in the cloud."* `--account-only` runs a backend that only signs in and syncs the group's policy, for the desktop app in cloud mode. Extension pages reach a cloud VM through the gateway. See [Configuration and precedence](/docs/core/configuration-and-precedence#where-igni-runs-the-group-s-mode).
- **Cancelling a run that waits on an approval ends it.** Its pending approvals are dropped, and answering one later no longer runs the tool. A new message drops the approvals of a paused run too. While a session waits on a person, only someone who may answer the approval may cancel the run or write into the session. Every lane of a workflow can ask for approval.
- **The `gemini` provider works.** Every array in a tool schema gets an `items` field at the Gemini boundary.
- **An unknown `--model` is refused before a session starts**, once, on stderr, with exit code 1, and no failed run is saved. See [Troubleshooting](/docs/core/troubleshooting).
- **The LSP tool sends notifications as notifications** (no id), so `textDocument/didOpen` opens the document and diagnostics come back.
- **A headless run hears the conditions an extension reports**, so an extension's `when:` prompt overrides apply to `igni -m` and `--pipe` too.
- **igni-core and igni-cloud install together again**, at the same version. ripgrep installs from a wheel on Ubuntu 22.04, `igni ext init` runs on a Windows console, and headless output is no longer wrapped at 80 columns.

For integrators: new RPC methods `read_file_bytes`, `search_all_chats`, `list_session_states`, `mark_session_seen` and `report_visualization_verdict`; a new push channel `session_states_changed`; `list_sessions` rows add `unread` and `last_message_at`; new host-model members `host.sessions.states`, `host.sessions.mark_seen()`, the `sessions.states_changed` signal, `host.chat.search_all()` and `host.workspace.read_bytes()`. A database migration adds the `ember_session_reads` table to the global database: a local backend applies it the first time it opens the database, and in the cloud `igni migrate` applies it.

## igni-core 1.0.7

1.0.7 is the current release, and a small one: igni notices when a message is pleased or displeased with it, and tells every window and every extension. Nothing else changed, and no model-facing text changed. The release notes are [docs/releases/v1.0.7.md](https://github.com/ignite-ember/igni-core/blob/main/docs/releases/v1.0.7.md).

- **When a person sends a chat message, the local Laya decisions model is asked how it feels about igni.** Thanks and praise count as positive; an insult, frustration, or saying igni is wrong or did not do what was asked counts as negative. Only a positive or a negative reading is sent, and only when Laya is at least 60% sure. A neutral message sends nothing.
- **The run never waits for it.** The question is asked in the background. If Laya is not installed, cannot answer or takes longer than a minute, nothing is sent. A message that is empty or longer than 1,200 characters is not asked about.
- **The reading says which turns it is about, and why.** It names the run the message started and the run of igni's last reply before it, and carries Laya's answers to six more questions, each with every label's probability.

Without the `[decisions]` extra, igni works as before and sends no readings. The push channel and the host-model signal are described in [Building extensions](/docs/core/building-extensions#how-a-message-feels-about-igni).

## Coming from Claude Code

igni reads Claude Code's files as they are, with no configuration: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json` and `.mcp.json`. Agent files, skills, MCP configuration and hooks use the same formats, and a plugin built for Claude Code works in igni unchanged.

What differs is who does the work. Claude Code spawns sub-agents by hand, one level deep. igni has an Orchestrator that assembles a team for each task, picks the agents and the team mode — `route`, `coordinate`, `broadcast` or `tasks` — and lets any agent spawn a sub-team. You describe the task; you do not choose the agents.

See [Agents and orchestration](/docs/core/agents-and-orchestration).

## Where to go next

- **[Installing igni](/docs/app/installing-igni)** — the install commands, per platform.
- **[Your first session](/docs/app/your-first-session)** — one run, from an empty terminal to a finished task.
- **[The app changelog](/docs/app/changelog)** — the desktop app and web client's own changes.
- **[The server changelog](/docs/server/changelog)** — the API, portal and migrations.
