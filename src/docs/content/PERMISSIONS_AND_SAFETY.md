Every tool call the agent makes runs through a permission pipeline before it executes. This page covers what that pipeline decides, the five modes it can be in, the rules and categories it reads, what each CLI flag actually turns off, and the two safety lists that no mode can disarm. Read it before pointing the agent at a repository you care about.

## The pipeline

Five gates run in order for every tool call:

1. **`PreToolUse` hooks** — a hook may answer `deny`, `ask` or `allow`. Installed extensions answer this event too, before your configured hooks, and may change a call's arguments. See [Building extensions](/docs/building-extensions).
2. **Protected paths** — a write to a matching path pattern is blocked.
3. **Blocked commands** — a shell command containing a configured pattern is blocked.
4. **The permission evaluator** — modes and rules, described below.
5. **The Bypass guard** — in `bypassPermissions` mode only. A call the evaluator allowed is checked once more, and one that might be harmful is turned back into an ordinary approval prompt.

Gates 2 and 3 always run. A hook that answers `allow` skips gates 4 and 5, but it cannot unlock a write to `.env`. The first gate that blocks returns its message to the model and the call never happens.

The Bypass guard has two layers. Rules catch actions that are dangerous by their shape: deleting outside the project, `curl | sh`, force-pushing, writing to disks, sending credentials off the machine, publishing, destroying infrastructure. A small local model (Laya) catches what no rule anticipated. It fails closed: if the check cannot run, it asks. A call that needs a yes when nobody can give one (`-p`, CI) is refused with the reason. It is configured under `safety.bypass_guard`:

| Key | Default | What it does |
|---|---|---|
| `enabled` | `true` | The guard at all |
| `threshold` | `0.75` | Model probability at which a call is put to the person |
| `use_model` | `true` | `false` uses the rules only and loads no model |
| `explain` | `true` | Ask the session's model what a stopped call would do, and show it in the prompt |
| `explain_timeout` | `30.0` | Seconds to wait for that explanation |

## The five modes

`permissions.mode` takes one of five values. They are the same strings the clients' `/plan`, `/accept` and `/bypass` commands flip to.

| `mode` | What the mode step does |
|---|---|
| `default` | Nothing. Rules decide; anything unmatched is deferred to the caller. |
| `dontAsk` | Never prompts. Anything without an explicit allow rule is **denied** at the end of the pipeline. |
| `acceptEdits` | Auto-allows the file-edit tools. Everything else falls through to the rules. |
| `bypassPermissions` | Auto-allows everything the deny rules did not already catch, then hands it to the Bypass guard. |
| `plan` | Denies file edits and obviously mutating shell; runs shell commands from a read-only allow-list and the read-category tools; **asks** about every other shell command; defers anything it doesn't classify. Never looser than `default`: a matching `ask` rule still asks. |

The category sets are fixed in code. File-edit is `Edit`, `Write`, `NotebookEdit`, `save_file`, `edit_file`, `edit_file_replace_all`, `create_file`, `notebook_edit_cell`, `notebook_add_cell`, `notebook_remove_cell`. Shell is `Bash` and `run_shell_command`. The read set is `WebSearch`, `web_search`, `search_news`, `duckduckgo_search`, `duckduckgo_news`, `WebFetch`, `fetch_url`, `fetch_json` — note that **no file-reading tool is in it**, because there is no file-reading tool; files are read through `run_shell_command`.

**An extension's tools are classified by their hints, not by name.** Every tool an extension declares states four MCP hints (read-only, destructive, idempotent, open-world). The modes read them: `dontAsk` allows a tool that only reads locally, `acceptEdits` allows a tool whose writes stay contained, and `plan` allows read-only tools and denies the rest.

### What plan mode runs

Plan mode sorts every shell call into one of three outcomes:

