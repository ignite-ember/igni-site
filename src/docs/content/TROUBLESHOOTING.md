The errors igni actually prints, what each one means, and what to do about it. Most first-run problems are on this page; if yours is not, [Changes and upgrades](/docs/changes-and-upgrades) covers what changed when you moved between versions, and [Your first session](/docs/your-first-session) is the walkthrough.

## The first run produces nothing

| What you see | What it means | What to do |
|---|---|---|
| `No model configured. Add one to \`models.registry\` in ~/.igni/config.yaml, or run \`/login\` from a client to discover the models your igni server offers.` | There is no model for igni to talk to, and nothing has signed in to fetch one. | Point the CLI at your server and sign in — `igni login` — or add a model to `models.registry` yourself. See [Your first session](/docs/your-first-session). |
| `The configured default model 'gpt-4o' is not in \`models.registry\`.` | Your stored default names a model the server no longer offers. It usually means the deployment changed, and everyone pinned to that model is stranded. | Run `/login` from a client to rediscover, or pick another with `/model`. |
| `Unknown model 'gpt-4o'. Add an entry to \`models.registry\` or use a \`provider:model_id\` name.` | `--model` named something that is not registered. | Use a name from the registry, or a `provider:model_id` pair. |
| `Unknown provider 'openai'. Available: anthropic, gemini, openai_like.` | The `provider:` in the registry entry is not one igni knows. | Use one of the listed names. `openai_like` is the OpenAI-compatible one; `anthropic` speaks the Messages API; `gemini` speaks Google's. The list holds the providers whose SDK is importable, and igni-core 1.0.4 depends on the Anthropic and Gemini SDKs outright — so a normal install lists all three, and a shorter list means the install is partial. |
| `Anthropic provider requested but the anthropic SDK is not installed.` | The SDK cannot be imported. igni-core 1.0.4 depends on it, so this is a broken or partial install rather than an extra you forgot. | `pip install 'igni-core[anthropic]'` puts it back. The Gemini error names `google-genai` and says `pip install google-genai`. |
| `igni: /path/to/project is not trusted — its project tools, hooks, workflows, language servers, monitors, plugins, markdown-command shell tokens, and its permission and safety settings are off.` | The folder has never been trusted, so nothing it defines may run. Each of those runs code on your machine. | `igni trust` to trust it for good, or `--trust` for one run. `igni trust --list` shows your decisions; `--revoke` forgets one. |
| `Run paused for confirmation on Bash but this session cannot resolve a pause; the tool did not run.` | igni wanted to ask before running a command, and there was nobody to ask — a pipe, a CI job, a script. **This is the most common reason a first run produces nothing.** | Grant the tool up front: `--auto-approve`, or a rule in `permissions.allow`. Do not use `--auto-approve` in a repository you care about. See [Permissions and safety](/docs/permissions-and-safety). |
| `Plan (read-only session — nothing was executed): …` | You passed `--read-only`, so igni planned instead of acting. That is what the flag is for. | Re-run without `--read-only` to carry the plan out. |
| `Error: no input provided via stdin or -m` | igni was given nothing to work on. | Give it a message with `-m`, or pipe something into it. |

## The run failed

The exit code is **0** when the turn happened and **1** when it did not, so a script can tell. A failed turn always says why on stderr: the exit code of 1 never comes on its own.

| What you see | What it means | What to do |
|---|---|---|
| The command exits 1 | The turn failed before it produced a reply. The reason is on stderr, above the exit. | Read that message. It is usually one of the rows here. |
| The agent says it cannot find a file | igni reads files by running shell commands, and the command was refused or not allowed. | Check the folder is trusted, and check the rule that covers that command. |

## Signing in

| What you see | What it means | What to do |
|---|---|---|
| `igni server did not accept the token (HTTP 401)` | The token is wrong, expired, or for a different server. | Sign in again. A token lasts 30 days. |
| `no token on stdin` | `igni login --token-stdin` was given nothing. | `printf %s "$IGNI_TOKEN" | igni login --token-stdin` — the token is read from standard input and never taken as an argument, so it stays out of your shell's history. |
| `nobody signed in within 300s` | The browser flow finished on nobody's screen. The wait is five minutes; `igni login --timeout <seconds>` changes it. | Open the address igni printed, sign in there, and try again. On a machine with no browser, use `--token-stdin`. |
| The client cannot find your server | igni looks up your domain's record: `https://<domain>/.well-known/igni.json` or the DNS TXT record `_igni.<domain>`. Without one it asks where your igni is. | Publish the record, or set `api_url` in `~/.igni/config.yaml`. See [Administering your organisation](/docs/administering-your-organisation). |

## The desktop app

