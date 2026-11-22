# Documentation: per package, per version

This directory holds the site's documentation. It is all per-package and
per-version; how a package's content gets here is one of three ways:

- **Hand-written docs** (`content/`, indexed by `docsManifest.ts`) — the
  packages `core`, `app`, `fleet`, `artifacts`, `codeindex`. Authored here and
  frozen per release with `snapshot` (below).
- **Generated-next-to-code docs** — authored in the package's own repository and
  copied in with `scripts/sync-docs.mjs`, so a release produces its own snapshot
  with no hand-typed version folder:
  - **`server`** (`content/server/`, still indexed by `docsManifest.ts`) is
    generated in igni-server (`make docs-site`) and copied in; it lands in the
    same hand-written layout the site renders, so nothing downstream changed.
    This is the Phase 3 pilot — `server` left the hand-written group above.
  - **The SDK** (`sdk/`, indexed by `sdkManifest.ts`) is generated in igni-sdk
    and copied in; versioned per package by its `index.json`.

## Layout

```
content/<package>/<version>/<slug>.md
```

e.g. `content/server/0.8.0/self-hosting-the-server.md`. Each `<version>`
folder is a **frozen snapshot**: once a release is cut, that folder is never
edited again. `PACKAGES[i].versions` in `docsManifest.ts` lists a package's
released versions, newest first; `versions[0]` is "latest".

## URLs

| URL | Resolves to |
|---|---|
| `/docs/<package>` | the landing at **latest** (canonical) |
| `/docs/<package>/<version>` | the landing pinned to that version |
| `/docs/<package>/latest` | alias that always follows the newest |
| `/docs/<package>/<slug>` | an article at **latest** (canonical) |
| `/docs/<package>/<version>/<slug>` | an article pinned to that version |
| `/docs/<package>/latest/<slug>` | the alias form |

The version-less (canonical) form is what the nav, the in-article links and
the sitemap use, so a bookmark keeps working across releases. The retired
Phase-1 `/docs/<slug>` URLs still redirect to the canonical latest path.

Only the **latest** (canonical) pages are in `public/sitemap.xml`. Pinned
old-version URLs are deliberately excluded from the sitemap — a crawler
should index "the server docs", not every historical snapshot — but each
still gets a bucket object (`scripts/site-routes.mjs`) so a customer's deep
link to an old version serves `index.html` rather than 404ing.

## Adding a version at release time

### A hand-written package (core, app, fleet, …)

When, say, igni core 1.1.0 ships:

1. **Freeze the snapshot.** Copy the current latest folder to the new version:

   ```
   node scripts/sync-docs.mjs core snapshot 1.1.0
   ```

   This copies `content/core/1.0.5/` → `content/core/1.1.0/` (refusing to
   overwrite an existing snapshot — they are immutable).

2. **Edit the new folder** for the release: update the prose, the version
   strings, add a changelog entry. The old `1.0.5/` folder is left untouched.

3. **Prepend the version** in `docsManifest.ts`:
   `versions: ['1.1.0', '1.0.5']`. `1.1.0` becomes "latest".

4. **Regenerate the sitemap and bucket objects:**

   ```
   npm run sitemap          # public/sitemap.xml (latest pages)
   node scripts/site-routes.mjs   # the object list the deploy uploads
   ```

5. `npm test` and `npm run build` check everything is wired (the sitemap
   matches, every URL has an object, every link resolves).

### A generated-next-to-code package (server)

The server docs are **not** snapshotted by hand — there is no `snapshot` step for
them, and `sync-docs.mjs server snapshot …` refuses. The source lives in
igni-server under `docs/site-src/`, and a release stamps its own version folder.
When igni server 0.9.0 ships:

1. **In igni-server:** bump the version (`app/config.py` / `pyproject.toml`, the
   one number `test_one_version_number.py` keeps), edit the articles under
   `docs/site-src/`, and run `make docs-site`. That writes
   `docs/site/server/0.9.0/` and the test keeps it current.

2. **Here**, with an igni-server checkout beside this repository (or at
   `IGNI_SERVER_DIR`):

   ```
   node scripts/sync-docs.mjs server    # copies docs/site/server/0.9.0/ →
                                         #   content/server/0.9.0/
   ```

   It only touches the version folders igni-server emits; the old `0.8.0/`
   folder stays frozen.

3. **Prepend the version** in `docsManifest.ts`: `versions: ['0.9.0', '0.8.0']`,
   and add any new article's title/description/category to `DOCS`.

4–5. Regenerate the sitemap and bucket objects and run the checks, exactly as
above.

The SDK docs work the same way: `node scripts/sync-docs.mjs sdk` copies
igni-sdk's generated output, which carries its own per-package version in
`sdk/index.json`.

Core, app and fleet remain hand-written for now; Phase 3 moves one package at a
time, and `server` is the pilot. When another moves next to its code, its
release step becomes the generated flow above and everything downstream is
unchanged.