1. **Denied** — the obvious writers. A regex matches `rm`, `rmdir`, `mv`, `cp`, `mkdir`, `touch`, `chmod`, `chown`, `ln`, `dd`, `truncate`, `tee` at a command head, plus `sed -i`, `perl -i`, a `>` redirect to a path, and `>>`. No prompt; the agent is told to come back through `exit_plan_mode`.
2. **Run without asking** — only a command built entirely from this allow-list: `ls`, `cat`, `head`, `tail`, `grep`, `egrep`, `fgrep`, `rg` (not `--pre`), `find` (not `-exec`, `-execdir`, `-ok`, `-delete`, `-fprint*`, `-fls`), `git status`, `git log`, `git diff`, `git show` (not `--output`), `git branch` (listing only — no name to create, no `-d`/`-m`/`-c`), `git rev-parse`, `git ls-files`, `git blame`, `git grep`, `pwd`, `wc`, `echo`, `printf`, `stat`, `du`, `df`, `basename`, `dirname`, `realpath`, `readlink`, `which`, `whoami`, `uname`, `diff`, `cmp`, `cut`, `tr`, `nl`, `jq`, `sort` (not `-o`).
3. **Asked about** — everything else: `git push`, `git commit`, `terraform apply`, `kubectl delete`, `curl -o`, `npm install`, any command the lists above have never heard of. You decide.

The allow-list is parsed conservatively. A command is not read-only if it contains command substitution (`$(…)`, backticks), process substitution, a redirection to or from a file, `;`, `&&`, `||`, `&` or a newline, a leading `VAR=value`, a path to the command (`/bin/ls`), or a global `git` option before the subcommand (`git -c …`). A pipe is fine only between allow-listed commands: `grep -rn TODO src | head` runs, `ls | xargs …` is asked about. The redirects `2>&1`, `>&2` and `>/dev/null` write nowhere and are allowed.

Plan mode is never looser than `default`. A command or read tool it would otherwise run is still asked about if an `ask` rule matches it — including the `safety.require_confirmation` commands, which arrive as ask rules.

This holds whatever the session started in. A session that started in `bypassPermissions`, or with `shell_execute: allow`, builds its tools without an approval pause; when plan mode (or a rule) then wants a call asked about, igni asks you then and there, through the same dialog the Bypass guard uses. With nobody to answer — `-p`, CI — the call is refused, and the agent is told to ask you in its reply or to put the step in its plan.

## Order of evaluation

The evaluator runs: **deny → mode → ask → allow → defer**.

Two consequences matter more than the rest:

- **Deny is a floor.** `allow: ["Bash(git status)"]` does not carve an exception out of a denied shell. If you want most of the shell closed and one command open, express it as deny rules for what you want closed.
- **Mode runs before `ask`** — a deliberate divergence from Claude Code's order. An `ask: Bash` rule does not survive someone typing `/bypass on`. The exception is `plan`: what its mode step would allow still yields to a matching `ask` rule, so plan mode never runs something `default` would have asked about.
- **In `dontAsk`, an `ask` becomes a deny.** Nothing in that mode can answer a prompt, so a matching `ask` rule denies the call rather than letting it through.

## Rules

`deny`, `ask` and `allow` are lists of `Tool` or `Tool(pattern)` strings. A bare name matches any invocation of that tool; `*` matches every tool. A pattern is `fnmatch`ed against the call's primary string argument, picked in this order: `command`, `file_path`, `file_name`, `path`, `filename`, `url`, then the `args` list joined with spaces.

Friendly names work: `Bash(rm *)` matches both `Bash` and the internal function name `run_shell_command`, via a reverse index over the tool registry. Unparseable rule strings are dropped silently.

```yaml
# .igni/config.yaml
permissions:
  mode: default
  deny:
    - "Bash(rm -rf *)"
    - "Write(.env)"
  ask:
    - "Bash(git push*)"
  allow:
    - "Bash(npm test)"
```

## Permission categories

Alongside the rule lists there are coarse per-category levels. Each one maps to a fixed set of function names, and any level that **differs from its default** is turned into rules and appended behind your explicit lists.

