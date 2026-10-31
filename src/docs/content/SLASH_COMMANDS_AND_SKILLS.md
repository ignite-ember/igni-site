Anything you type that begins with `/` is a slash command. There are four kinds, and they are tried in a fixed order: the 32 built-ins compiled into the agent, markdown files you drop into a `commands/` directory, the commands your installed extensions declare, and skills — directories containing a `SKILL.md`. This page covers all four, plus output styles, which change the agent's tone rather than running anything.

You type slash commands in a client attached to a running backend (`python -m ember_code.backend`). The `igni` CLI also accepts them in one-shot mode (`igni -m "/ctx"`), with one important caveat covered at the end.

## How a command is resolved

`CommandHandler.handle` lowercases the first whitespace-separated token, treats the rest of the line as the argument string, and tries four tiers in order:

1. **Built-in registry** — the table in `backend/builtin_command_registry.py`.
2. **Markdown commands** — `.igni/commands/*.md` and friends, discovered fresh on every invocation (no caching, so you can edit a command file in another editor and the next invocation picks it up).
3. **Extension commands** — what an installed extension declares under `contributes.commands`. They come after the built-ins, so an extension cannot take `/clear`; see [Building extensions](/docs/building-extensions).
4. **Skills** — matched against the session's skill pool, only if `user-invocable` is true.

A skill loses to a markdown file of the same name. Nothing matches at all, you get `Unknown command: /foo`.

Markdown commands and skills do not "run" anything themselves. They render their body to text and return it with the `run_prompt` action; the client then sends that text to the agent as if you had typed it.

## The built-in commands

Every entry in `BuiltinCommandRegistry._build_entries()`:

| Command | What it does |
|---|---|
| `/help [topic]` | Opens the help panel, or renders one named topic |
| `/quit`, `/exit` | Ends the session (both map to the same handler) |
| `/clear` | Clears the conversation and starts a new session id |
| `/compact` | Forces a compaction pass; returns the model-written summary |
| `/ctx` | Splits the context meter into conversation vs. floor |
| `/sessions` | Lists past sessions |
| `/rename <name>` | Renames the current session |
| `/fork` | Forks the current session under a new id |
| `/model [name]` | Switches the active model |
| `/config` | Shows the merged settings |
| `/agents` | Lists and manages agents |
| `/skills` | Lists installed skills |
| `/hooks` | Lists installed hooks |
| `/mcp` | MCP server status panel |
| `/plugin <...>` | Install / update / remove a plugin |
| `/plugins` | Plugins panel |
| `/extensions` | Installed extensions and their settings |
| `/memory` | Inspect or optimise learned memories |
| `/evals` | Run evaluation suites |
| `/schedule` | One-shot or recurring tasks |
| `/loop <prompt>` | Run a prompt repeatedly |
| `/watcher` | Background-process watcher panel |
| `/bug` | Open a bug report |
| `/plan` | Toggle plan mode (read-only sandbox, plan then execute) |
| `/accept` | Toggle acceptEdits (auto-approve file edits) |
| `/bypass` | Toggle bypassPermissions — auto-approves *every* tool, no prompts |
| `/output-style [name]` | List or switch the active output style |
| `/eject <kind> <name>` | Copy a file your group ships into this project |
| `/login`, `/logout`, `/whoami` | Sign in to your igni server, sign out, and show who is signed in: `/login` dispatches an OAuth action the client's transport carries out, `/logout` clears the credentials file and falls the session back to a model with its own key, `/whoami` reports identity and token expiry |

`/artifacts` and `/codeindex` are no longer built in. Each comes with its extension — Artifacts or [CodeIndex](/docs/codeindex) — and resolves in the extension tier when that extension is switched on for you.

`/eject` takes one of five kinds — `agents`, `skills`, `commands`, `output-styles`, `workflows` — and writes your group's copy into `.igni/<kind>/` where the loaders already look. Hooks and rules are not ejectable because they are additive; there is nothing to override.

## Writing a markdown command

The file's stem is the command name: `.igni/commands/review.md` becomes `/review`. Five roots are scanned, later ones winning name collisions:

| Order | Root |
|---|---|
| 1 | `~/.claude/commands/` |
| 2 | `~/.igni/commands/` |
| 3 | your group's `commands/` from the policy cache |
| 4 | `<project>/.claude/commands/` |
| 5 | `<project>/.igni/commands/` |

The two `.claude/` rows are skipped when `rules.cross_tool_support` is false (it defaults to `true`). Files whose name starts with `.` are ignored.

```markdown
---
description: Review this branch against our standards
argument-hint: [base-branch]
allowed-tools: Read, Grep
model: igni-1.0-4b
---

Review the changes on this branch against `$ARGUMENTS`.

Diff:
!`git diff $ARGUMENTS...HEAD`

Checklist:
@../../CODE_STANDARDS.md
```

All frontmatter is optional. `description` and `argument-hint` show up in the command menu. `allowed-tools` and `model` are **parsed and exposed but not enforced** — they do not gate tools or switch models.

Three tokens are substituted, in this order:

- `$ARGUMENTS` — plain text, no quoting. Substituted first, so it can appear inside a shell token as above.
- `` !`cmd` `` — run via `/bin/sh -c`, stdout inlined. All tokens in a file run concurrently. A 30-second timeout, a non-zero exit, or a missing binary is inlined as `[error: ...]` rather than failing the command. The working directory is the project root.
- `@path` — inline a file's contents. Any extension, not just `.md`.

