/**
 * Every path the site answers, read from `src/App.tsx` and the docs
 * manifest.
 *
 * The site is served from a Cloud Storage bucket behind a load balancer.
 * A path with no object behind it is a 404 there, even though the app
 * would render it. So the deploy uploads a copy of `index.html` at each
 * path listed here (object `fleet`, `compare/agentcore`, `docs/server`,
 * `docs/server/offline-updates`…), and every route answers 200 without
 * touching the load balancer.
 *
 *     node scripts/site-routes.mjs     # one object name per line
 *
 * `src/test/siteRoutes.test.ts` checks this against the routes the app
 * actually declares, so a new page or article cannot ship as a 404. The
 * retired `/docs/<slug>` redirects are included too: their routes are
 * generated in App.tsx, but each still needs an object so a deep link to
 * an old URL serves index.html and the app can redirect it.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  docCanonicalPaths,
  docPackages,
  docVersionedPaths,
  legacyDocPaths,
  sdkPaths,
  sdkVersionedPaths,
} from './generate-sitemap.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The `path` of every `<Route>` in App.tsx, without a leading slash. */
export function declaredPaths() {
  const src = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8')
  return [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1].replace(/^\//, ''))
}

/**
 * Object names for the copies of index.html: every declared path, with
 * the parameterised doc and SDK routes expanded from the manifest, and the
 * retired `/docs/<slug>` redirects added. `/` is index.html itself and `*`
 * matches anything, so neither gets a copy. Any other parameter is an
 * error: this script cannot know its values.
 */
export function routeObjects() {
  const out = []
  const canonical = docCanonicalPaths()
  const packageLandings = new Set(docPackages().map((p) => `docs/${p.slug}`))
  const articlePaths = canonical.filter((p) => !packageLandings.has(p))
  // Pinned and `latest`-alias paths, split by depth: `docs/<pkg>/<version>`
  // landings (three segments) and `docs/<pkg>/<version>/<slug>` articles
  // (four). These redirect to nothing — they render — but each needs a
  // bucket object so an old-version deep link serves index.html.
  const versioned = docVersionedPaths()
  const versionedLandings = versioned.filter((s) => s.split('/').length === 3)
  const versionedArticles = versioned.filter((s) => s.split('/').length === 4)
  for (const p of declaredPaths()) {
    if (p === '*') continue
    if (p === 'docs/:package') {
      // Each package's landing: `docs/<package>`.
      out.push(...packageLandings)
    } else if (p === 'docs/:package/:seg') {
      // The ambiguous two-segment route: a multi-page package's articles
      // at latest (`docs/<package>/<slug>`) and every pinned/`latest`
      // landing (`docs/<package>/<version>`).
      out.push(...articlePaths, ...versionedLandings)
    } else if (p === 'docs/:package/:version/:slug') {
      // Pinned and `latest`-alias articles: `docs/<package>/<version>/<slug>`.
      out.push(...versionedArticles)
    } else if (p === 'docs/sdk/:seg' || p === 'docs/sdk/:seg/:page' || p === 'docs/sdk/:version/:pkg/:page') {
      // The SDK pages. Canonical, from the latest snapshot's index:
      // `docs/sdk/<package>` for each overview, `docs/sdk/<package>/<page>`
      // for the rest. Pinned, for every snapshot and the `latest` alias:
      // `docs/sdk/<version>` (landing), `docs/sdk/<version>/<package>`,
      // `docs/sdk/<version>/<package>/<page>`. Split by depth between the
      // three routes, which tell a version from a package by the version list.
      const depth = p.split('/').length
      out.push(...[...sdkPaths(), ...sdkVersionedPaths()].filter((s) => s.split('/').length === depth))
    } else if (p.includes(':') || p.includes('*')) {
      throw new Error(`site-routes: no way to list the values of "${p}"; teach scripts/site-routes.mjs`)
    } else {
      out.push(p)
    }
  }
  // The retired single-segment /docs/<slug> redirects (generated in App.tsx
  // with path={`docs/${slug}`}, so not in declaredPaths).
  out.push(...legacyDocPaths())
  return [...new Set(out)]
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(routeObjects().join('\n'))
}
