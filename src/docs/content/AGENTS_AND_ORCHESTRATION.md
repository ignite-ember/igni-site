igni does its work through one main agent that holds the conversation plus a pool of specialists it hands subtasks to. A specialist is a markdown file — YAML frontmatter and a system prompt — so adding one is a file, not code. This page covers what ships, the file format the loader actually parses, where your own definitions go, how work is routed, and the limits that govern delegation.

Delegation only happens inside a running session, which means a one-shot `igni -m "..."` run, a piped `igni -p` run, or a backend (`python -m igni_core.backend`) with a client attached.

## What ships

`src/igni_core/bundled_agents/` holds 11 agents, one `.md` file each. Session startup calls `ProjectInitializer.initialize`, which copies each file into `<project>/.igni/agents/` and records its checksum. On a later upgrade, a copy you never touched is overwritten in place; a copy you edited is left alone and the new package version lands beside it as `<name>.md.new` for you to diff. When your group ships its own agents, the bundled ones are not copied at all.

| agent | declared tools | for |
|---|---|---|
| `architect` | `WebSearch, Bash` | design blueprints and ordered plans; read-only — produces the design, not the edit |
| `debugger` | `Edit, Bash` | reproduces failures, traces stack traces, fixes the root cause |
| `docs` | `Write, Edit, Bash` | README, TODO, CHANGELOG, `docs/` |
| `editor` | `Write, Edit, Bash` | the primary coding agent — implementation, bug fixes, refactoring |
| `explorer` | `WebFetch, WebSearch, Bash` | traces execution paths and maps layers; read-only |
| `plan_researcher` | `Bash, WebFetch, WebSearch` | spawned by `enter_plan_mode`; returns Findings / Proposed Plan / Tasks (JSON) / Confidence / Open Questions |
| `qa` | `Write, Edit, Bash` | generates tests and finds coverage gaps |
| `reviewer` | `WebFetch, WebSearch, Bash` | bugs, security, performance, style |
| `security` | `WebSearch, Bash` | vulnerabilities, insecure patterns, hardcoded secrets |
| `simplifier` | `Edit, Bash` | cleanup that preserves behaviour |
| `visualizer` | `Visualize` | renders data the caller hands it as charts/tables/dashboards; never invents data |

Two agents you may have seen are no longer bundled. `archivist` ships with the Artifacts extension and `data-architect` with the CodeIndex extension; each exists only while its extension runs. See [Artifacts](/docs/artifacts) and [CodeIndex](/docs/codeindex).

The tool names are a short, closed list. The registry catalog has eight entries — `Write`, `Edit`, `Bash` (alias `BashOutput`), `WebSearch`, `WebFetch`, `Schedule`, `NotebookEdit`, `Visualize` — plus one reserved name, `Orchestrate`, that parses but builds no toolkit. **There is no `Read`, `Grep`, `Glob` or `LS` tool.** Reading and searching go through `Bash` (`cat`, `rg`, `find`). No agent is given a toolkit because of its name: an extension's agents reach the extension's tools over MCP. Any agent that resolved at least one tool also silently gets `ScheduleTools`.

## Agents an extension replaces

An extension can ship `<agent>.<variant>.md` in its plugin. While the extension runs, that file *is* the agent: it loads under the plain name at priority 6, above everything in your project, and replaces the bundled one. When the extension stops, the plain agent comes back. CodeIndex uses this to replace `explorer` and `plan_researcher` while its index covers `HEAD`. An agent that only an extension ships, such as `data-architect`, is not in the pool at all without it, and spawning it returns an error. See [Building extensions](/docs/building-extensions).

## The agent file format

Everything between the opening and closing `---` is YAML; everything after is the system prompt.

```markdown
---
name: migrations
description: Writes and reviews Alembic migrations against the live schema.
tools: Edit, Bash
color: blue
reasoning: true
reasoning_min_steps: 2
reasoning_max_steps: 8
tags:
  - database
  - migrations
mcp_servers:
  - postgres
---

You write Alembic migrations. Before writing one, read the model it
derives from and confirm the current head with `alembic current`.
```

| key | default | effect |
|---|---|---|
| `name` | — | **required**; the key callers spawn by. Missing → the file is rejected |
| `description` | — | **required**; shown to the delegating agent when it picks a specialist |
| `tools` | `[]` | YAML list or comma-separated string of registry names |
| `model` | provider default | overrides `models.default` for this agent only |
| `color` | none | passed to the agents panel |
| `reasoning` | `false` | turns on Agno's reasoning loop |
| `reasoning_min_steps` | `1` | ignored unless `reasoning: true` |
| `reasoning_max_steps` | `10` | ignored unless `reasoning: true` |
| `tags` | `[]` | list or comma-separated string; passed to the panel |
| `can_orchestrate` | `true` | the agent gets its own spawn tools, one level down — see the nesting limit below |
| `mcp_servers` | `[]` | empty means *every* connected MCP client; a list is a whitelist |
| `temperature` | provider default | applied to the resolved model |
| `max_tokens` | provider default | per-agent output cap; the `visualizer` sets `32000` because its reply *is* the payload |
| `max_turns` | `null` | parsed and stored, read by nothing |

One honest caveat: `max_turns` is inert — `markdown.py` and `schemas.py` are its only occurrences in the package.

