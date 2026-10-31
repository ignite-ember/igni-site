Every agent in igni acts on your machine through a toolkit: a fixed set of built-in functions, plus whatever you add yourself as a Python file or connect as an MCP server. This page enumerates what ships, explains the one surprising omission (there is no general file-reading tool), and shows the config needed to extend the set. You need it if you are wiring up an MCP server, writing a custom tool, or trying to work out why the model called `run_shell_command` to read a file.

## The built-in catalog

Built-ins live in a single catalog — one `ToolSpec` subclass per tool, assembled in `ToolSpecCatalog.default()`. There are eight:

| Registry name | Functions the model sees | Notes |
|---|---|---|
| `Write` | `save_file` | agno's `FileTools` with every other function switched off |
| `Edit` | `edit_file`, `edit_file_replace_all`, `create_file` | |
| `Bash` (alias `BashOutput`) | `run_shell_command`, `read_process_output`, `await_process`, `watch_process`, `stop_process`, `list_processes` | |
| `WebSearch` | `web_search`, `search_news` | needs the optional duckduckgo dependency |
| `WebFetch` | `fetch_url`, `fetch_json` | TLS verification is never disabled |
| `Schedule` | `schedule_task`, `list_scheduled_tasks`, `cancel_scheduled_task` | never gated on confirmation |
| `NotebookEdit` | `notebook_read`, `notebook_read_cell`, `notebook_edit_cell`, `notebook_add_cell`, `notebook_remove_cell` | |
| `Visualize` | `visualize` | one-way UI payload; not requestable by ad-hoc agents |

The main agent does not get all eight. Its core list is `Write`, `Edit`, `Bash`, `Schedule`, `NotebookEdit`. `WebSearch` and `WebFetch` are appended only when the matching permission is not `deny` and the import succeeds.

On top of that the session attaches toolkits the registry never sees, in this order: `Orchestrate` (`spawn_agent`, `spawn_team`, plus `create_agent` when `orchestration.generate_ephemeral` is on), optional reasoning tools, loop control (`loop_start`/`loop_stop`/`loop_status`/`loop_resume`/`loop_set_total` plus five `loop_progress_*` functions), `todo_write`, `enter_plan_mode`/`exit_plan_mode`, `slash_command`, LSP, monitors, connected MCP clients, and finally your custom tools.

Two families are conditional: the LSP toolkit appears only when at least one language server is configured, and the monitors toolkit only when at least one monitor is. `Orchestrate` is a reserved name the registry skips silently — the agent builder attaches it. You may name it in an agent definition's `tools:` list, but declaring does not grant: the builder decides.

CodeIndex and Artifacts are not built in any more. Their tools — CodeIndex's `codeindex_cypher`, Artifacts' document tools — come from their extensions over MCP, and only while the extension is switched on for you. See [CodeIndex](/docs/codeindex) and [Building extensions](/docs/building-extensions).

## There is no Read tool

This is deliberate and it is load-bearing. The `Write` spec constructs agno's `FileTools` with `enable_read_file=False`, `enable_list_files=False`, `enable_search_files=False`, `enable_search_content=False`, `enable_read_file_chunk=False` and `enable_replace_file_chunk=False` — only `save_file` survives. The only readers left in the catalog are `notebook_read` and `notebook_read_cell`, which parse `.ipynb` JSON and nothing else.

Ordinary files are read through the shell: `cat path`, `sed -n '10,40p' path`, `rg pattern`. ripgrep is a hard dependency of the package, so `rg` is there. The permission schema states the consequence outright — the `file_read` category is left unmapped to any function, because igni has no read tool and pointing the category at the shell would silently govern writes too.

The flag that will bite you is `--strict`. It selects `dontAsk` — deny-by-default — and since reads go through `run_shell_command`, denying the shell denies reads. There is no "allow the safe reads" shortcut; pair it with explicit `permissions.allow` entries. (Hooks run on a separate path that no permission gates.)

`run_shell_command` takes one string, executed via `/bin/sh -c`, so pipes, redirection, `&&`, globs and builtins all work. Pass a single string, not an argv list — a list is tolerated, but it is simply joined with spaces before execution, which is not what argv semantics would give you. Defaults: `timeout=7` seconds, `background=False`, `tail=100`. A foreground command that exceeds the timeout is **automatically backgrounded** and its PID returned rather than killed. `await_process` defaults to 3600 seconds and is clamped to 24 hours.

Editing is string replacement. `edit_file` requires `old_string` to appear exactly once and errors with the occurrence count otherwise, pointing you at `edit_file_replace_all`. Every successful write fires a notifier, which becomes a `file_edited` push notification to the attached client.

A default worth knowing elsewhere: `fetch_url(max_length=10000)`.

## Writing your own tool

Drop a Python file in `~/.igni/tools/` (global) or `<project>/.igni/tools/` (project). Each file becomes one toolkit named `custom_<stem>`; every agno `@tool`-decorated function in it is registered.

```python
# <project>/.igni/tools/docker.py
from agno.tools import tool

@tool(description="Start the project's containers")
def docker_up() -> str:
    return "up"

@tool(description="Stop the project's containers")
def docker_down() -> str:
    return "down"
```

Files beginning with `_` are skipped. A file that raises on import is logged and skipped, not fatal. Scan order is user dir, project dir, group-policy dir, then plugin dirs (namespaced `custom_<plugin>_<stem>`).

