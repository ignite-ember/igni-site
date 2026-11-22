# Documentation: per package, per version

This directory holds the site's documentation. There are two documentation
systems, both per-package, both versioned:

- **Hand-written docs** (`content/`, indexed by `docsManifest.ts`) — the
  packages `core`, `app`, `server`, `fleet`, `artifacts`, `codeindex`.
- **Generated SDK docs** (`sdk/`, indexed by `sdkManifest.ts`) — generated in
  igni-sdk and copied in; versioned per package by its `index.json`.

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

When, say, igni server 0.9.0 ships:

1. **Freeze the snapshot.** Copy the current latest folder to the new version:

   ```
   node scripts/sync-docs.mjs server snapshot 0.9.0
   ```

   This copies `content/server/0.8.0/` → `content/server/0.9.0/` (refusing to
   overwrite an existing snapshot — they are immutable).

2. **Edit the new folder** for the release: update the prose, the version
   strings, add a changelog entry. The old `0.8.0/` folder is left untouched.

3. **Prepend the version** in `docsManifest.ts`:
   `versions: ['0.9.0', '0.8.0']`. `0.9.0` becomes "latest".

4. **Regenerate the sitemap and bucket objects:**

   ```
   npm run sitemap          # public/sitemap.xml (latest pages)
   node scripts/site-routes.mjs   # the object list the deploy uploads
   ```

5. `npm test` and `npm run build` check everything is wired (the sitemap
   matches, every URL has an object, every link resolves).

The SDK docs are not snapshotted by hand — `node scripts/sync-docs.mjs sdk`
copies igni-sdk's generated output, which carries its own per-package version
in `sdk/index.json`.

When the hand-written docs eventually move next to their code and are
generated the way the SDK docs are (Phase 3), step 1 becomes "run that
package's generator into the new version folder"; everything downstream is
unchanged.
