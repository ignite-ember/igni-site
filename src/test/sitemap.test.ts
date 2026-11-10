/**
 * The sitemap must describe the site that exists.
 *
 * The committed `public/sitemap.xml` listed twelve URLs, of which nine
 * were wrong: `/pricing`, `/login` and `/signup` — which the public
 * build sends to `/` — and seven documentation slugs from before the
 * documentation was rebuilt (`docs/onboarding`, `docs/agents`,
 * `docs/tools`, `docs/orchestration`, `docs/codeindex`,
 * `docs/configuration`, `docs/migration`). A sitemap is the one file
 * written *for* a crawler, so a stale entry is not a cosmetic problem:
 * it is an instruction to index a redirect.
 *
 * Nothing had connected the slug list to the manifest, so the rule here
 * is that the file equals what `scripts/generate-sitemap.mjs` writes.
 * Adding an article and forgetting to regenerate fails here rather than
 * in somebody's search console.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildSitemap, docSlugs, ORIGIN, sdkPaths } from '../../scripts/generate-sitemap.mjs'

// `import.meta.url` is an http: URL under the vite dev transform, so
// the path is resolved from the project root instead.
const COMMITTED = readFileSync(join(process.cwd(), 'public/sitemap.xml'), 'utf8')

describe('the generator reads something', () => {
  it('finds every article', () => {
    // Guards the regex: a parser that matched nothing would make the
    // comparison below pass against an empty sitemap.
    expect(docSlugs().length).toBeGreaterThanOrEqual(13)
    expect(docSlugs()).toContain('artifacts')
  })
})

describe('the committed sitemap', () => {
  it('is exactly what the generator writes', () => {
    expect(COMMITTED).toBe(buildSitemap())
  })

  it('lists only routes the public build serves', () => {
    // `/`, the product pages, the AgentCore comparison, `/docs` and
    // `/docs/:slug` — see App.tsx. Everything else is a redirect to `/`.
    const locs = [...COMMITTED.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].slice(ORIGIN.length),
    )
    const products = ['codeindex', 'artifacts', 'fleet', 'factory'].map((s) => `/${s}`)
    const allowed = new Set([
      '/',
      '/docs',
      '/compare/agentcore',
      ...products,
      ...docSlugs().map((s) => `/docs/${s}`),
      ...sdkPaths().map((s) => `/${s}`),
    ])

    expect(locs.filter((l) => !allowed.has(l))).toEqual([])
  })

  it('lists the SDK documentation, down to a reference page', () => {
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/igni-client</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/igni-client/scheduler</loc>`)
  })

  it('lists the npm packages\u2019 pages too', () => {
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/extension-bridge</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/ui-react</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/ui-css</loc>`)
  })

  it('lists the AgentCore comparison', () => {
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/compare/agentcore</loc>`)
  })
})
