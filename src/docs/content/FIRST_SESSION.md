This page walks through one session, from an empty terminal to a finished task, and says what igni does at each step. It assumes the CLI. The desktop app does the same work behind a window, and [Installing igni](/docs/installing-igni) covers both.

## Install it

```bash
pip install 'igni-core[decisions]==1.0.4'
```

Python 3.12 exactly. The command it installs is `igni`.

**1.0.4 is not on PyPI yet.** What PyPI serves today is `ignite-ember` **1.0.3**, the release before the split, and that is what you can install now:

```bash
pip install ignite-ember
```

It puts both `igni` and `ignite-ember` on your `PATH`, so `igni --version` works straight away. From 1.0.4 the old package name becomes an alias for `igni-core` and installs the same thing, `decisions` extra included. [Changes and upgrades](/docs/changes-and-upgrades) has the version story.

There is also a Homebrew formula, `brew install ignite-ember/tap/ignite-ember`. It installs the published 1.0.3, and it puts the `ignite-ember` command on your `PATH` — not `igni`.

Check it:

```bash
igni --version
```

## Sign in

igni needs a model to talk to. If your organisation runs an igni server, point the CLI at it and sign in:

```yaml
# ~/.igni/config.yaml
api_url: https://igni.example.com
```

```bash
igni login
```

That opens your server's sign-in page in a browser and prints the address, so it also works on a machine with no browser of its own. On a CI runner, or anywhere you already hold a token:

```bash
printf %s "$IGNI_TOKEN" | igni login --token-stdin
```

The token is read from standard input, never taken as an argument, so it does not land in your shell's history or in the process list. It is kept in `~/.igni/credentials.json`, and it expires after 30 days.

Signing in through a browser also fetches your group's pack of agents, skills, hooks and settings, verifies it, and caches it under `~/.igni/group-policy/`. The `--token-stdin` path does not: it keeps the token and nothing else, and the pack arrives the next time you sign in through a browser.

**If you have no server**, bring your own model instead. Set the key:

```bash
export OPENAI_API_KEY=sk-...
```

and name the model in `~/.igni/config.yaml`:

```yaml
models:
  default: gpt-4o
  registry:
    gpt-4o:
      provider: openai_like
      model_id: gpt-4o
      url: https://api.openai.com/v1
      api_key_env: OPENAI_API_KEY
```

For Claude the provider is `anthropic`, which speaks the Messages API natively:

```yaml
    claude:
      provider: anthropic
      model_id: claude-opus-5-5
      api_key_env: ANTHROPIC_API_KEY
```

Without either, a run stops with *"No model configured. Add one to `models.registry` in ~/.igni/config.yaml, or run `/login` from a client to discover the models your igni server offers."*

## Run your first task

```bash
cd your-project
igni -m "In one sentence, what does this project do?"
```

That is the whole interaction. The CLI runs one task and exits — there is no chat in the terminal. The exit code is 0 when the turn happened and 1 when it did not, which makes it safe to use from a script.

`--verbose` — the flag's own help says *Show routing and reasoning* — turns on the `show_routing` and `show_reasoning` settings in igni's `display` block. An extension reads them through the host API; the terminal renderer prints neither of them, so on the command line the flag changes what igni records rather than what you see.

## What the first run in a folder does

The first time igni runs in a directory, two things happen before it answers anything.

**It asks whether the folder is trusted.** A folder's own project tools, hooks, workflows, language servers, monitors, plugins, markdown-command shell tokens and permission settings are off until you trust it, because each one runs code on your machine. On a terminal it asks; headlessly it stays untrusted and says so:

```
igni: /path/to/project is not trusted — its project tools, hooks, workflows,
language servers, monitors, plugins, markdown-command shell tokens, and its
permission and safety settings are off.
```

Trust it once, for good, with:

```bash
igni trust            # trust the current folder
igni trust --list     # every folder you have decided about
igni trust --revoke   # forget the decision
```

or for one run only, with `--trust`. The answer is recorded outside the session, so it survives a restart.

**It writes the project's own files.** A folder that has never been initialised gets:

