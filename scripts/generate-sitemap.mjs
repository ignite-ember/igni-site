/**
 * Write `public/sitemap.xml` from the documentation manifest.
 *
 * Phase 1 of the docs-versioning plan split the one mixed documentation
 * index into a set per package, so the sitemap now walks
 * `package × article`: a landing for each package (`/docs/<package>`) and
 * a page for each article a multi-page package carries
 * (`/docs/<package>/<slug>`). Single-page packages (fleet, artifacts,
 * codeindex) have only their landing. The SDK paths are unchanged.
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

/** The packages: their slug and whether they are single-page. */
export function docPackages() {
  const block = exportBlock(manifestSource(), 'PACKAGES')
  return objects(block).map((o) => ({
    slug: field(o, 'slug'),
    single: /\bsingle: true/.test(o),
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
 * The SDK documentation's paths, from the index igni-sdk generates
 * (copied into `src/docs/sdk/` by `scripts/sync-sdk-docs.mjs`): the
 * landing page, each package (its overview) and each other page.
 */
export function sdkPaths() {
  const index = JSON.parse(readFileSync(join(ROOT, 'src/docs/sdk/index.json'), 'utf8'))
  return [
    'docs/sdk',
    ...index.pages.map((p) =>
      p.slug === 'overview' ? `docs/sdk/${p.package}` : `docs/sdk/${p.package}/${p.slug}`,
    ),
  ]
}

export function buildSitemap() {
  const packageSlugs = new Set(docPackages().map((p) => p.slug))
  const entries = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
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
