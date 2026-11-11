Every term igni uses, and what it means here. Where a word means more than one thing, the entry says which sense is meant, because the same word is used in several places and picking the wrong one sends a reader to the wrong part of the product.

## The products

**igni** — the product: an agent that works on your code, with a desktop app, a web client and a CLI in front of it.

**igni-core** — the Python package that holds the backend, the `igni` command and the decisions service. It is the package's canonical name. The monolith it came from was distributed as `ignite-ember` and imported as `ember_code`; the split renamed the distribution to `igni-core` and the module to `igni_core`, so every import says `igni_core` now. The release that carries the rename is 1.0.4.

**ignite-ember** — the package's former name, and the name it still has on PyPI, where it today serves 1.0.3, the pre-split monolith whose module is `ember_code`. From 1.0.4 it becomes an alias package: it carries metadata and nothing else, and depends on `igni-core` at the same version, so `pip install ignite-ember` gives you the same thing. It is also the name of a command that is an alias of `igni` — the 1.0.3 wheel already shipped both — and the name of the Homebrew formula.

**igni server** — the API, the portal and the migrations, deployed by an organisation and run by whoever owns the install. It serves sign-in, models, groups, extensions and the administration API. It is not igni itself: it is the part that is shared.

**igni app** — the desktop app and the web client. Both show the same interface and speak the same protocol to an igni backend. The desktop app is the Tauri application, and it starts that backend on your own machine; the web client is the same UI in a browser, pointed at a backend by its URL.

**CLI** — the `igni` command, from the `igni-core` package. It runs one task and exits. There is no chat in the terminal.

**backend** — the process igni's clients talk to on your own machine. Started with `python -m igni_core.backend --socket <path>`. The desktop app starts one for you; a script may start its own.

**portal** — the sign-in and administration site, served by igni server. It is not a separate product: it is the server's own web front end.

## People, organisations and groups

**account** — a row in the server's `users` table, keyed on a unique email address, recording how it was created (`email`, `google`, `oidc`, `scim`). The word "person" is used for the human behind one.

**organisation** — a tenant. It owns one or more email domains, no two organisations share one, and it has a database of its own. A person belongs to the organisation that owns their address's domain and to no other.

**group** — a set of people inside an organisation. A group is what ships to igni: it has its own agents, tools, prompts, settings and model.

**group pack** — the signed bundle a group publishes. It carries agents, skills, commands, workflows, rules, output styles, tools, scripts, hooks, plugins, MCP servers and settings, and is fetched and verified by each client at a browser sign-in, then cached under `~/.igni/group-policy/`.

**member** — a person in an organisation, with a role there: `admin` or `member`. The role is per organisation, not global.

**super admin** — an account that owns the install. Super admins create organisations, make other super admins and change settings that belong to the whole deployment. The first account a deployment creates is its super admin.

**deployment admin** — either a signed-in super admin, or the break-glass `X-Super-Admin-Key`. The key reaches the deployment-wide settings and nothing else, and it makes nobody a super admin.

**service** — a system of yours that runs beside igni server and ships an extension to people's machines. The documents service (Artifacts) and CodeIndex are services. A service is not an account and is not an organisation.

**app** — an identity that is not an account: a PR reviewer, a bot, an integration. An organisation's admin registers it; it signs in with a token of its own, belongs to no group, and acts only as itself — never on behalf of a person.

**producer** — a thing that consumes igni in Fleet: a person, an app or a space. Each producer gets its own microVM.

**workspace** — the project folder igni works in. It is what *workspace* means in an extension's permissions (`none`, `read`, `write`) and what *workspace trust* is about: a folder's own tools and hooks stay off until you trust it. On a person's machine it is the folder igni was started in; in Fleet it is the producer's `/workspace`, inside their microVM.

## The agent

**agent** — a markdown file with a role, a tool list and a system prompt. `architect`, `explorer`, `reviewer` and the rest are agents.

**orchestrator** — the meta-agent that reads a task and assembles a team to do it. You do not choose agents yourself.

**team mode** — how the orchestrator staffs a task with a *team*: `route`, `coordinate`, `broadcast` or `tasks`. There are four. Staffing a task with one agent is not a team mode — it is a single-agent spawn.

**tool** — a capability an agent may call. Eight are built in: `Write`, `Edit`, `Bash`, `WebSearch`, `WebFetch`, `Schedule`, `NotebookEdit` and `Visualize`. An agent gets only the tools its file declares, and the main agent's core list is `Write`, `Edit`, `Bash`, `Schedule` and `NotebookEdit`. CodeIndex's and Artifacts' tools are not among them: they arrive from their extensions over MCP.

**skill** — a packaged procedure, invoked as `/name`: a directory holding a `SKILL.md`. Five ship with igni, in `src/igni_core/bundled_skills/`: `commit`, `explain`, `migration`, `pr` and `test-plan`. You can write your own in `.igni/skills/` or `~/.igni/skills/`, and your organisation can ship you some.

**command** — a prompt behind `/name`. It may be built in, declared by an extension, published by your organisation, or a markdown file you write. A markdown command is one file; a skill is a directory.

**slash command** — anything typed after a slash: a built-in, a markdown command, an extension's command, or a skill. `igni -m "/help"` prints the list.