| Key | Default | Governs |
|---|---|---|
| `file_write` | `ask` | `save_file`, `create_file`, `edit_file`, `edit_file_replace_all`, `notebook_add_cell`, `notebook_edit_cell`, `notebook_remove_cell` |
| `shell_execute` | `ask` | `run_shell_command` |
| `web_search` | `allow` | `web_search`, `search_news` |
| `web_fetch` | `allow` | `fetch_url`, `fetch_json` |
| `file_read` | `allow` | nothing — there is no read tool to govern |
| `shell_restricted` | `allow` | nothing |
| `git_push` | `ask` | shell rules for `git push` |
| `git_destructive` | `ask` | shell rules for `git push --force`, `git push -f`, `git reset --hard`, `git clean`, `git checkout --`, `git branch -D`, `git stash drop`, `git stash clear`, `git filter-branch` |

`file_read` and `shell_restricted` are real fields that govern no tool. The two git categories become `run_shell_command(<cmd>*)` and `run_shell_command(* <cmd>*)` rules, so they also catch `cd repo && git push`. They over-match on purpose: `echo git push` matches too, and over-matching only costs a prompt.

Only non-default values are emitted, on purpose: emitting defaults would hand `--strict` an explicit `allow` rule for `web_search`, loosening a safety flag as a side effect of making config work.

## CLI flags