| What you see | What it means | What to do |
|---|---|---|
| `backend exited before signalling ready: <reason>` | The app's backend process died before it announced itself. | **Diagnose Backend** in the app's File menu says what it found. If the backend is damaged, **Reinstall Backend (Clean)** starts again. |
| `Running ignite-ember v1.0.3, expected v1.0.4.` | The app is running a backend of a different version from the one it expects. | **Diagnose Backend** for the full report. Usually a backend installed by hand, or an upgrade that did not finish. |
| The app cannot download its backend | The machine has no route out. | Install igni-core into a Python 3.12 environment of your own and point the app at it with `runtime_python`. See [Installing igni](/docs/installing-igni). |
| The Windows build shows "unknown publisher" | Windows and Linux builds are not code-signed. | Nothing to fix. It is the expected first-launch prompt. |
| The app will not update itself | Only the macOS build updates itself. | Install each new release by hand from the releases page. |

## Extensions

| What you see | What it means | What to do |
|---|---|---|
| `<bundle> has no manifest.json, so it is not an extension.` | You pointed `igni ext` at a directory that is not an extension bundle. | Point it at the bundle — the directory holding `manifest.json`. |
| `<path> is not a valid manifest: <detail>` | The manifest is malformed, and the detail says which field. | Fix the field the detail names. |
| `'<id>' is not a usable directory name` | The extension's id cannot be a directory name. | Change the id in the manifest. |
| `<id> is already installed at <path>. Pass --replace to upgrade it, which re-asks for its permissions.` | The extension is installed already, and igni will not overwrite it silently — an administrator's permission grants belong to the version they accepted. | Pass `--replace` to upgrade it. That re-asks for its permissions. |
| `<id> does not declare ['<key>'].` | A settings write named a key the extension does not declare. | Write only the keys the extension declares. |
| `<id>: '<key>' must be one of <options>` | The value is not one the setting allows. | Use one of the listed options. |
| An extension will not start | `igni ext doctor <bundle>` checks the manifest, starts the process the way igni would, and asks it over MCP for its tools. | Run it. It writes nothing outside a temporary directory, so it is safe on somebody else's directory. |

## The igni server

| What you see | What it means | What to do |
|---|---|---|
| `401` — *Sign in as a super admin, or supply the break-glass key* | The call needs deployment-admin rights and you are not signed in. | Sign in as a super admin, or supply the break-glass `X-Super-Admin-Key` header. |
| `403` — *Super admin access required* | You are signed in, but not as a super admin. | A super admin has to do it. Re-authenticating will not help: this is a permission, not a session. |
| `403` — *Super admin access required to change deployment configuration* | Same, on a deployment-wide setting. | A super admin, or the break-glass key. |
| `403` — *Invalid super-admin key* | The break-glass key was supplied and is wrong. | Check `SUPER_ADMIN_PASSWORD_HASH` on the server and the key you are sending. |
| `501` — *Super-admin auth is not configured* | A break-glass key was sent, but the server has no hash to check it against. | Set `SUPER_ADMIN_PASSWORD_HASH` to a bcrypt hash. A plaintext value never authenticates, not even against itself. |
| The portal cannot find your nodes | The inference nodes are registered on the deployment, not per organisation. | Only a **super admin** may add, change, probe, drain or remove a node: the nodes serve every organisation on the install. See [Connecting your GPUs](/docs/inference-backends). |

## The offline bundle

`igni-import` refuses rather than half-importing, and prints `igni-import: REFUSED: <reason>`. Nothing that failed is pushed. Images are pushed one at a time, so if a later image is refused, the earlier ones are already in your registry.

| What it refuses | Why | What to do |
|---|---|---|
| The archive holds an absolute path, a `..`, a link or a device file | The bundle is not a plain set of files. | Do not unpack it by hand and re-tar it; that changes what the signature covers. |
| The `MANIFEST` signature does not verify with the key you gave | The bundle is not the one your key signed, or the key is not the release key. | Get the fingerprint from Ignite Ember out of band and compare it. |
| The version in the signed `MANIFEST` differs from `--expect-version` | The bundle is not the version you asked for. | Check the filename, and pass the version you mean. |
| A file is missing, altered, or present but not listed in the `MANIFEST` | The bundle's contents do not match its own manifest. | Treat the bundle as damaged and ask for another. |
| An artefact's files do not match its own `SHA256SUMS` | The same, for one artefact inside the bundle. | The same. |
| Your registry stores an image under a digest other than the signed one | The registry rewrote the image. | Check your registry's policies. |
| An artefact's signature over its `SHA256SUMS` does not verify | The artefact was not signed with the release key. | The same. Nothing is pushed before this is checked. |

**An older `igni-import` refuses a format-2 bundle.** The signature is `MANIFEST.sig` and the tool is `cosign`, not minisign. Verify the first format-2 bundle by hand, or with the `igni-import` from that release. See [Offline updates](/docs/offline-updates).

## Where to go next

- **[Your first session](/docs/your-first-session)** — the whole first run, in order.
- **[Glossary](/docs/glossary)** — what each word means here, and where a word means more than one thing.
- **[Permissions and safety](/docs/permissions-and-safety)** — the five modes, and what each one allows.
- **[Changes and upgrades](/docs/changes-and-upgrades)** — what changed between versions, and what to change in your own code.
