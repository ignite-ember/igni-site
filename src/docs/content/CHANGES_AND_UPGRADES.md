igni is four things that ship separately. This page says which is which, what changed at each of the recent boundaries, and what you have to do when you cross one.

## The four products

| Product | What it is | Repository | Version now |
|---|---|---|---|
| igni-core | the backend, the `igni` command, the decisions service | `ignite-ember/igni-core` | 1.0.4 |
| igni app | the desktop app and the web client | `ignite-ember/igni-app` | 1.0.4 |
| igni server | the API, the portal, the migrations | `ignite-ember/igni-server` | 0.7.0 |
| the SDKs | igni-client, igni-service, igni-extension, and the npm packages | `ignite-ember/igni-sdk` | 0.2.0 |

igni-core and igni app share one version number and are released in lockstep: the app installs the backend at its own version, and the app's release refuses to build unless that version of igni-core is already on PyPI. igni server and the SDKs version independently, because different people install them at different times.

**The old repository names still work.** `github.com/ignite-ember/igni` redirects to `github.com/ignite-ember/igni-app`, and Homebrew's `ignite-ember/tap` is the repository `ignite-ember/homebrew-tap`.

## What is published, and what this documentation describes

As of 2026-11-10:

| | Published | Not published |
|---|---|---|
| igni-core | `ignite-ember` **1.0.3** on PyPI — the pre-split monolith, whose module is `ember_code` | `igni-core` is not on PyPI, and neither is `igni-cloud`. 1.0.4 lives on the `release/1.0.4` branch. |
| igni app | GitHub Release **v1.0.3** | v1.0.4 is not tagged |
| igni server | the git tag **v0.7.0** | no GitHub Release, and no image publicly readable in the container registry |
| the SDKs | PyPI **0.1.0** for the three Python packages | 0.2.0 is not tagged, and npm has no `@ignite-ember` scope |

**This documentation describes 1.0.4 and 0.7.0** — the versions in the source trees, which are the versions the rest of these pages are written against. Where that is ahead of what is published, this page says so. [Installing igni](/docs/installing-igni) carries the same note.

## igni-core 1.0.4: the package and the module were renamed

The monolith was split. igni's backend and CLI are now the **`igni-core`** distribution, and the module every import uses is **`igni_core`**. The old names are the ones people still have in their scripts:

| | Before | After |
|---|---|---|
| Package on PyPI | `ignite-ember` | `igni-core` (canonical), with `ignite-ember` as an alias |
| Python module | `ember_code` | `igni_core` |
| Command | `ignite-ember`, and `igni` beside it | `igni` — and `ignite-ember` keeps working as an alias of it |
| Cloud layer | inside the monolith | its own package, `igni-cloud` |

The alias package is not a fork. It carries metadata and nothing else, and depends on `igni-core` at the same version:

```bash
pip install 'ignite-ember[decisions]==1.0.4'   # installs igni-core 1.0.4
```

Nothing on PyPI answers to that yet — 1.0.4 is not published — but the alias re-exports every extra `igni-core` has, so the command above will install the decisions service along with the backend.

Both commands point at the same entry point, `igni_core.__main__:main`, so an existing shell alias or script keeps working.

**The cloud layer moved out.** `igni-cloud` is a separate distribution now, found through the `igni.layers` and `igni.storage` entry points: `igni.layers` names `CloudLayer`, and `igni.storage` names `PostgresStorage`. A deployment that used the shared PostgreSQL store installs it explicitly. It is not on PyPI yet either.

**The decisions service stays in the core**, behind the `decisions` extra: `python -m igni_core.decisions_server`. Leave the extra out on a backend whose `IGNI_DECISIONS_URL` points at a shared one.

### What to change in your own code

| Was | Is now |
|---|---|
| `from ember_code...` | `from igni_core...` |
| `python -m ember_code.backend` | `python -m igni_core.backend` |
| `pip install ignite-ember` | `pip install igni-core` (or leave it: the alias resolves) |
| `ignite-ember -m "..."` | `igni -m "..."` |

**Nothing imports the old package any more, and the old package stays where it was installed.** Upgrading puts the new backend in the same environment; it does not remove what was there.

### The Python version

igni-core requires **Python 3.12 exactly** — `>=3.12,<3.13`. Not a floor. The desktop app ships 3.12 and installs 3.12, and the failure mode on any other version is silent rather than loud.

## Where igni keeps things: `~/.ember` became `~/.igni`

The directory was called `.ember` because the package still was. The new release renames it, once, without losing anything:

| | Before | After |
|---|---|---|
| Home | `~/.ember/` | `~/.igni/` |
| Project | `<project>/.ember/` | `<project>/.igni/` |
| Project instructions | `<project>/ember.md` | `<project>/igni.md` |

The rename is deliberately boring, because the home directory holds `credentials.json` and `client_state.db` — a half-finished rename signs somebody out, and a rename that never happens makes a working install look like a fresh one:

- **Rename, never merge.** If the destination already exists, both are left alone. Two directories with overlapping state is worse than being asked to pick one.
- **Never follow a symlink.** A symlinked `.ember` is left for somebody who knows where it points.
- **It never fails a session.** A migration that cannot run does not stop igni starting; the legacy directory stays and the next run tries again.
- **The fallback is the real guarantee.** Even where the rename never ran, igni reads the legacy directory when the new one is absent. The rename is tidiness; the fallback is correctness.