`igni` runs one message when given `-m` or `-p`. Its only subcommands are `igni ext` (developing extensions) and `igni migrate` (the state database's schema) — there is no `igni login` or `igni chat`. Five flags shape permissions:

| Flag | Sets |
|---|---|
| `--auto-approve` | `mode: bypassPermissions`; `file_write`, `shell_execute`, `git_push`, `git_destructive` → `allow` |
| `--accept-edits` | `mode: acceptEdits`; `file_write` → `allow` (shell still asks) |
| `--read-only` | `mode: plan`; `file_write` → `deny`; `shell_execute` → `deny` |
| `--strict` | `mode: dontAsk`; `file_write`, `shell_execute`, `git_push`, `git_destructive` → `deny` |
| `--no-web` | `web_search`, `web_fetch` → `deny` |

They are applied permissive-to-strict in that order, so passing several leaves you with the strictest: `igni --auto-approve --strict -m "..."` ends in `dontAsk`.

**`--read-only` also denies reads.** Denying `shell_execute` denies `cat`, `grep`, `ls` and everything else, because that is how files are read. This is the stated trade, not an oversight: leaving the shell open would leave `>`, `sed -i` and `git checkout` able to write, making the flag an honour system. What survives is analysis that avoids the shell: the tools an extension declares read-only (CodeIndex's graph query, for one), the notebook readers, and web search and fetch. How much that is depends on what is installed. When the shell is off entirely, the block message says so and tells the agent to use another tool if one can answer, or else to say what it would have run — so the model stops retrying the same call.

`--strict` has the same shape, harder: `dontAsk` never prompts, so anything without an explicit allow rule fails closed — reads included. Pair it with `permissions.allow` to opt tools back in.

**Neither flag touches hooks.** `CommandHookHandler` runs `bash -c <command>` and is handed no permissions object, so a hook supplied by config or by an org's group policy still executes under `--strict`. That is pinned as intended behaviour — hooks exist to run commands — but it means a client-side flag does not reduce the trust you place in whoever administers your hooks.

## Protected paths and blocked commands

Two lists live under `safety` and are enforced by gates that run in every mode, including `bypassPermissions`.

| Key | Default |
|---|---|
| `safety.protected_paths` | `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `credentials.*`, `credentials.json`, `secrets.*`, `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`, `.netrc`, `.npmrc`, `.pypirc`, `.git-credentials`, `service-account*.json` |
| `safety.blocked_commands` | `rm -rf /`, `:(){ :\|:& };:` |

The protected-path gate applies to `save_file`, `edit_file`, `edit_file_replace_all`, `create_file` and the three notebook writers, and matches each pattern against both the file's basename and its full path — so `.env` catches `src/.env` and `**/credentials.json` works too. The blocked-command gate applies to `run_shell_command` only and matches by plain substring containment, which makes it a short list of exact catastrophes rather than a general filter.

`safety.require_confirmation` (default `git push`, `git push --force`, `npm publish`, `pip install`, `docker run`, `terraform apply`, `kubectl apply`, `kubectl delete`) is copied into `permissions.confirm_commands` and becomes `ask` rules for those shell commands — except in `dontAsk`, where nothing can answer. Your own `ask` list is left exactly as you wrote it.

Separately, the output of tools that return outside content — a file's bytes, a web page, a command's stdout, an extension's query results — is wrapped in an `<untrusted_tool_output>` block with a random per-result nonce. The model treats what is inside as data, never as instructions, and the nonce stops content from forging a closing tag.

## Where the settings come from

Highest precedence first:

1. Managed policy (sysadmin file, OS-specific path)
2. Group policy (your group's pack, cached on disk and re-polled every 300 seconds)
3. CLI flags
4. `.igni/settings.local.json`
5. `.igni/config.local.yaml`
6. `.igni/settings.json`
7. `.igni/config.yaml`
8. `~/.igni/settings.local.json`
9. `~/.igni/settings.json`
10. `~/.igni/config.yaml`
11. Built-in defaults

Two environment variables sit above all of these: `IGNI_AIR_GAPPED=1` turns on air-gapped mode, which denies `web_search` and `web_fetch` and refuses connections igni starts itself to hosts outside your network (see [Installing igni](/docs/installing-igni#installing-with-no-internet-access)), and `IGNI_DATABASE_URL` sets where state is kept. In the cloud, the local files (4–10) are not read at all. Files 4–7 contribute `permissions` and `safety` only once you trust the folder — see [Workspace trust](#workspace-trust).

The `settings.json` / `settings.local.json` files are Claude Code-style JSON fragments: only whitelisted top-level keys are lifted out of them, and a missing or malformed file is silently skipped.

Managed and group policy sit above the CLI so a developer cannot `--auto-approve` their way out of an org policy. The **group** tier adds a one-directional ratchet: a permission the CLI set to `deny` stays denied, and the tier records what it refused to loosen. The managed-policy file has no such ratchet — it is a plain merge that runs last, so a sysadmin's `managed-settings.yaml` can loosen even a permission `--strict` denied. In the other direction, a permission the managed file or the group policy sets is final: no lower tier, a trusted project included, can loosen it.

## Workspace trust

Opening a folder never runs its code or loosens igni's safety until you trust the folder. Until then igni leaves off:

- its custom tools (`.igni/tools/*.py` — loading a tool runs it);
- its hooks, in `.igni/settings*.json` and `.claude/settings*.json`;
- its workflows (`.claude/workflows`, `.igni/workflows` — listing them runs each file);
- its language servers (`.lsp.json`) and monitors (`.monitors.json`);
- its plugins (`.igni/plugins`, `.claude/plugins`);
- the `` !`cmd` `` shell tokens in its markdown commands;
- the `permissions` (including `mode`) and `safety` settings in its config files.

Everything else works: reading files, `igni.md` and rules, markdown agents, skills and commands, the rest of the project's config. A project's MCP servers still need their own first-use approval. Your own and your organisation's tools, hooks and settings are not the folder's and are unaffected.

**Granting it.** The desktop app asks when you open a folder nobody has decided about — *Trust*, *Don't trust* or *This time only* — and shows its path and git remote. Until you answer, the folder runs untrusted; trusting it loads its tools, hooks and settings without reopening. On the command line, `igni -m` asks the first time on a terminal; a headless run (`-p`, CI, no terminal) never asks and stays untrusted unless you trusted the folder before or pass `--trust` for that run.

```bash
igni trust              # trust the current folder
igni trust --revoke     # forget the decision; igni asks again
igni trust --list       # every folder you have decided about
```

Decisions are yours, kept in `~/.igni/workspace-trust.json`, never in the repository. Each is tied to the folder's path *and* its git remote, so a moved clone, or a different repository checked out at a trusted path, asks again. igni reads the remote from `.git/config` without running `git` in the folder.

**For an organisation.** Set `workspace_trust` in `managed-settings.yaml` or your group's policy (it is ignored anywhere else):

```yaml
# managed-settings.yaml
workspace_trust:
  mode: trusted_remotes          # ask (default) | trusted_remotes | never
  trusted_remotes:
    - github.com/acme/*          # scheme, user and .git are ignored when matching
  auto_trust_remotes: false      # true: matching folders are trusted without asking
```

- `ask` — each person decides, per folder.
- `trusted_remotes` — only folders whose git remote matches a pattern may be trusted; any other stays untrusted, `--trust` is refused, and the prompt says why. With `auto_trust_remotes: true`, matching folders are trusted without asking, which suits CI.
- `never` — no folder is trusted.

`IGNI_WORKSPACE_TRUST_MODE` and `IGNI_WORKSPACE_TRUSTED_REMOTES` (comma-separated) can tighten this, never loosen it.

A trusted folder still cannot loosen what your organisation set: a permission in managed settings or group policy is final, so a managed `shell_execute: ask` beats a project's `allow: [Bash]`.

## Changing mode mid-session

`/plan`, `/accept` and `/bypass` flip the live evaluator without rebuilding the agent. Each takes `on`/`enable`/`start`, `off`/`disable`/`exit`/`stop`, `status`/`show`, or nothing (toggle). `off` returns to the mode the session started in — or to `default` if it started in the mode you are leaving. Approving a plan also returns to the starting mode (`default` if the session started in plan mode). Reads and writes of the mode are serialised behind a lock so a flip cannot land after an in-flight tool check already read the old value.

**Fully automatic is available unless your organisation turns it off.** With no managed settings or group policy about modes, every mode is reachable: `/bypass on` or `--auto-approve` puts the session in `bypassPermissions`, where tool calls run without a prompt (deny rules, protected paths, blocked commands and the Bypass guard still apply).

### The mode floor

An organisation can limit how loose a session may get. The modes rank, strictest first:

| Rank | Modes |
|---|---|
| 1 (strictest) | `plan`, `dontAsk` |
| 2 | `default` |
| 3 | `acceptEdits` |
| 4 (loosest) | `bypassPermissions` |

`plan` and `dontAsk` share the bottom rank but do not stand in for each other: plan mode runs read-only shell that `dontAsk` denies, and `dontAsk` runs whatever its allow rules name, edits included.

- **A floor.** When the managed-settings file or the group policy sets `permissions.mode`, that mode is the session's floor. If both set one, the stricter holds, whichever tier it came from. `/accept`, `/bypass`, the "accept all edits" shortcut on an approval prompt and plan approval are refused if they would move looser than it, with a message naming the policy that set it (the shortcut shows the message and still approves the call you answered). Stricter modes stay available, and `off` returns to the floor. A mode set in your own config or on the command line is a starting point, not a floor.
- **`permissions.allow_bypass: false`.** Turns `bypassPermissions` off entirely. `--auto-approve` is ignored with a warning — neither its mode nor its `allow` for `file_write`, `shell_execute`, `git_push` and `git_destructive` applies, while any other flag you passed still does — and `/bypass` is refused. It defaults to `true`, is honoured only from managed settings or group policy (set in a user or project config, it is ignored), and either of the two saying `false` is enough.

```yaml
# managed-settings.yaml
permissions:
  mode: acceptEdits      # nothing looser than acceptEdits
  allow_bypass: false
```

The agent itself cannot change mode toward looser either way: its `slash_command` tool refuses `/plan`, `/accept` and `/bypass`, and `enter_plan_mode` only ever moves into plan mode.

These are client commands. `igni -m` and `igni -p` run one message and exit, with no human to answer a prompt; interactive use means starting `python -m ember_code.backend --socket <path>` and attaching a client. One concession to that: a headless `--read-only` run prints the plan the agent submitted at the end, because the usual consumer is a frontend card nobody is looking at.