**hook** — your code, run when igni does something: before a tool runs, after a session ends, and so on. A hook in your own settings file answers with an exit code and a JSON line, and its permission decision is one of `allow`, `deny`, `ask` or `defer`; the strongest one wins when several hooks answer the same event. A Python extension's hooks answer `Allow`, `Reject` or `Modify` instead — that is the extension SDK's vocabulary, not the file hook's.

**workflow** — a scripted sequence of steps, run in order, with its own state.

**scheduled task** — a task that runs later or on a recurrence.

**plugin** — a directory containing `.claude-plugin/plugin.json`, bundling skills, agents, hooks, MCP servers and custom tools. The format is Claude Code's, and a plugin built for Claude Code works in igni unchanged. An extension may ship one as its `plugin` contribution; the agents in it are namespaced `<plugin>:<name>` so they cannot collide with yours.

**extension** — anything that adds to igni on people's machines: tools the agent can call, pages and commands in the app, prompt changes, agents, skills and hooks. Most extensions belong to a service.

**MCP** — the Model Context Protocol. igni is an MCP *client*: servers named in `.mcp.json` give the agent their tools. igni is not an MCP server.

**host API** — the igni app as an object model, with properties, signals and methods, which an extension reads and writes. `ext.host` in Python, `bridge.host` on a page. Its version is 1.13.0.

**decision model** — the local model, Laya, that Bypass mode consults before it allows an action, and that extensions reach through `host.decide`. It is installed by the `decisions` extra.

**session** — one conversation, kept in SQLite. `igni -c` continues the most recent one; `/sessions` lists them in the app.

**air-gap mode** — the setting under which igni makes no outbound connection of its own. See [Installing igni](/docs/installing-igni).

**managed settings** — the file a sysadmin controls that a user cannot override: `/Library/Application Support/igni/managed-settings.yaml` on macOS, `/etc/igni/managed-settings.yaml` on Linux, `%PROGRAMDATA%\igni\managed-settings.yaml` on Windows.

## The server and its models

**inference node** — a GPU machine you run and register with igni server. It answers chat completions behind an OpenAI-compatible API.

**pool** — a named set of inference nodes, so that a class of work can be given its own capacity. igni server 0.7.0 removed pools as an API object: the API answers one flat list of nodes. The word itself is alive — 0.7.0's own code still calls the deployment's set of nodes *the pool*.

**LoRA adapter** — a small trained delta that the node carrying it serves as its own model id, beside the base model it was built on.

**Factory** — the pipeline at Ignite Ember that generates training data and trains igni's models. It is not a service you deploy, and nothing in igni server, the portal or the clients *is* the Factory. It is one of the names a licence file carries, though, and its entitlement and expiry are reported on the portal — no code enforces it yet.

**CodeIndex** — the paid module that builds a queryable graph of your repositories, so the agent can search code semantically instead of by text.

**Artifacts** — the paid module behind shared documents: the documents the agent writes, their versions, and their lineage.

**Fleet** — the paid module that gives each person and each app its own igni agent in its own microVM on your servers.

**microVM** — a Firecracker virtual machine, one per producer, paused and suspended to disk when idle.

**VM profile** — the shape of a producer's microVM in Fleet: its memory, its vcpus, the packages built into it, its volume and whether it may reach the internet. An organisation's admin defines the profiles and assigns one to each group and each app; the one nobody is assigned gets the organisation's default.

**node agent** — the Fleet binary that runs the microVMs on one KVM host.

**gateway** — the Fleet binary that clients connect to. It authenticates, wakes and routes, and provisions VMs.

**guest agent** — the Fleet binary inside each microVM. It talks to the node over vsock and never opens a network socket.

**offline release bundle** — the signed tarball that carries a release into a network with no route out. See [Offline updates](/docs/offline-updates).

**licence** — the signed file that turns on the paid modules. It travels separately from any bundle.

## Words that mean more than one thing

Five words carry more than one sense in this documentation. Each is spelled out where it matters.

**fleet** — two things: **Fleet**, the paid module that gives each person and each app its own igni agent in its own microVM; and **the fleet**, the deployment's own set of GPU inference nodes, which is what igni server's code calls them. The second has nothing to do with the first.

**host** — four things:

- **the host API** — the igni app as an object model, which an extension reads and writes;
- **a KVM host** — the bare-metal machine in Fleet that runs a node agent;
- **an egress host** — a network host an extension's manifest permits it to reach, as `host` or `host:port`;
- **an internal host** — a host inside your own network, named under `network.internal_hosts`, which air-gap mode will let a client reach.

**plugin** — the directory format described above. An extension's `plugin` contribution is one of those directories. Nothing else in igni is called a plugin.

**person** — a human with an account. It is not a *member* of an organisation — that is a person with a role there — and not an *app* (that has no account at all). In Fleet, a *producer* may be a person, an app or a space. **User** is the word igni server's own names use — the `users` table, a `user_id` — and on a person's own machine "the user" is whoever is signed in to it.

**model** — three things: a **language model** you serve on your GPUs; a **decision model**, which is Laya and runs locally; and a **model id**, the name a node answers to. `models:` in igni's own `config.yaml` means language models; in the server's inference-backends file it means the ids a node answers to, base model and adapters alike.

## Where to go next

- **[Configuration and precedence](/docs/configuration-and-precedence)** — where a setting comes from, and which file wins.
- **[Administering your organisation](/docs/administering-your-organisation)** — accounts, organisations, groups and the roles that decide what each may do.
- **[Building extensions](/docs/building-extensions)** — the manifest, the host API and the services behind them.
