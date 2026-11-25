# igni-core: changes and upgrades

igni-core is the backend, the `igni` command and the decisions service. It is released in lockstep with the igni app: the two share one version number, the app installs the backend at its own version, and the app's release refuses to build unless that version of igni-core is already on PyPI. The app's own changes are in [the app changelog](/docs/app/changelog); the server and the SDKs version on their own cadences.

## Version now

| Package | What it is | Repository | Version now |
|---|---|---|---|
| igni-core | the backend, the `igni` command, the decisions service | `ignite-ember/igni-core` | 1.0.5 |

**The old repository names still work.** `github.com/ignite-ember/igni` redirects to `github.com/ignite-ember/igni-app`, and Homebrew's `ignite-ember/tap` is the repository `ignite-ember/homebrew-tap`.

## What is published, and what this documentation describes

As of 2026-11-22:

| | Published | Not published |
|---|---|---|
| igni-core | `igni-core` on PyPI, at **1.0.4** and **1.0.5** — the post-split package, whose module is `igni_core` | `igni-cloud` is not on PyPI; and `ignite-ember` on PyPI is still the pre-split monolith (**1.0.3**, module `ember_code`), not yet the alias that re-exports `igni-core` |

**This documentation describes 1.0.5** — the current release, which is the version the rest of these pages are written against. Where that is ahead of what is published, this page says so. [Installing igni](/docs/app/installing-igni) carries the same note.

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
pip install 'igni-core[decisions]==1.0.5'   # the backend and the decisions service
```

`igni-core` is on PyPI now (1.0.4 and 1.0.5), so that command works today. The `ignite-ember` name, however, still serves the pre-split monolith (1.0.3) on PyPI; the alias package that re-exports `igni-core` is not published yet, so `pip install ignite-ember` does **not** give you the new backend for the moment — install `igni-core` directly. Once the alias ships, it re-exports every extra `igni-core` has, so `ignite-ember[decisions]` will install the decisions service along with the backend.

Both commands point at the same entry point, `igni_core.__main__:main`, so an existing shell alias or script keeps working.

**The cloud layer moved out.** `igni-cloud` is a separate distribution now, found through the `igni.layers` and `igni.storage` entry points: `igni.layers` names `CloudLayer`, and `igni.storage` names `PostgresStorage`. A deployment that used the shared PostgreSQL store installs it explicitly. It is not on PyPI yet either.

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

1.0.5 is the current release of igni-core, and it is published: `igni-core` **1.0.5** on PyPI. (1.0.4 was the first post-split release; 1.0.5 follows it in the same lockstep with the igni app, so the app installs `igni-core==1.0.5` on first launch and refuses to build unless that version is on PyPI.) It carries the backend side of the fixes the end-to-end test campaign turned up against the real backend, server and model, each one held by a test. The window, sign-in and approval changes that shipped in the same lockstep release are in [the app changelog](/docs/app/changelog).

## Coming from Claude Code

igni reads Claude Code's files as they are, with no configuration: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json` and `.mcp.json`. Agent files, skills, MCP configuration and hooks use the same formats, and a plugin built for Claude Code works in igni unchanged.

What differs is who does the work. Claude Code spawns sub-agents by hand, one level deep. igni has an Orchestrator that assembles a team for each task, picks the agents and the team mode — `route`, `coordinate`, `broadcast` or `tasks` — and lets any agent spawn a sub-team. You describe the task; you do not choose the agents.

See [Agents and orchestration](/docs/core/agents-and-orchestration).

## Where to go next

- **[Installing igni](/docs/app/installing-igni)** — the install commands, per platform.
- **[Your first session](/docs/app/your-first-session)** — one run, from an empty terminal to a finished task.
- **[The app changelog](/docs/app/changelog)** — the desktop app and web client's own changes.
- **[The server changelog](/docs/server/changelog)** — the API, portal and migrations.
