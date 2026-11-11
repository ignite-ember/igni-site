igni gives you three places to put your own code. **Hooks** fire on individual agent events — a tool is about to run, a turn ended, the context was compacted. **Workflows** are JavaScript files that drive the agent through named phases. **Scheduled tasks** and **loops** re-run a prompt later, or repeatedly. Hooks fire in the non-interactive CLI paths too — both `igni -m "..."` and `igni -p` run through the same `SessionRun` base that emits `SessionStart` / `SessionEnd`. (`igni` with no arguments starts no session at all; it prints a pointer to the clients and exits.) Workflows, scheduled tasks and `/loop` need the backend running (`python -m igni_core.backend`) with a client attached, because they are driven by slash commands and RPCs.

## Where hooks are declared

A hook lives in the `hooks` block of a settings file. The loader reads these in order, and hooks from every file accumulate — nothing overrides anything, the order only decides each hook's position in its event's list:

1. `~/.igni/settings.json`
2. `~/.igni/settings.local.json`
3. `<project>/.igni/settings.json`
4. `<project>/.igni/settings.local.json`

`settings.hooks.cross_tool_support` defaults to `true`, which appends the `.claude` sibling of all four paths after the `.igni` ones. A cached org settings file, when one exists, is read last.

**A project's hooks need trust.** Files 3 and 4, and the project's `.claude/settings*.json`, are read only once you trust the folder — a hook is a shell command the repository brings with it. In an untrusted folder only your own and your organisation's hooks run. See [Workspace trust](/docs/permissions-and-safety#workspace-trust).

Plugins ship hooks in `<plugin>/hooks/hooks.json`. That file *is* the hooks block — no outer `hooks` key — and plugin hooks are **prepended**, so project hooks still run last and keep the veto.

Extensions answer the same events from their own process (`@ext.hook` in the SDK). They are asked first, one at a time in the priority order a super admin keeps, and your configured hooks then run on the result. If an extension does not answer in time, a tool call or a message to the model does not go ahead. See [Building extensions](/docs/building-extensions).

A broken file does not abort the load. Invalid JSON, a non-object `hooks` key, an event bucket that isn't a list, and a hook that fails validation each become a structured warning and are skipped.