| Path | What |
|---|---|
| `igni.md` | The project's instructions to the agent. Write your own; it is meant to be committed. |
| `.igni/config.yaml` | The project's settings. |
| `.igni/agents/` | The built-in agents — unless your group's pack ships agents of its own, which then stands these down. |
| `.igni/skills/` | The built-in skills. They are always written, group or no group. |
| `.igni/hooks/` | Two shell scripts, `pre-pr-review.sh` and `post-commit-todo.sh`. They run on your machine. |
| `.igni/settings.json` | Registers those two hooks. |
| `.igni/settings.local.json` | Starter permissions, for you to change. It is yours alone, and gitignored. |
| `.igni/.gitignore` | Keeps the personal and runtime files out of git, and leaves the shared ones in. |

igni rewrites only its own marked block in that `.gitignore`, so anything you add to it survives. Commit `igni.md` and `.igni/` — they are the parts meant to be shared.

If your organisation's group ships agents and skills, they arrive at sign-in under `~/.igni/group-policy/` — agents in `agents/`, skills in `skills/` — and `.igni/agents/` is not written at all. The agents you add to `.igni/agents/` yourself still load.

## Say what it may do

igni reads files by running shell commands, and by default it asks before it writes a file or runs a command. On a terminal there is somebody to answer. Headlessly there is not, and the run stops:

```
Run paused for confirmation on Bash but this session cannot resolve a pause;
the tool did not run. Grant the tool up front (--auto-approve or a settings
rule) or use a client that supports confirmations.
```

That is the single most common reason a first run produces nothing. Four flags decide how much is asked for:

| Flag | What the agent may do |
|---|---|
| `--read-only` | Read-only shell commands, web search and URL fetches run unasked. Edits and every other command are **refused**, not asked. |
| `--accept-edits` | File edits are approved; shell commands are still asked for. |
| `--auto-approve` | Everything is approved. Do not use it in a repository you care about. |
| `--strict` | Nothing runs without an explicit allow rule, reads included. |

For a first run, `--read-only` is the safe one:

```bash
igni --read-only -m "what does this project do?"
```

In `--read-only` the agent is put in plan mode, so a task it cannot carry out produces a plan instead. The run prints it:

```
Plan (read-only session — nothing was executed):
...
Re-run without --read-only to carry it out.
```

When you know what the task needs, name it in your settings rather than widening the mode:

```yaml
# ~/.igni/config.yaml
permissions:
  allow:
    - "Bash(python3 -m pytest *)"
    - "Bash(cat *)"
    - "Bash(rg *)"
```

One rule covers one command. `Bash(cat *)` does not allow `cat x && rm -rf y` — every command on the line must be allowed. A pure filter after a pipe (`tail -20`, `head`, `grep x`, `wc -l`) needs no rule of its own, so `pytest -q 2>&1 | tail -20` runs under the pytest rule; `| tee`, `| sh` and `| xargs` do not.

The full set of modes, and what each one acts on, is in [Permissions and safety](/docs/permissions-and-safety).

## Continue the conversation

Sessions are kept in SQLite. To carry on from the last one:

```bash
igni -c -m "and now the tests?"
```

To carry on from a particular one:

```bash
igni --session-id abc123 -m "carry on"
```

In the desktop app and the web client, `/sessions` lists them and `/rename` names one.

## Feed it something

Pipe mode reads standard input, runs one turn on it, and writes to standard output:

```bash
git diff | igni -p -m "what changed here, and is any of it wrong?"
```

Combine the two — the piped text becomes the context, the message becomes the instruction:

```bash
cat error.log | igni -p -m "what caused this crash?"
```

## Coming from another tool

igni reads `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json` and `.mcp.json` out of the box. Cross-tool support is on by default and needs no configuration. If your repository already has those files, they are used as they are.

## Where to go next

- **[Glossary](/docs/glossary)** — what each word means here, and where a word means more than one thing.
- **[Project context, rules and memory](/docs/project-context-and-memory)** — what igni reads before it answers, and what it remembers between sessions.
- **[Permissions and safety](/docs/permissions-and-safety)** — the five modes, in full.
- **[Agents and orchestration](/docs/agents-and-orchestration)** — who does the work, and how to write your own agents.
- **[Configuration and precedence](/docs/configuration-and-precedence)** — where each setting came from, when several files say different things.