There is **no sandboxing**. These files are imported and executed with your privileges. A project's `.igni/tools/` is therefore imported only once you trust the folder — opening a repository is not enough to run its tools; your own `~/.igni/tools/` and the group's are unaffected. See [Workspace trust](/docs/permissions-and-safety#workspace-trust).

## Connecting an MCP server

Create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/srv/data"],
      "env": { "LOG_LEVEL": "debug" }
    },
    "internal-api": {
      "type": "sse",
      "url": "https://mcp.internal.example/sse"
    }
  }
}
```

Four locations are read, later winning on name collision: `~/.igni/.mcp.json`, the group-policy dir, `<project>/.mcp.json`, `<project>/.igni/.mcp.json`. `type` defaults to `stdio`; only `stdio` and `sse` exist. SSE fails with `SSE transport requires a 'url' field` if you omit the URL.

Every MCP tool is namespaced `mcp_<server>_<tool>` on both transports, so a server exposing `read_file` cannot collide with anything built in.

Dependencies: the base install already requests agno's MCP extra (`agno[openai,ddg,sqlite,sql,mcp]`), and there is a standalone extra too — `pip install 'ignite-ember[mcp]'` pulls `mcp~=1.30`. If the SDK is missing, connect fails with `MCP dependencies not installed (pip install agno[mcp])`.

Three things to expect on first run:

- **Approval.** Only servers from `~/.igni/.mcp.json` connect without asking. Everything else — the project's `.mcp.json`, a group's, a plugin's — prompts once per (server, config path) and records the answer in `~/.igni/mcp-approved.json`. Where there is nobody to ask, such as a backend with no terminal, the server is not connected: "could not ask" never means yes. In the cloud, a person's approvals are kept on igni server instead and the file is not used.
- **Admin policy wins first.** `managed-settings.json` can set `mcp.required` / `allowed` / `denied`; `denied` takes glob patterns and is checked before your approval.
- **Zero tools is a failure.** A server that connects but advertises no tools is closed and reported as such, rather than sitting there looking connected.

Connection happens once per session, on the first message, from configuration only — there is no auto-detection. The agent pool and main team are rebuilt afterwards so the new tools become visible. Individual tools can be switched off; the disabled set persists in `<project>/.igni/mcp-tool-state.json`, and re-enabling restores from a connect-time snapshot without a reconnect.

Plugin-bundled servers register as `<plugin>:<server>`, first-wins on collision.

## Language servers

Declare them in `<project>/.lsp.json` (or `~/.igni/lsp.json`, or a plugin's `.lsp.json`, namespaced `<plugin>:<name>`):

```json
{
  "lspServers": {
    "pyright": {
      "command": "pyright-langserver",
      "args": ["--stdio"],
      "languages": ["python"],
      "rootUri": null,
      "initializationOptions": {}
    }
  }
}
```

Only `command` is required. `languages` is informational — it shows up in discovery and routes nothing.

Each entry is a command igni starts, so a project's `.lsp.json` is read only once you trust the folder; the same holds for its `.monitors.json` and its plugins. `~/.igni/lsp.json` and plugin servers you installed yourself are unaffected.

The toolkit is two functions and no more: `lsp_list_servers()`, and `lsp_query(server, method, params)` — a raw JSON-RPC passthrough that hands back the response's `result` field. The model supplies the LSP method name and a JSON-encoded params string verbatim (`textDocument/definition`, `workspace/symbol`, …). Convenience wrappers like `lsp_definition` are intentionally absent. Servers launch lazily on the first query, and the toolkit is attached only when at least one is configured — no config file, no LSP tools in the manifest.

## Permissions, briefly

Resolution is permission-aware: denied tools are dropped at build time and never reach the model, and tools at `ask` get `requires_confirmation_tools` set so agno raises a confirmation. Category defaults:

| Category | Default |
|---|---|
| `file_read` | `allow` (unmapped — see above) |
| `file_write` | `ask` |
| `shell_execute` | `ask` |
| `shell_restricted` | `allow` (unmapped) |
| `web_search` | `allow` |
| `web_fetch` | `allow` |
| `git_push` | `ask` |
| `git_destructive` | `ask` |
| `mode` | `default` |

A category set in `managed-settings.yaml` or your group's policy is final: no lower tier, including a trusted project's `allow` rules, can loosen it — a managed `shell_execute: ask` still asks even when a project allows `Bash`. A project's own permission rules count only once you trust the folder.

Six categories are wired. `file_write`, `shell_execute`, `web_search` and `web_fetch` name functions. `git_push` and `git_destructive` become shell rules: `git push` for the first; `git push --force`, `git push -f`, `git reset --hard`, `git clean`, `git checkout --`, `git branch -D`, `git stash drop`, `git stash clear` and `git filter-branch` for the second. Each matches the command on its own or after a separator (`cd repo && git push`). Only `file_read` and `shell_restricted` are inert.

A confirmation gate is only real if it names a function that exists. Two did not — web search and the former CodeIndex tool both ran unconfirmed while the code claimed otherwise — so `tests/test_every_tool_function_is_reachable.py` now asserts that every gated name is present on the built toolkit, and a sibling test forbids any shipped prompt from instructing a tool the model will never be given.