Failures are soft. A file with no frontmatter, broken YAML, or a missing `name`/`description` becomes a `LoadError` in the report and a warning in the log; the rest of the directory still loads. A tool name the registry does not know does *not* fail the load either — `Session._check_agent_tools` logs a warning at startup and the panel marks it under `unknown_tools`. The actual failure arrives the first time anything *spawns* that agent, not when the tool is used: the pool builds agents lazily, `registry.resolve` raises `ValueError: Unknown tool: …`, and nothing between there and `spawn_agent` catches it — so one bad name makes the whole agent unspawnable rather than costing it a single tool.

## Where definitions live

The loader scans six roots, and the highest priority wins a same-name collision. A seventh source sits above all of them: the ephemeral directory, which the base load deliberately skips and the ephemeral store opts back into explicitly.

| priority | directory |
|---|---|
| 10 | ephemeral agents created at runtime (`<project>/.igni/agents.tmp/`) — loaded separately, not by the base scan |
| 6 | an extension's `<agent>.<variant>.md`, while the extension runs |
| 5 | `<project>/.igni/agents/` |
| 4 | `<project>/.igni/agents.local/` |
| 3 | `<project>/.claude/agents/` |
| 2 | the group-policy agents cache |
| 1 | `~/.igni/agents/` |
| 0 | `~/.claude/agents/` |

The two `.claude` rows are only scanned when `agents.cross_tool_support` is on (default `true`). Note that `.igni/agents` outranks `.igni/agents.local`, not the other way round. To override a bundled agent, edit your project's copy or drop a same-named file into a higher root.

## How work is routed

The main agent delegates, and so can any specialist whose definition sets `can_orchestrate: true`. Each gets three tools:

- **`spawn_agent(task, agent_name, isolation="")`** — one specialist on one subtask. `isolation="worktree"` forks a git worktree, rebases the agent's file and shell tools onto it, and reports the branch in a footer. An unknown `agent_name` comes back as an error string, not an exception.
- **`spawn_team(task, agent_names, mode="coordinate")`** — `agent_names` is comma-separated. Modes are `coordinate`, `broadcast` (all members run the same task in parallel), `route` (leader picks one), and `tasks` (iterative decomposition, capped by `max_task_iterations`). An unrecognised mode coerces silently to `coordinate`. A single name collapses to `spawn_agent`.
- **`create_agent(name, description, system_prompt, tools="Write,Edit,Bash")`** — registered only when `orchestration.generate_ephemeral` is on. Writes a `.md` into `<project>/.igni/agents.tmp/` at the top priority. `/agents promote <name>` makes it permanent, `/agents discard <name>` removes it.

Each spawn gets a shallow copy of the pool's cached agent, because Agno `Agent` objects hold per-run state and concurrent spawns of the same specialist would race on it. **A sub-agent receives no conversation history** — whatever the task string does not say, it does not know.

## Limits and defaults

All under `orchestration:` in `.igni/config.yaml` (project) or `~/.igni/config.yaml` (user).

| setting | default | what it does |
|---|---|---|
| `max_total_agents` | `20` | per-session spawn budget. A team reserves one slot per member; over budget returns `Error: Maximum total agents (20) reached.` |
| `sub_team_timeout` | `1800` | per-spawn deadline in seconds, applied to single agents as well as teams |
| `max_task_iterations` | `10` | iteration cap for `mode="tasks"` |
| `generate_ephemeral` | `true` | whether `create_agent` is registered at all |
| `max_ephemeral_per_session` | `5` | the store refuses past it; `create_agent` catches the refusal and returns `Error creating agent: ...` |
| `max_nesting_depth` | `5` | see below |

**Nesting.** A spawned agent with `can_orchestrate: true` gets its own spawn tools at the next depth. Of the bundled agents, `editor`, `docs`, `qa`, `architect`, `explorer` and `reviewer` have it; `debugger`, `simplifier`, `plan_researcher` and `visualizer` do not. At the last allowed level the tools are withheld rather than given and refused, and a spawn past the limit returns `Error: Maximum nesting depth (5) reached.` `max_total_agents` caps the same recursion by total count across the session.

`sub_team_timeout` counts the agent's own work only. Time spent waiting for a person to answer an approval is taken out of the spawn's budget, and out of every enclosing spawn's, so a specialist waiting on you is not aborted for it.

## Plugin-shipped agents

Agents that arrive via a plugin are loaded under a security envelope. Their names are namespaced `<plugin>:<name>` so they cannot collide with yours, `mcp_servers` is stripped to empty, and `force_isolation` is set to `worktree` so every spawn runs in a fresh branch. Declaring `hooks`, `mcpServers`/`mcp_servers`, `permissionMode`/`permission_mode` or `permissions` in a plugin agent's frontmatter logs a warning and the keys are dropped — a plugin cannot grant itself privileges its manifest did not get. The same envelope applies to agents an extension ships, because an extension delivers its agents as a plugin.

## Where to go next

- **[Slash commands, skills and output styles](/docs/slash-commands-and-skills)** — the other thing you type after a slash, and the packaged procedures that ship with igni.
- **[Tools, MCP servers and language servers](/docs/tools-mcp-and-language-servers)** — what an agent may call, and how you add more.
- **[Building extensions](/docs/building-extensions)** — shipping your own agents to other people's machines.
- **[Glossary](/docs/glossary)** — what "agent", "orchestrator", "team mode" and "plugin" mean here.
