Before igni sends your first message to a model, it assembles a block of instructions from files on disk: org policy, your own global rules, the repo's committed rules, directory-specific rules, and a memory index carried over from earlier sessions. This page says which files, in what order, and where the state that outlives a session is stored. Read it if you are writing rules for a repo, or working out why a rule you wrote is being ignored.

## The tiers, in load order

Every tier is read, every tier that produces text becomes one section, and the sections are concatenated. Nothing is ranked or deduplicated — later text does not replace earlier text, it just comes later.

| # | Section heading | Read from | Committed? |
|---|---|---|---|
| 1 | `# Managed Policy` | platform policy dir (see below) | sysadmin-owned |
| 2 | `# Memory Index` | `~/.igni/projects/<slug>/memory/MEMORY.md` | no, per-machine (in the cloud, the shared database) |
| 3 | `# User Rules` | `~/.igni/rules.md`, then `~/.igni/rules/*.md`, then `~/.claude/rules/*.md` | no, per-machine |
| 4 | `# Project Rules` | `igni.md` and friends at the repo root | yes |
| 5 | `# Project Shared Rules` | `<project>/.igni/rules/*.md`, then `<project>/.claude/rules/*.md` | yes |
| 6 | `# Directory Rules (<path>/)` | rules files in subdirectories | yes |

Each section renders as `# <heading>`, a blank line, then the body; sections are joined with `\n\n---\n\n`. A tier that finds nothing contributes no section at all — there are no empty headers.

Managed policy lives in a write-protected directory: `/Library/Application Support/igni` on macOS, `/etc/igni` on Linux, `%PROGRAMDATA%\igni` (default `C:\ProgramData\igni`) on Windows. On any other platform there is no managed tier at all.

## Filenames, and the personal override

In every directory that is scanned for a context file, igni checks six names in this exact order:

```
igni.md
igni.local.md
ember.md          # the name the file had before the product was named
ember.local.md
CLAUDE.md         # cross-tool
CLAUDE.local.md
```

Each committed file is immediately followed by its `.local.md` sibling. That pairing is the whole personal-versus-shared story: commit `igni.md`, gitignore `igni.local.md`, and your own additions land right after the team's at the same level rather than at the end of the whole block. All found files are concatenated — a `.local.md` does not suppress its partner.

`ember.md` and the two `CLAUDE.md` variants are read, not migrated. Nothing has to be renamed for a repo that already has one.

The `CLAUDE.md` / `.claude/` reads are the only ones you can turn off, with one setting that gates all of them:

```yaml
# .igni/config.yaml  — or ~/.igni/config.yaml
rules:
  cross_tool_support: true   # default
```

## A worked layout

```
my-repo/
├── igni.md                      # team rules — committed
├── igni.local.md                # your rules — gitignore this
├── .igni/
│   ├── rules/
│   │   ├── style.md             # no frontmatter → always applies
│   │   └── migrations.md        # paths: ["db/**"] → only when working in db/
│   ├── settings.json            # committed
│   ├── settings.local.json      # gitignored
│   └── TODO.md                  # appended to instructions if present
└── services/billing/
    └── igni.md                  # arrives when a tool touches this directory
```

On the first run in a project, igni writes a starter `igni.md` (headings for Overview, Tech Stack, Architecture, Conventions, Domain Terminology), a commented `.igni/config.yaml` and a `.igni/settings.local.json`, then drops the marker `.igni/.initialized` so it never does it again. This happens inside session startup — there is no `igni init` subcommand. (`igni ext init` exists, but it scaffolds an extension, not a project.)

## Scoping context to a directory

Two mechanisms, and they behave differently.

**A rules file in a subdirectory.** At session start igni walks the project tree once and indexes every `igni.md`-family file below the root (skipping `.git`, `node_modules`, `dist`, `build`, `.venv`, `__pycache__`, `.igni`, `.claude` and similar). These are *not* in the startup prompt. When a tool call references a path — any of the arguments `file_path`, `path`, `filename`, `directory`, `dir` — the rules files between that path and the project root are appended to that tool's result inside a `<discovered-rules path="...">` block, shallowest first. Each file is delivered **once per session**; a second tool call in the same subtree gets nothing.

**A `paths:` glob in a rules directory.** Files under `.igni/rules/` or `~/.igni/rules/` may carry YAML frontmatter:

```markdown
---
paths: ["db/**", "alembic/**"]
---

Never edit a migration that has already been applied. Write a new one.
```

Globs are matched with `fnmatch` against both the absolute working directory and its project-relative form, so `db/**` and `/abs/path/to/repo/db/**` both work. Note `fnmatch` is not `glob`: `**` does not recurse specially, and `docs/**/*.md` matches `docs/foo.md` as happily as `docs/a/b.md`. A file with no `paths:` key applies unconditionally.