`ember.md` and `igni.md` are both read, so a project that still has `ember.md` keeps working. A new project gets `igni.md`.

## igni server 0.7.0: the pools are gone

0.7.0 is the first release of igni server that has ever shipped, and it changes an interface.

**Inference pools are gone.** igni server routes chat over your nodes and nothing else; CodeIndex runs its own nodes from its own configuration. A node no longer has `pools` — in registration, on the portal's node page, or in storage, where a migration drops the column — and `GET /v1/portal/inference` answers one flat list of nodes with one set of totals, where it used to answer a list of pools. The `codeindex` pool type is gone with it.

**What was left of CodeIndex and Artifacts in igni server is gone too**, because it was not theirs to host: the chart's `artifacts:` block and its second Ingress and ConfigMap, `docker-compose.artifacts.yml`, the `documents_base_url` and `app_base_url` settings, the Redis-database formula for each product, the portal's link to Artifacts' document settings, and the `repo`, `event_id` and `commit` log fields. Those products are registered services like any other, and deploy themselves.

**New in 0.7.0:**

- **Personal API keys.** A person makes a key on the portal and gives it to a program, which exchanges it at the token endpoint for a 15-minute session as them. Keys expire, stop when the person signs out everywhere, leaves or is deactivated, and are recorded at every exchange. A key's session cannot make keys, take a CLI session, sign a VM in or authorise a service.
- **A licence page.** *Deployment → Licence* shows the licensee, the licence ID, its kind and issue date, and each paid module's state, expiry, band and message, and installs a licence file there. Everybody signed in sees *Licensed to &lt;customer&gt; · &lt;licence ID&gt;* at the foot of the sidebar.
- **A refused client is told its state.** A `401 invalid_client` answer now carries `client_state` (`pending` or `revoked`), so an SDK need not read `error_description`. Only an assertion that verifies against the client's key is told; every other refusal is unchanged.

**The `dev-` and `stage-` images are gone.** The release workflow builds unprefixed tags now, and it builds three of them for the API image — the commit, the version, and a moving `:latest` — and two for the portal, the commit and `:latest`. The offline bundle carries both images under the version tag whatever the registry holds.

### The offline bundle changed shape

**The bundle is signed with cosign instead of minisign**, with the same release key as the images. You now hold one public key (`cosign.pub`) and need one tool (`cosign`):

- the signature is **`MANIFEST.sig`**, not `MANIFEST.minisig`;
- the bundle **format is 2**, and an earlier `igni-import` refuses it.

So verify the first format-2 bundle by hand, or with the `igni-import` from this release. See [Offline updates](/docs/offline-updates).

## The SDKs 0.2.0

The SDKs are six packages that carry one version:

| | Package | Registry |
|---|---|---|
| Python | `igni-client`, `igni-service`, `igni-extension` | PyPI |
| TypeScript | `@ignite-ember/extension-bridge`, `@ignite-ember/ui-react`, `@ignite-ember/ui-css` | npm |

0.2.0 is a minor release because the refactor changed what an extension relies on — the fakes' shape, the typed client, the bridge's types. The notes are in each Python package's README, under *Changes since 0.1.0*; the npm packages that carry them write *Changed since 0.1.0, on purpose* instead, and `@ignite-ember/ui-css` has no such section. One large change is `igni_service.testing`: the fake is one object of collaborators now, so `fake.add_organisation(...)` is `fake.directory.add_organisation(Organisation(...))` and `fake.person_token(...)` is `fake.signer.person_token(...)`.

Nothing is published for 0.2.0 yet. The tag it will carry is `sdk-v0.2.0`, and publishing waits for it — and, for the npm half, for the `@ignite-ember` scope to exist.

## Coming from Claude Code

igni reads Claude Code's files as they are, with no configuration: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json` and `.mcp.json`. Agent files, skills, MCP configuration and hooks use the same formats, and a plugin built for Claude Code works in igni unchanged.

What differs is who does the work. Claude Code spawns sub-agents by hand, one level deep. igni has an Orchestrator that assembles a team for each task, picks the agents and the team mode — `route`, `coordinate`, `broadcast` or `tasks` — and lets any agent spawn a sub-team. You describe the task; you do not choose the agents.

See [Agents and orchestration](/docs/agents-and-orchestration).

## Where each changelog lives

Each product keeps its release notes in its own repository, and each is cut on its own schedule.

| Product | Repository | Where the notes are |
|---|---|---|
| igni-core | `github.com/ignite-ember/igni-core` | `docs/releases/` in the repository, and the repository's Releases page once the release is cut |
| igni app | `github.com/ignite-ember/igni-app` | `docs/releases/` in the repository, and the GitHub Release for the tag |
| igni server | `github.com/ignite-ember/igni-server` | `CHANGELOG.md`, in Keep a Changelog format, newest first |
| the SDKs | `github.com/ignite-ember/igni-sdk` | each Python package's README, under *Changes since 0.1.0* — the npm packages that carry one write *Changed since 0.1.0, on purpose*, and `@ignite-ember/ui-css` has none — and, once the `sdk-v*` tag is cut, the GitHub Release for it |

igni server's changelog says when a release changes an interface. While the major version is 0, a minor version may, and 0.7.0's does.

## Where to go next

- **[Installing igni](/docs/installing-igni)** — the install commands, per platform.
- **[Your first session](/docs/your-first-session)** — one run, from an empty terminal to a finished task.
- **[Offline updates](/docs/offline-updates)** — carrying a release into a network with no route out.