## The shape of a hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "type": "command",
        "matcher": "Bash",
        "command": ".igni/hooks/pre-pr-review.sh",
        "timeout": 15000
      }
    ],
    "SessionEnd": [
      {
        "type": "http",
        "url": "https://hooks.example.internal/igni",
        "headers": { "Authorization": "Bearer $WEBHOOK_TOKEN" },
        "background": true
      }
    ]
  }
}
```

| Field | Default | Notes |
|---|---|---|
| `type` | `"command"` when the key is absent | `command`, `http`, `prompt`, `mcp_tool` |
| `command` | `""` | Run through `bash -c` |
| `url` | `""` | `http` only |
| `headers` | `{}` | Values go through `os.path.expandvars`, so `$WEBHOOK_TOKEN` works |
| `text` | `""` | `prompt` only |
| `mcp_server`, `mcp_tool`, `mcp_args` | `""`, `""`, `{}` | `mcp_tool` only |
| `matcher` | `""` — matches everything | See below |
| `timeout` | `10000` | **Milliseconds.** Ten seconds, not ten thousand |
| `background` | `false` | Fire-and-forget; the result is discarded |
| `async_rewake` | `false` | Also accepted as `asyncRewake` |

Matchers are tri-mode: empty or `*` always matches; an identifier or pipe-list (`Edit`, `Edit|Write`) is an exact match; anything else is `re.search`. A regex that fails to compile matches nothing — it is logged at debug level, not raised. Events fired without a target (every session, compaction and scheduler event, plus `UserPromptSubmit`, `Stop`, `StopFailure` and `InstructionsLoaded`) skip matching entirely: every hook on the event runs. The permission events are *not* in that group — `PermissionRequest` and `PermissionDenied` are fired with the tool's name as the target, so matchers apply to them.

`async_rewake` does more than its name suggests. It forces background dispatch even when `background` is `false`, and if the command exits 2 the message is queued as a system reminder for the next turn instead of blocking anything.

## The four handler types

- **`command`** — runs `bash -c <command>` with the JSON payload on stdin. Exit `0` is success and stdout may carry a JSON envelope; exit `2` blocks, with stderr (or the envelope's `systemMessage`) as the reason, falling back to the literal `"Blocked by hook"`; any other code is a non-blocking soft error. A timeout is non-blocking and reports `"Hook timed out"`.
- **`http`** — POSTs the payload to `url`. A non-200 response or a network error is non-blocking; a 200 whose body is a JSON envelope is honoured in full, so an HTTP hook *can* block.
- **`prompt`** — no side effect at all; `text` comes back as a system reminder. Cheaper than a command that echoes JSON.
- **`mcp_tool`** — calls `mcp_server`/`mcp_tool` with `{event, payload, ...mcp_args}`. A missing resolver, an unconnected server, an exception or a timeout all degrade to non-blocking.

There is no `agent` type. `HookType` is exactly `command`, `http`, `prompt` and `mcp_tool`. Since `HookDefinition.type` is a plain `str`, `"agent"` — or a typo — still validates, but igni logs a **warning** naming the unimplemented type when it loads your hooks, and the hook is then skipped.

The JSON envelope a hook may print is `{"continue": false, "systemMessage": "..."}` and/or `{"hookSpecificOutput": {"permissionDecision": "allow"|"deny"|"ask"|"defer"}}`; a bare top-level `permissionDecision` is also accepted, and the nested form wins. All foreground hooks for an event run in parallel and are merged: any `continue: false` wins, messages are joined with newlines, and the strongest decision wins — `deny` > `ask` > `allow` > `defer`.

## Every hook event

| Event | Fires when | Is the result acted on? |
|---|---|---|
| `PreToolUse` | Before a tool call, as a permission-pipeline stage | Yes — `deny` blocks, `allow` skips only the permission-evaluator stage, `ask` blocks only if it carries a message |
| `PostToolUse` | After a tool returns | No |
| `PostToolUseFailure` | A tool raised | No |
| `UserPromptSubmit` | A user message arrives | Yes — a block stops the turn and writes an audit entry |
| `SessionStart` | Session boot | No |
| `SessionEnd` | Session teardown and backend shutdown | No |
| `Stop` | A run produced a response | Yes — a block re-prompts the model, up to 3 attempts; the payload carries the first 500 characters of the response |
| `StopFailure` | A run ended in an unhandled exception | No |
| `SubagentStart` / `SubagentStop` | Around a sub-agent spawn | No |
| `PreCompact` | Before manual and automatic compaction | Yes — a block cancels the compaction on both paths |
| `PostCompact` | After manual and automatic compaction | No |
| `InstructionsLoaded` | Path-scoped rules surface lazily | No |
| `PermissionRequest` | A `PreToolUse` hook or the permission evaluator returned `ask` | No |
| `PermissionDenied` | A `PreToolUse` hook or the permission evaluator returned `deny` | No |
| `PlanSubmit` | The agent submits a plan (`exit_plan_mode`), before it is stored or shown. Payload `{session_id, plan, attempt}` | Yes — a block sends the plan back to the agent with the hook's message; it may submit again |
| `TaskCreated` / `TaskCompleted` | A scheduled task starts / finishes | No |
| `Notification` | **Never** — declared in the enum, fired nowhere in the source | — |

Note that the two defense-in-depth stages — the protected-path guard and the blocked-command guard — run on every tool call regardless of what `PreToolUse` returned. An `allow` from a hook cannot unlock them; it only skips the permission evaluator that would otherwise run afterwards.

Two of these, `SubagentStart` and `SubagentStop`, are fired with bare string literals rather than through the `HookEvent` enum.

Two hooks are written into `<project>/.igni/hooks/` and registered in `<project>/.igni/settings.json` by project initialization, which runs every time a `Session` is constructed (there is no `igni init` subcommand). Unlike the starter `igni.md` and the config files, this pass is not marker-gated: the scripts are overwritten and the `settings.json` entries re-added on every session, so edits to them do not survive and deletions come back. The two are: `pre-pr-review.sh` (a `PreToolUse` hook matching `Bash`, 15 s timeout, which emits a non-blocking `systemMessage` about TODO/FIXME comments and debug statements in the staged diff before `git push` / `gh pr` commands) and `post-commit-todo.sh` (a background `PostToolUse` hook matching `Bash`, 15 s timeout, that after a `git commit` emits a `systemMessage` asking the agent to update an existing `.igni/TODO.md`). `/hooks list` prints what is loaded; `/hooks reload` re-reads the settings files.

## Scheduled tasks

`/schedule <description> <when>` creates a task; the agent can do the same with the `schedule_task`, `list_scheduled_tasks` and `cancel_scheduled_task` tools. Times are parsed by `dateparser`, so `in 5 minutes`, `at 5pm`, `tomorrow at 9am` and `2026-03-20 14:00` all work, in any of its languages. A time that has already passed is pushed to tomorrow unless the text contains an explicit date or the word `tomorrow`.

Recurrence is parsed first, because `run tests every 2 hours at 5pm` contains both an `every` and an `at`. Accepted forms are `every N minutes|hours|days|weeks` (N defaults to 1) plus the aliases `hourly`, `daily` and `weekly` — note that `weekly` is stored as `every 7 days`. Everything is persisted in the canonical `every N <unit>` form, in the `scheduler_tasks` table of `~/.igni/projects/<project-id>/state.db`, one database per project. In the cloud, where igni runs in a [Fleet](/docs/fleet) microVM, tasks live in the shared PostgreSQL database instead, filtered by project. Either way each project has its own queue.

The background runner is started automatically when the backend boots.

| Setting | Default | Effect |
|---|---|---|
| `scheduler.poll_interval` | `30` | Seconds between polls for due tasks |
| `scheduler.task_timeout` | `300` | A task over five minutes is cancelled and marked `failed` |
| `scheduler.max_concurrent` | `1` | Tasks run strictly one at a time by default |

A recurring task is rescheduled after it finishes **whether it succeeded or not** — a task that fails every time keeps running on its schedule until you cancel it.

## Looping a prompt

`/loop <prompt>` re-fires the same prompt until the work is done. `/loop 5 <prompt>` (or `5x`) caps it explicitly. The two caps behave differently: an explicit cap terminates at exactly N, while the implicit default of **30** is only a safety net — on cap-hit the loop extends by another batch and keeps going, stopping at the hard cap of **200**. A number above 200 is rejected outright.

Every iteration's prompt is wrapped in a `<loop-iteration index="N">` block telling the model it is autonomous, that the user is not available to answer questions, and that tool-permission prompts are the only legitimate interaction. The agent has `loop_start`, `loop_stop`, `loop_status`, `loop_resume` and `loop_set_total` tools, plus a `loop_progress_*` key/value scratchpad whose rows are scoped by the run's id, so a fresh loop does not inherit the previous run's progress. Loop state lives in the same database, in a `loop_state` table with one row per organisation, producer and project, so `/loop resume` survives a restart.

## Workflows

A workflow is an `.mjs` file run in a Node subprocess. Three directories are scanned, in increasing priority: the org policy cache, `<project>/.claude/workflows`, then `<project>/.igni/workflows` — same stem, later layer wins. Node must be on `PATH`.

The file must `export const meta = {name, description, whenToUse, phases}`; discovery re-runs the file with `--discovery` just to read it, cached by mtime. Because discovery runs the file, a project's workflows (both `.claude/workflows` and `.igni/workflows`) are neither listed nor run until you trust the folder; the org's still are. See [Workspace trust](/docs/permissions-and-safety#workspace-trust). Inside the body you get `phase(title)`, `agent(prompt, opts)`, `parallel(thunks)`, `pipeline(steps)` and `log(text)` as globals. `agent()` calls are bridged back to the session's team; each has a **600-second** default timeout, overridable per call with `timeoutSeconds`.

There is no `/workflow` slash command — workflows are driven entirely by the `list_workflows`, `run_workflow` and `cancel_workflow` RPCs, so you need a client that exposes them. `run_workflow` returns a `workflow_run_id` immediately and progress arrives as `workflow_event` pushes. Cancellation notifies the subprocess, waits 5 seconds, then escalates to SIGTERM and SIGKILL. **Resume is not implemented**: the runner's `resume()` returns `None` by design, and re-running a workflow starts it from the top.

## Where to go next

- **[Tools, MCP servers and language servers](/docs/tools-mcp-and-language-servers)** — the capabilities a hook can allow, deny or modify.
- **[Permissions and safety](/docs/permissions-and-safety)** — what a hook may decide, and the trust model around one.
- **[Building extensions](/docs/building-extensions)** — shipping hooks, workflows and agents as part of an extension.
