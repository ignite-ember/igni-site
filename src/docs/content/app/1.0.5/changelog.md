# igni app: changes and upgrades

The igni app is the desktop app and the web client. It ships **in lockstep with igni-core**: the two share one version number, the app installs the backend at its own version on first launch, and the app's release refuses to build unless that version of igni-core is already on PyPI. The backend-side changes — the package rename, `~/.ember` → `~/.igni`, the Python floor — are in [the core changelog](/docs/core/changelog).

## Version now

| Package | What it is | Repository | Version now |
|---|---|---|---|
| igni app | the desktop app and the web client | `ignite-ember/igni-app` | 1.0.5 |

**The old repository name still works.** `github.com/ignite-ember/igni` redirects to `github.com/ignite-ember/igni-app`.

## What is published

As of 2026-11-22:

| | Published |
|---|---|
| igni app | GitHub Release **v1.0.5** (and **v1.0.4**) |

**This documentation describes 1.0.5** — the current release.

## igni app 1.0.5

1.0.5 is the current release of the app, the GitHub Release **v1.0.5**. It follows 1.0.4 in the same lockstep with igni-core, so it installs `igni-core==1.0.5` on first launch. It carries the fixes the end-to-end test campaign turned up against the real backend, server and model, each one held by a test:

- **The window tells the truth about the igni server.** The account chip's `cloud_connected` follows the last real request the session made — a connection error, a timeout or a 5xx makes it false, the next success makes it true — with no polling and no extra traffic. A 401 or 403 stays a credentials problem, not a reachability one.
- **A signed-in person is not pushed to a login form because the server is down.** The sign-in wall follows the account, not the connection: the chip reads "signed in, but the igni server is not answering" and the person stays signed in.
- **A pending approval survives the tab it was asked in.** Closing the tab no longer strands a run that is waiting for an answer.
- **The app's per-launch window token no longer sits in the process list.** The shell hands the backend its token over a pipe (`IGNI_WS_TOKEN_FD`) rather than on the command line.

## Where to go next

- **[Installing igni](/docs/app/installing-igni)** — the install commands, per platform.
- **[Your first session](/docs/app/your-first-session)** — one run, from an empty terminal to a finished task.
- **[The core changelog](/docs/core/changelog)** — the backend, the `igni` command and the decisions service.
