/**
 * Write `public/sitemap.xml` from the documentation manifest.
 *
 * Phase 1 of the docs-versioning plan split the one mixed documentation
 * index into a set per package, so the sitemap now walks
 * `package × article`: a landing for each package (`/docs/<package>`) and
 * a page for each article a multi-page package carries
 * (`/docs/<package>/<slug>`). Single-page packages (fleet, artifacts,
 * codeindex) have only their landing. The SDK paths are the latest
 * snapshot's, version-less; a pinned SDK version is not listed.
 *
 * The retired single-segment `/docs/<slug>` URLs are deliberately NOT in
 * the sitemap: they redirect, and a sitemap entry is an instruction to a
 * crawler to index a page, not a redirect. `scripts/site-routes.mjs`
 * lists them instead, because each still needs an object in the bucket.
 *
 * Generated rather than hand-written for the usual reason: the slug list
 * has one source of truth and this is not it.
 *
 *     node scripts/generate-sitemap.mjs
 *
 * `src/test/sitemap.test.ts` fails if the committed file is not what this
 * would write, so adding an article and forgetting this step is caught
 * before it ships.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { TARGET as SDK_DIR, latestSdkDir, sdkVersions } from './sync-docs.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

export const ORIGIN = 'https://igni.sh'

/** The text of `docsManifest.ts`. Read as text: this script runs under
 *  plain node, which cannot import a `.ts` module that does `?raw` imports. */
function manifestSource() {
  return readFileSync(join(ROOT, 'src/docs/docsManifest.ts'), 'utf8')
}

/** The source between an `export const <name>` and the next `export`. */
function exportBlock(src, name) {
  const start = src.indexOf(`export const ${name}`)
  if (start === -1) throw new Error(`generate-sitemap: no export const ${name}`)
  const after = src.indexOf('\nexport ', start + 1)
  return src.slice(start, after === -1 ? undefined : after)
}

/** The flat `{ ... }` objects in a block (manifest entries have no nesting). */
function objects(block) {
  return [...block.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1])
}

function field(objectText, key) {
  const m = objectText.match(new RegExp(`\\b${key}: '([a-z0-9-]+)'`))
  return m ? m[1] : undefined
}

/** A `key: ['a', 'b']` array field, as the list of its string literals. */
function arrayField(objectText, key) {
  const m = objectText.match(new RegExp(`\\b${key}:\\s*\\[([^\\]]*)\\]`))
  if (!m) return []
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

/** The packages: their slug, whether they are single-page, and the
 *  released versions newest-first (`versions[0]` is "latest"). */
export function docPackages() {
  const block = exportBlock(manifestSource(), 'PACKAGES')
  return objects(block).map((o) => ({
    slug: field(o, 'slug'),
    single: /\bsingle: true/.test(o),
    versions: arrayField(o, 'versions'),
  }))
}

/** The articles: slug, package and category. */
export function docArticles() {
  const block = exportBlock(manifestSource(), 'DOCS')
  return objects(block)
    .map((o) => ({
      slug: field(o, 'slug'),
      package: field(o, 'package'),
      category: field(o, 'category'),
    }))
    .filter((a) => a.slug && a.package)
}

/**
 * The canonical documentation paths: a landing for every package, and a
 * page for every article a multi-page package carries. A single-page
 * package's one article is its landing, so it adds nothing beyond it.
 */
export function docCanonicalPaths() {
  const packages = docPackages()
  const single = new Set(packages.filter((p) => p.single).map((p) => p.slug))
  const landings = packages.map((p) => `docs/${p.slug}`)
  const articles = docArticles()
    .filter((a) => !single.has(a.package))
    .map((a) => `docs/${a.package}/${a.slug}`)
  return [...new Set([...landings, ...articles])]
}

/**
 * The retired single-segment `/docs/<slug>` URLs that still need a bucket
 * object (they redirect). These are the moved articles of multi-page
 * packages — except the per-package changelogs, which are new and had no
 * old URL — plus the `RETIRED_DOC_SLUGS` the manifest lists by hand.
 */
export function legacyDocPaths() {
  const packages = docPackages()
  const single = new Set(packages.filter((p) => p.single).map((p) => p.slug))
  const moved = docArticles()
    .filter((a) => !single.has(a.package) && a.category !== 'release-notes')
    .map((a) => `docs/${a.slug}`)
  const retiredBlock = exportBlock(manifestSource(), 'RETIRED_DOC_SLUGS')
  const retired = [...retiredBlock.matchAll(/'([a-z0-9-]+)':/g)].map((m) => `docs/${m[1]}`)
  return [...new Set([...moved, ...retired])]
}

/**
 * The versioned documentation paths that are NOT canonical: every pinned
 * `/docs/<package>/<version>[/<slug>]` and the `latest` literal alias
 * `/docs/<package>/latest[/<slug>]`. These are deliberately absent from
 * the sitemap — only the latest (canonical, version-less) pages are
 * indexed — but each still needs a bucket object so a customer's deep
 * link to an old version serves index.html instead of 404ing. A new
 * release adds its folder and prepends its version in the manifest; this
 * walks `package × version × page` so the new URLs appear automatically.
 */
export function docVersionedPaths() {
  const packages = docPackages()
  const articlesBy = (slug) => docArticles().filter((a) => a.package === slug)
  const out = []
  for (const p of packages) {
    // `latest` is a literal alias segment alongside each concrete version.
    for (const v of ['latest', ...p.versions]) {
      out.push(`docs/${p.slug}/${v}`)
      if (!p.single) {
        for (const a of articlesBy(p.slug)) out.push(`docs/${p.slug}/${v}/${a.slug}`)
      }
    }
  }
  return [...new Set(out)]
}

/** The pages of one SDK snapshot's index, as `[package, slug]`. */
function sdkPagesIn(dir) {
  return JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).pages.map((p) => [p.package, p.slug])
}

