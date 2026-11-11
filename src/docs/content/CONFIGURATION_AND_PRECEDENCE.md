Every run of igni assembles one `Settings` object out of a stack of files, and the order they are applied in is the whole story. This page lists the files, the directories they live in, the order they win in, and the same user/project/local tiering as it applies to agents, skills, commands and plugins. Read it when a setting you wrote is not taking effect, or when you are deciding where a setting belongs — your home directory, the repository, or a sysadmin-controlled file.

## The two directories

There are two config directories and they hold different things:

- `~/.igni` — this machine's state and credentials (`credentials.json`, `ember.db`, the group-policy cache), plus your personal settings.
- `<project>/.igni` — the project's own configuration and the files a team would share.

> **Version note.** These pages describe the release after 1.0.3.
> 1.0.3, the version published today, predates the rename and reads
> `~/.ember` only — a config file at `~/.igni/config.yaml` is ignored
> by it. If you are on 1.0.3, either upgrade or keep your settings in
> `~/.ember/config.yaml` until you do.

Both have a legacy spelling, `.ember`, from before the product settled on its name. `home_config_dir()` and `project_config_dir()` return the `.igni` path, fall back to `.ember` when only that one exists on disk, and prefer `.igni` when both do. A separate one-shot migration renames `.ember` to `.igni`; it refuses when the destination already exists, never merges two directories, and never follows a symlink.

That fallback covers the settings merge only. The agent, skill, command and plugin loaders build their paths from the `.igni` constant directly, with no legacy branch — so on an unmigrated machine your config is still found but your agents and skills are not. The user-config writer (`/model` persistence) also always writes `~/.igni/config.yaml`.

## config.yaml versus settings.json

Two file formats sit side by side in each directory, and they contribute different things.

| File | Format | What it contributes |
|---|---|---|
| `config.yaml` | YAML | Any top-level key of `Settings` — `models`, `permissions`, `safety`, `storage`, `context`, `guardrails`, … |
| `settings.json` | JSON | Only the top-level `permissions` block is lifted into `Settings` |

The whitelist is literally one entry: `_JSON_KEYS_TO_LIFT = ("permissions",)`. The `hooks` block in a `settings.json` is deliberately *not* lifted — the hook loader reads those files itself, so lifting them would create two sources of truth. A test pins that. Missing and malformed `settings.json` files are skipped silently; a syntax error there will not stop the backend from starting, it will just quietly not apply.

## The merge order

`SettingsMergePlan.default` owns precedence. It builds an ordered list of tiers and folds each into an accumulator; later tiers win because their `apply` runs last.

| # | Source | Notes |
|---|---|---|
| 0 | Built-in defaults | The `Settings` Pydantic `Field` defaults, seeded before the plan runs |
| 1 | `~/.igni/config.yaml` | User global |
| 2 | `~/.igni/settings.json` | `permissions` only |
| 3 | `~/.igni/settings.local.json` | `permissions` only |
| 4 | `<project>/.igni/config.yaml` | Project, meant to be committed |
| 5 | `<project>/.igni/settings.json` | `permissions` only |
| 6 | `<project>/.igni/config.local.yaml` | Project, personal |
| 7 | `<project>/.igni/settings.local.json` | `permissions` only |
| 8 | CLI flags | |
| 9 | Org group policy | The pack your group ships, read from the local cache and applied only if igni server's signature on it verifies — see below |
| 10 | `managed-settings.yaml` | Sysadmin / MDM |

Merging is a deep merge: dict values recurse, everything else — including lists — replaces outright. So a project `permissions.deny` list replaces the user-level one rather than appending to it. When no `project_dir` is passed, the current working directory is used.

**In the cloud, tiers 1–7 are skipped.** An igni running in a [Fleet](/docs/fleet) VM reads no settings file under `~/.igni` or the workspace's `.igni`. What it runs with comes from the image, the CLI, group policy and managed policy. The table above is the desktop's.

**These environment variables beat every tier, managed policy included.** They are applied after the merge, by the settings model itself:

| Variable | Effect |
|---|---|
| `IGNI_AIR_GAPPED=1` | Sets `air_gapped: true`, which denies `web_search` and `web_fetch`. It only turns the mode on; unset or false leaves the files' choice. |
| `IGNI_DATABASE_URL` | Sets `storage.database_url`, so state lives in that database (PostgreSQL in the cloud) instead of per-project SQLite files. |
| `IGNI_GROUP_POLICY_TRUSTED_KEYS` | Sets `group_policy.trusted_keys` (comma- or space-separated key thumbprints) — see "Only a pack igni server signed" below. |
| `IGNI_GROUP_POLICY_REQUIRED=1` | Sets `group_policy.required: true`. It only turns it on. |

Validation happens once, at the end: the accumulated dict is passed through `Settings(**payload)` after every tier has run.

## A project's config waits for trust

Tiers 4–7 come with the repository, and anyone who can commit to it writes them. So until you trust the folder, its config may not set `permissions` (rules, categories and `mode`) or `safety` (the protected-path, blocked-command and confirmation lists, the Bypass guard) — those keys are dropped with a warning and the rest of the file applies. Some keys a project may never set, trusted or not: `network`, `air_gapped`, `api_url`, `portal_url`, `update_endpoint`, `plugins.marketplaces`, `storage.data_dir` and `workspace_trust`. What else trust gates, and how you grant it, is on [Permissions & safety](/docs/permissions-and-safety#workspace-trust).

**Managed values are final.** A permission field set in `managed-settings.yaml` or your group's policy cannot be loosened by any tier below it, a trusted project included. A managed `shell_execute: ask` holds against a project's `allow: [Bash]`, even though `ask` is the default.

**`workspace_trust` is managed-only.** It is read from `managed-settings.yaml`, the group policy and the environment; in a user's or a project's config or on the command line it is ignored with a warning. `IGNI_WORKSPACE_TRUST_MODE` and `IGNI_WORKSPACE_TRUSTED_REMOTES` can only tighten it — unlike the variables above, they never override a stricter file.

## Why managed policy sits above the CLI

The managed tier is applied last on purpose — the point is that a developer cannot get out from under an org policy by adding `--auto-approve` to the command line. The file is `managed-settings.yaml` in a write-protected OS directory:

| Platform | Directory |
|---|---|
| macOS | `/Library/Application Support/igni` |
| Linux | `/etc/igni` |
| Windows | `%PROGRAMDATA%\igni` (default `C:\ProgramData\igni`) |
| anything else | none — the managed tier is skipped entirely |

The file is parsed as YAML, which also accepts JSON.

The org-group tier sits between the CLI and managed policy, with one asymmetry: a group can *tighten* a permission freely, but it cannot loosen one the CLI set to `deny`. A group policy that tries logs a warning naming the field, because a policy that quietly does not apply is its own kind of surprise. Both the backend and the CLI pass the loader a fetcher that reads the group pack cached on disk, so the tier is live in production. The client re-asks the server for the pack every `group_policy.poll_seconds` (default `300`; `0` turns polling off and checks only at startup).

## Only a pack igni server signed

The group-policy cache is a directory the person at the keyboard can write. So igni server signs every pack it serves, and igni applies nothing from the cache that does not verify.

**What is signed.** `GET /v1/portal/me/group/pack` returns the pack's usual fields and `signed_pack`: the same content as a compact JWS, signed `RS256` with the key igni server signs its tokens with (`kid` in the header, `typ: igni-group-policy+jwt`), the key published at `/.well-known/jwks.json`. The payload carries the pack (`policy`), `iss` (the server's `PUBLIC_BASE_URL`), `sub` (the person it was served to), `org`, `iat` and a monotonic `version`. There is no `exp`: a cached pack keeps working offline. Nothing that checks an igni token accepts a pack as one.

**What igni checks**, when it fetches the pack and again every time it reads the cache at start-up, before any of it is merged:

