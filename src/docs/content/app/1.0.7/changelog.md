# igni app: changes and upgrades

The igni app is the desktop app and the web client. It ships **in lockstep with igni-core**: the two share one version number, the app installs the backend at its own version on first launch, and the app's release refuses to build unless that version of igni-core is already on PyPI. The backend-side changes — the package rename, `~/.ember` → `~/.igni`, the Python floor — are in [the core changelog](/docs/core/changelog).

## Version now

| Package | What it is | Repository | Version now |
|---|---|---|---|
| igni app | the desktop app and the web client | `ignite-ember/igni-app` | 1.0.7 |

**The old repository name still works.** `github.com/ignite-ember/igni` redirects to `github.com/ignite-ember/igni-app`.

## What is published

| | Published |
|---|---|
| igni app | GitHub Release **v1.0.7** (and **v1.0.6**) |

**This documentation describes 1.0.7** — the current release. There is no separate 1.0.6 snapshot: what 1.0.6 changed is below, and these pages include it.

## igni app 1.0.5

1.0.5 follows 1.0.4 in the same lockstep with igni-core, so it installs `igni-core==1.0.5` on first launch. It carries the fixes the end-to-end test campaign turned up against the real backend, server and model, each one held by a test:

- **The window tells the truth about the igni server.** The account chip's `cloud_connected` follows the last real request the session made — a connection error, a timeout or a 5xx makes it false, the next success makes it true — with no polling and no extra traffic. A 401 or 403 stays a credentials problem, not a reachability one.
- **A signed-in person is not pushed to a login form because the server is down.** The sign-in wall follows the account, not the connection: the chip reads "signed in, but the igni server is not answering" and the person stays signed in.
- **A pending approval survives the tab it was asked in.** Closing the tab no longer strands a run that is waiting for an answer.
- **The app's per-launch window token no longer sits in the process list.** The shell hands the backend its token over a pipe (`IGNI_WS_TOKEN_FD`) rather than on the command line.

## igni app 1.0.6

1.0.6 is the desktop app's new look, and installs `igni-core==1.0.6`. The release notes are [docs/releases/v1.0.6.md](https://github.com/ignite-ember/igni-app/blob/main/docs/releases/v1.0.6.md) in igni-app; [the desktop window](/docs/app/installing-igni#the-desktop-window) describes what it added.

- **The sidebar says what every chat is doing**: a turning ring while a run works, an amber "waiting" pill while it waits on your approval, and a blue dot until you open a chat whose run finished while you were elsewhere. Read state follows you across windows and devices, and chats are listed newest first by their last message. "+ New chat" moved to the head of the sidebar and the account menu to its foot.
- **A read-only Files viewer docks beside the chat**, with tabs, one search box, rendered Markdown (with mermaid), and images and PDFs drawn in place.
- **Chat search has a This chat / All chats scope.**
- **MCPs, Extensions and Plugins read as one card catalogue.** The MCPs page reloads `.mcp.json` without a restart, a failed MCP server says what to check, an extension opens onto its own page, and plugins show and filter by category.
- **Stop shows while an approval waits**, and does what Escape does. An approval the backend dropped leaves the screen.
- **This computer or the cloud.** The desktop can run igni on this computer or in your cloud igni, as your group's mode allows, with the cloud's state on the status line. Until a server offers a cloud igni, the app behaves as before.
- **Linux and Windows installs update themselves**: `latest.json` carries the AppImage, the `.msi` and the NSIS installer, each with its own signature. A `.deb` or `.rpm` install is not offered the AppImage.
- **A certificate problem says so**, in the updater and in the first-launch `uv` download, which now trusts the system's certificates and honours `HTTPS_PROXY`.
- **A backend that crashes is started again**, up to three crashes in five minutes.
- **The Linux menu and the Windows bridges work.** Close, Minimize and Maximize work on Linux; external links, menu events and `igni://` links reach the page on Windows.
- **Two browser tabs on one chat both work**, and the visualizer's card says what it could not draw and tells the backend what it drew.

Its first start adds one table to the global database, for the chats' read state.

## igni app 1.0.7

1.0.7 is the current release, the GitHub Release **v1.0.7**, and installs `igni-core==1.0.7`. The release notes are [docs/releases/v1.0.7.md](https://github.com/ignite-ember/igni-app/blob/main/docs/releases/v1.0.7.md).

- **A cat beside "+ New chat" shows what igni is doing.** It thinks while a run starts, works while the reply streams and waits while a run asks for your approval; when the open chat is idle, it shows what your other chats are doing. It is alarmed for a few seconds after a run fails, and happy for a few seconds after a run of 15 seconds or more finishes. The account menu's **Cat in the header** switch hides it on this device. See [the cat](/docs/app/installing-igni#the-cat).
- **The window hears how you feel about igni.** The backend's local Laya model reads whether each message you send is pleased or displeased with igni, in any language, and nothing leaves your machine for this. When you are pleased the cat is happy for 3 seconds; when you are displeased it closes its eyes for 3 seconds.

**Still open:** a message a `UserPromptSubmit` hook blocks leaves an old approval card up, and the cloud switch needs a server that offers a cloud igni.

## Where to go next

- **[Installing igni](/docs/app/installing-igni)** — the install commands, per platform.
- **[Your first session](/docs/app/your-first-session)** — one run, from an empty terminal to a finished task.
- **[The core changelog](/docs/core/changelog)** — the backend, the `igni` command and the decisions service.