The `@path` rule is the one that bites: a relative path resolves against **the directory holding the command file**, not the project root. From `.igni/commands/review.md` you need `@../../CODE_STANDARDS.md` to reach the repository root. `~` and absolute paths work. A command file stored inside the project may only inline paths inside the project; one in your home directory may reference anywhere. Paths that do not resolve are left in the text as literals so you can see the broken reference.

## Skills

A skill is a directory with a `SKILL.md` in it; supporting files live alongside. Five ship with the agent, in `src/ember_code/bundled_skills/`:

| Skill | Category | Argument hint |
|---|---|---|
| `commit` | development | `[message]` |
| `explain` | development | `[file-or-directory]` |
| `migration` | operations | `<description>` |
| `pr` | operations | `[base-branch]` |
| `test-plan` | planning | `[description-or-file]` |

`resolve-issues` is no longer one of them; it ships with the CodeIndex extension.

Resolution is by explicit integer priority, highest wins: the bundled skills themselves (0), `~/.claude/skills/` (1), `~/.igni/skills/` (2), your group's (3), `<project>/.claude/skills/` (4), `<project>/.igni/skills.local/` (5, intended to be gitignored), `<project>/.igni/skills/` (6). The `.claude/` rows are loaded only when `skills.cross_tool_support` is true (default). Plugin skills land under `<plugin>:<skill>` and cannot collide with any of this.

The bundled skills load at priority 0, but project initialization also copies them into `<project>/.igni/skills/`, so in practice they resolve at priority 6 — the top of the non-plugin chain, above anything you or your group declare. To change one, edit your project's copy: the checksum sync preserves your edit and leaves a `.new` sidecar when the packaged version moves on. A same-named skill in `~/.igni/skills/` will not win.

Frontmatter and its defaults:

| Key | Default | Meaning |
|---|---|---|
| `name` | directory name | Invoked as `/<name>` |
| `description` | `""` | Shown in menus; also fed to the agent |
| `version` | `0.1.0` | Informational |
| `category` | `development` | Groups the listing (`development`, `review`, `planning`, `operations`, then anything else alphabetically) |
| `argument-hint` | `""` | Completion hint |
| `context` | `inline` | `fork` requests a sub-agent |
| `agent` | unset | Which agent, when `context: fork` |
| `user-invocable` | `true` | `false` hides it from `/name` dispatch |

The body supports `$ARGUMENTS`, positional `$1`…`$N`, `${IGNI_SKILL_DIR}` (also spelled `${CLAUDE_SKILL_DIR}`), and `${IGNI_SESSION_ID}`. It does **not** support `` !`cmd` `` or `@path` — those are markdown-command features only. The bundled `commit` skill contains `` !`git status` ``; the agent receives that text verbatim and runs the command itself as part of following the instructions.

`context: fork` and `agent:` are honoured by `SkillExecutor`, which the slash path does not use: `SkillCommandDispatcher` renders the body and hands it to the main agent regardless. Treat them as declarative for now.

When `skills.auto_trigger` is true (default), every skill's name, hint and description is appended to the agent's system prompt under `## Available Skills`, with an instruction to prefer a skill over improvising. Turn it off and the agent stops being told they exist; typing `/name` still works.

## Output styles

An output style is a markdown file whose body is appended to the agent's instructions as a `# Output style: <name>` block. Switching replaces the block in place — no agent rebuild, effective on the next turn. Setting a style with an empty body removes the block entirely.

Files live in `output-styles/` under the same roots as commands, with the same precedence, plus `<plugin>/output-styles/` at the top. Frontmatter is `name` (defaults to the filename stem) and `description`.

```markdown
---
name: tight
description: Minimal prose, no preamble.
---

Lead with the answer. No preambles, no summaries of what you just did.
```

Nothing is packaged with the agent — discovery is purely filesystem. On startup the session selects `default` if a style of that name was found, otherwise the alphabetically first, otherwise none. Nothing is scaffolded on init either — project initialization provisions bundled agents, skills and hooks, but never output styles — so a fresh project starts with none and `/output-style` reports `(none configured)` until you write a style file yourself.

`/output-style` with no argument (or `list`) lists; `status` or `show` reports the active one; anything else is treated as a style name, so `/output-style explanatory` and `/output-style set explanatory` do the same thing.

## Letting the agent run commands

The agent has a `slash_command` tool that dispatches through the same handler. Nine commands are refused with an explanatory error instead of running: `/quit`, `/exit`, `/clear`, `/login`, `/logout`, `/model` — they would end the session, invalidate the turn, or need a human — and `/plan`, `/accept`, `/bypass`, because an agent that could change its own permission mode could grant itself the approval it was meant to ask for. `/compact` is deliberately *not* blocked; a long-running agent deciding to compact itself is the intended behaviour.

## Two limits worth knowing

`igni -m "/commit"` is not the same as typing `/commit` in a client. The one-shot path dispatches the command, prints the result, and returns without ever calling the model — so a markdown command or skill prints its rendered instructions rather than carrying them out. Built-in informational commands (`/ctx`, `/config`) work fine this way.

Markdown-command shell tokens run with no confirmation and no permission check. A `.igni/commands/` file is executable content; review one before invoking it the same way you would a shell script.