At tool-call time igni watches the project's `.igni/rules/` and `.claude/rules/`, plus `~/.igni/group-policy/rules/` when your organisation's group ships rules of its own. Your personal home directories are not watched. A `paths:`-scoped file under `~/.igni/rules/` or `~/.claude/rules/` is therefore never delivered: the eager user tier skips it (there is no working directory), and the lazy index does not scan the home directories at all. Put path-scoped rules in the repo.

## `@` imports

Any `@some/file.md` token in a rules file is replaced by that file's contents, recursively, to a depth of 4. Tokens inside backticks or fenced code blocks are left alone, so a rules file can document the syntax without triggering it. Imports are sandboxed: a token resolving outside the allowed root is left as literal text, as is a missing file or a cycle. The root is the project root for `igni.md` files, the rules directory itself for `rules/*.md` files, and the managed directory for managed policy — so a managed policy cannot reach into your repo, and a repo rule cannot reach into `/etc`.

## What persists between sessions

**Auto-memory.** Per project, at `~/.igni/projects/<slug>/memory/`, where `<slug>` is the absolute project path with `/` replaced by `-` (`/Users/x/proj` → `-Users-x-proj`). Each memory is its own `.md` file with `name` / `description` / `metadata.type` frontmatter; `MEMORY.md` is an index of one-line pointers to them. The agent is told, on every run, how to write these and that memory types are `user`, `feedback`, `project` and `reference` — and told *not* to save code patterns, architecture, file paths, git history or anything already in `igni.md`, since all of that is derivable by reading the repo.

That is the desktop. In the cloud, where a person's igni runs in a [Fleet](/docs/fleet) VM that can be lost, each memory file is a row in the shared database. The memory directory is still there and the agent still writes it with its ordinary file tools; it is filled from the database at session start, and every file written, changed or removed is written back after each tool call.

Only the first **200 lines or 25,000 bytes** of `MEMORY.md` reach the prompt, whichever cap hits first. The rest of the file stays on disk but is invisible until the agent reads it explicitly. Keep the index dense.

If there is no igni-native `MEMORY.md` and cross-tool support is on, `~/.claude/projects/<slug>/memory/MEMORY.md` is read instead. That path is read-only: igni never writes there.

**Session history.** On the desktop, SQLite, at `<data_dir>/projects/<project_id>/state.db` (tables `ember_sessions`, `ember_memories`), with `data_dir` defaulting to `~/.igni` (`~/.ember` on a machine not yet migrated). When `storage.database_url` or `IGNI_DATABASE_URL` is set — as it is in the cloud — state is kept in that database, PostgreSQL, instead; `igni migrate` brings its schema up to date. Here `<project_id>` is a *different* identity from the memory slug: the first 16 hex characters of the SHA-256 of the repo's `git remote get-url origin`, falling back to the absolute path when there is no remote. Resume with `igni -c` for the most recent session, or `igni --session-id <id>`.

## Limits worth knowing

- **`context.project_file` does not change which files load.** It exists in the config schema with the default `igni.md`, and the root loader discards it: the six filenames above are fixed. It is still read in two places — the startup tip that suggests creating the file, and the rules loaded for an extra workspace added with `--add-dir`.
- **Subdirectory rules never appear at session start.** They arrive only after a tool call touches a path under them. A one-shot `igni -m "..."` that touches nothing in `services/billing/` will not have read `services/billing/igni.md`.
- **A `paths:`-scoped rule is skipped whenever there is no working directory**, which is the case during the startup load — and no caller ever passes one. Scoped rules reach the model only through the lazy path, which watches the project's rules directories only.
- **Nothing resolves conflicts.** All tiers concatenate. Two rules files that contradict each other both end up in the prompt.
- Every read is tolerant by design: a missing or unreadable rules file yields empty text and no error. A permissions mistake on `~/.igni/rules/` is silent.

## Settings, for comparison

Context files concatenate; settings do not — they merge, and later tiers win:

```
~/.igni/config.yaml  →  ~/.igni/settings.json  →  ~/.igni/settings.local.json
  →  .igni/config.yaml  →  .igni/settings.json
  →  .igni/config.local.yaml  →  .igni/settings.local.json
  →  CLI flags  →  group policy  →  managed policy
  →  IGNI_AIR_GAPPED, IGNI_DATABASE_URL
```

Managed policy sits above CLI flags deliberately: an org policy cannot be overridden by adding a flag. The two environment variables are applied after the merge, so they beat every file. In the cloud the local files are not read at all. [Configuration and precedence](/docs/configuration-and-precedence) has the detail.

## Where to go next

- **[Configuration and precedence](/docs/configuration-and-precedence)** — the whole order, in one place.
- **[Agents and orchestration](/docs/agents-and-orchestration)** — who reads this context, and how work is handed to a team.
- **[Your first session](/docs/your-first-session)** — the files igni writes in a folder the first time it runs there.