/**
 * The SDK documentation's canonical paths, from the index of the latest
 * snapshot igni-sdk generated (copied into `src/docs/sdk/<version>/` by
 * `scripts/sync-docs.mjs sdk`): the landing page, each package (its
 * overview) and each other page. Version-less, so they follow the newest
 * release; only these are in the sitemap.
 */
export function sdkPaths() {
  return [
    'docs/sdk',
    ...sdkPagesIn(latestSdkDir()).map(([pkg, slug]) =>
      slug === 'overview' ? `docs/sdk/${pkg}` : `docs/sdk/${pkg}/${slug}`,
    ),
  ]
}

/**
 * The pinned SDK paths, `docs/sdk/<version>[/<package>[/<page>]]`, for every
 * snapshot and the `latest` alias — each version with the pages it has. Not
 * in the sitemap; each gets a bucket object so an old version's deep link
 * serves index.html.
 */
export function sdkVersionedPaths() {
  const versions = sdkVersions()
  const out = []
  for (const v of ['latest', ...versions]) {
    const dir = join(SDK_DIR, v === 'latest' ? versions[0] : v)
    out.push(`docs/sdk/${v}`)
    for (const [pkg, slug] of sdkPagesIn(dir)) {
      out.push(slug === 'overview' ? `docs/sdk/${v}/${pkg}` : `docs/sdk/${v}/${pkg}/${slug}`)
    }
  }
  return [...new Set(out)]
}

export function buildSitemap() {
  const packageSlugs = new Set(docPackages().map((p) => p.slug))
  const entries = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    // Where the desktop app is downloaded (src/pages/DownloadPage.tsx).
    { loc: '/download', priority: '0.9', changefreq: 'weekly' },
    // The product pages, one per paid module (src/pages/ProductPage.tsx).
    ...['codeindex', 'artifacts', 'fleet', 'factory'].map((slug) => ({
      loc: `/${slug}`,
      priority: '0.9',
      changefreq: 'monthly',
    })),
    // The comparison with AWS Bedrock AgentCore (src/pages/AgentCorePage.tsx).
    { loc: '/compare/agentcore', priority: '0.8', changefreq: 'monthly' },
    { loc: '/docs', priority: '0.9', changefreq: 'weekly' },
    // The per-package documentation: a landing for each package, then its
    // articles (src/pages/DocPackagePage.tsx, DocArticlePage.tsx).
    ...docCanonicalPaths().map((path) => ({
      loc: `/${path}`,
      // A package landing ranks a little above its articles.
      priority: packageSlugs.has(path.slice('docs/'.length)) ? '0.85' : '0.8',
      changefreq: 'monthly',
    })),
    // The SDK documentation (src/pages/SdkLandingPage.tsx, SdkArticlePage.tsx).
    ...sdkPaths().map((path) => ({
      loc: `/${path}`,
      priority: path === 'docs/sdk' ? '0.9' : '0.7',
      changefreq: 'monthly',
    })),
  ]

  const urls = entries
    .map(
      ({ loc, priority, changefreq }) =>
        `  <url>\n` +
        `    <loc>${ORIGIN}${loc}</loc>\n` +
        `    <priority>${priority}</priority>\n` +
        `    <changefreq>${changefreq}</changefreq>\n` +
        `  </url>`,
    )
    .join('\n')

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    '</urlset>\n'
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(ROOT, 'public/sitemap.xml')
  writeFileSync(out, buildSitemap())
  console.log(
    `wrote ${out} — ${docCanonicalPaths().length} doc paths, ${sdkPaths().length} SDK pages`,
  )
}
