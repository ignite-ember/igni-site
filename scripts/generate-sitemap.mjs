/**
 * Write `public/sitemap.xml` from the documentation manifest.
 *
 * It had drifted badly: it advertised `/pricing`, `/login`, `/signup`
 * and seven documentation slugs — `docs/onboarding`, `docs/agents`,
 * `docs/tools`, `docs/orchestration`, `docs/codeindex`,
 * `docs/configuration`, `docs/migration` — none of which the public
 * site serves. The public build routes `/`, `/docs` and `/docs/:slug`
 * and sends everything else to `/`, so nine of its twelve entries were
 * telling a crawler to index a redirect.
 *
 * Generated rather than hand-written for the usual reason: the slug
 * list has one source of truth and this is not it.
 *
 *     node scripts/generate-sitemap.mjs
 *
 * `tests/sitemap.test.ts` fails if the committed file is not what this
 * would write, so adding an article and forgetting this step is caught
 * before it ships.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

export const ORIGIN = 'https://ignite-ember.sh'

/** Slugs in manifest order. Read as text: this script runs under plain
 *  node, which cannot import a `.ts` module that does `?raw` imports. */
export function docSlugs() {
  const src = readFileSync(join(ROOT, 'src/docs/docsManifest.ts'), 'utf8')
  return [...src.matchAll(/^\s*slug: '([a-z0-9-]+)',$/gm)].map((m) => m[1])
}

export function buildSitemap() {
  const entries = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    // The product pages, one per paid module (src/pages/ProductPage.tsx).
    ...['codeindex', 'artifacts', 'fleet', 'factory'].map((slug) => ({
      loc: `/${slug}`,
      priority: '0.9',
      changefreq: 'monthly',
    })),
    { loc: '/docs', priority: '0.9', changefreq: 'weekly' },
    ...docSlugs().map((slug) => ({
      loc: `/docs/${slug}`,
      priority: '0.8',
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
  console.log(`wrote ${out} — ${docSlugs().length} articles`)
}