- the signature, against a trusted key;
- `iss` against the client's `api_url`;
- `sub` against the person signed in;
- `version` is not older than the newest pack that install has already accepted;
- `org`, when the person's session names an organisation, is that one.

A pack that is missing, unsigned, edited, issued by another server, person or organisation, or rolled back is never merged. The pack's agents, hooks, MCP servers, scripts and plugin entries are rebuilt from the verified pack at every start, so an org hook deleted or edited on disk comes back and a file added beside them is removed; with no pack that may apply, they are removed.

A person with no pack gets that answer signed too: `{"no_pack": true, "signed_pack": …}`, whose payload has `policy: null` and `no_pack: true`. igni verifies it and clears the cached pack and everything derived from it; an older pack put back afterwards is refused as a rollback. (Older clients read it as a pack they cannot parse and keep theirs, as they did with the `null` this used to be.) igni stores the JWS exactly as received; the old unsigned `group_settings.json` is gone, and the desktop app verifies the same JWS itself before it reads `air_gapped`, `update_endpoint`, `update_check_ttl` or `runtime_python` from the group's policy.

**Which keys are trusted.** First, keys an administrator pins in `group_policy.trusted_keys` — RFC 7638 thumbprints (a generated key's `kid` is its thumbprint). Otherwise, the JWKS igni fetches from igni server over TLS, cached beside the pack for offline starts. An unpinned cache is only as safe as its directory: it stops a repository or a planted file, not the machine's own user, who could replace the pack and the cached keys together. A pinned key closes that, because a forged pack would need a key only igni server holds. Pin the next key as soon as `tools/rotate_signing_key.py` stages it, before it activates.

**When there is no valid pack.** With `group_policy.required: true`, igni first tries to fetch one if somebody is signed in, and otherwise starts no agent session and tells the person to connect to igni server and sign in. Without it, the pack is ignored with a warning and igni runs on local settings.

`group_policy.trusted_keys` and `group_policy.required` are read **only** from `managed-settings.yaml` and the environment variables above. Set in a user's or a project's config, on the command line or in a group's own pack, they are ignored with a warning.

```yaml
# managed-settings.yaml
group_policy:
  trusted_keys: ["<thumbprint of each key in /.well-known/jwks.json>"]
  required: true
```

## A worked example

```yaml
# ~/.igni/config.yaml — your machine, your keys
models:
  registry:
    gpt-4o:
      api_key: sk-...
```

```yaml
# <project>/.igni/config.yaml — committed, shared with the team
models:
  default: gpt-4o
  registry:
    gpt-4o:
      provider: openai_like
      model_id: gpt-4o
      url: https://api.openai.com/v1
```

Because the merge is per-field, those two combine into one complete registry entry — the definition travels with the repository and the secret never does. igni scans the project's `config.yaml` at startup and warns if it finds a literal `api_key` there, pointing you at `~/.igni/config.yaml` or at `api_key_env`, which names a secret instead of holding it. `config.local.yaml` is not scanned.

Now run `igni --model claude-sonnet-4 -m "..."`. The CLI tier sets `models.default`, beating both files. If a sysadmin's `managed-settings.yaml` pins `models.default`, the flag loses.

## Flags that do more than their name

`--auto-approve`, `--accept-edits`, `--read-only` and `--strict` all set `permissions.mode` (`bypassPermissions`, `acceptEdits`, `plan`, `dontAsk`). They are applied permissive-first, so the strictest flag you pass wins: `--auto-approve --strict` ends up in `dontAsk`.

Two of them bite harder than they read. `--read-only` denies the shell as well as file writes — and since igni reads files through `run_shell_command`, that also denies reading the working tree. `--strict` is deny-by-default for the agent's own tool use, reads included, and it does not touch hooks: a hook's shell command still runs.

## The same tiering, for everything else

Agents, skills, commands and plugins use the same user → group → project → project-local shape, each with its own explicit priority numbers so the outcome never depends on load order.

| Rank | Agents (`agents/`) | Skills (`skills/`) |
|---|---|---|
| highest | ephemeral (runtime) `10` | `<project>/.igni/skills` `6` |
| | an extension's `<agent>.<variant>.md`, while it runs `6` | |
| | `<project>/.igni/agents` `5` | `<project>/.igni/skills.local` `5` |
| | `<project>/.igni/agents.local` `4` | `<project>/.claude/skills` `4` |
| | `<project>/.claude/agents` `3` | group cache `3` |
| | group cache `2` | `~/.igni/skills` `2` |
| | `~/.igni/agents` `1` | `~/.claude/skills` `1` |
| lowest | `~/.claude/agents` `0` | bundled skills `0` |

In a folder you have not trusted, project plugins are not loaded and a project command's `` !`cmd` `` tokens do not run (the command still loads). Project agents and skills are markdown and load either way.

Markdown slash commands are loaded in order `~/.claude/commands`, `~/.igni/commands`, group cache, `<project>/.claude/commands`, `<project>/.igni/commands` — later roots overwrite earlier ones by name. A file's basename is the command name, so `commands/review.md` is `/review`; the body supports `$ARGUMENTS`, `` !`cmd` `` shell substitution and `@<path>` file inlining.

An extension can replace an agent while it runs: its plugin ships `<agent>.<variant>.md`, and that file is the agent until the extension stops. See [Building extensions](/docs/building-extensions).

Plugins — directories containing `.claude-plugin/plugin.json` — are scanned across seven roots: `~/.claude/plugins` (1), `~/.igni/plugins` (2), `<project>/.claude/plugins` (3), `<project>/.igni/plugins` (4), `<data_dir>/group-policy/plugins` (5), `<managed>/.claude/plugins` (6), `<managed>/.igni/plugins` (7). The managed tiers win, and the "you can't `--auto-approve` your way out of org policy" rule extends to "you can't disable an org-enforced plugin".

The `.claude` roots for agents, skills, rules files and hooks are read only while the matching `cross_tool_support` setting is true. There are four of those settings — `agents`, `skills`, `rules`, `hooks` — and all four default to `true`. Markdown commands gate their `.claude` roots on `rules.cross_tool_support`. The plugin loader is not gated at all: `~/.claude/plugins` and `<project>/.claude/plugins` are always scanned.

## Things that will bite

- **Unknown keys are silently ignored.** `Settings` is a plain Pydantic model with no `extra` configuration, so a typo'd or obsolete top-level key is dropped without a word. An obsolete block from an older template — `knowledge:`, say — is simply ignored.
- **Lists replace, they do not append.** Re-declaring `permissions.deny` at a higher tier discards the lower one entirely.
- **`settings.json` carries only permissions** into `Settings`. Everything else you put there is either read by a dedicated loader (hooks) or ignored.
- **A last migration step touches `models.registry`.** After every other tier has run, rows whose URL contains the substring `ignite-ember.sh` are candidates for replacement by the shipping defaults. The match is a plain substring on the whole URL, not a hostname comparison, so staging and dev subdomains match too. The shipped default registry is empty, so on a default install there is nothing to replace those rows with and the tier changes nothing.
- **Defaults worth knowing:** `models.default` is `""` (falls back to the first key in `models.registry`), `models.max_context_window` is `200000`, `permissions.mode` is `"default"` with `file_write` and `shell_execute` at `"ask"`, `storage.data_dir` is `~/.igni` (or `~/.ember` on a machine that has not been migrated), `storage.database_url` is unset (per-project SQLite), `air_gapped` is `false`, `api_url` is empty — there is no vendor host baked in, and the paths that need one refuse with the setting's name rather than failing deep inside an HTTP client — and `update_check_ttl` is `86400` seconds, which `0` disables.

## Where to go next

- **[Project context, rules and memory](/docs/project-context-and-memory)** — the files igni reads before it answers, and how they merge with these settings.
- **[Permissions and safety](/docs/permissions-and-safety)** — the modes that decide what the agent may do, and where they are set.
- **[Your first session](/docs/your-first-session)** — where each of these files first appears.
