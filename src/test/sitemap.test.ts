/**
 * The sitemap must describe the site that exists.
 *
 * Since the per-package split, the sitemap walks `package × article`: a
 * landing for each package and a page for each article a multi-page
 * package carries, plus the SDK pages. The retired single-segment
 * `/docs/<slug>` URLs are deliberately absent — they redirect, and a
 * sitemap entry is an instruction to index a page, not a redirect.
 *
 * Nothing had connected the slug list to the manifest, so the rule here
 * is that the file equals what `scripts/generate-sitemap.mjs` writes.
 * Adding an article and forgetting to regenerate fails here rather than
 * in somebody's search console.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  buildSitemap,
  docCanonicalPaths,
  docVersionedPaths,
  legacyDocPaths,
  ORIGIN,
  sdkPaths,
} from '../../scripts/generate-sitemap.mjs'

// `import.meta.url` is an http: URL under the vite dev transform, so
// the path is resolved from the project root instead.
const COMMITTED = readFileSync(join(process.cwd(), 'public/sitemap.xml'), 'utf8')

describe('the generator reads something', () => {
  it('finds every package landing and the articles under them', () => {
    // Guards the regex: a parser that matched nothing would make the
    // comparison below pass against an empty sitemap.
    expect(docCanonicalPaths().length).toBeGreaterThanOrEqual(20)
    expect(docCanonicalPaths()).toContain('docs/artifacts')
    expect(docCanonicalPaths()).toContain('docs/server/inference-backends')
    expect(docCanonicalPaths()).toContain('docs/app/installing-igni')
  })
})

describe('the committed sitemap', () => {
  it('is exactly what the generator writes', () => {
    expect(COMMITTED).toBe(buildSitemap())
  })

  it('lists only canonical routes the public build serves', () => {
    const locs = [...COMMITTED.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].slice(ORIGIN.length),
    )
    const products = ['codeindex', 'artifacts', 'fleet', 'factory'].map((s) => `/${s}`)
    const allowed = new Set([
      '/',
      '/docs',
      '/compare/agentcore',
      ...products,
      ...docCanonicalPaths().map((s) => `/${s}`),
      ...sdkPaths().map((s) => `/${s}`),
    ])

    expect(locs.filter((l) => !allowed.has(l))).toEqual([])
  })

  it('does not list pinned or latest-alias version URLs', () => {
    // The SEO decision: only the canonical (latest, version-less) pages
    // are indexed. The pinned snapshots and the `latest` alias get a
    // bucket object (site-routes) so they resolve, but a crawler should
    // index "the server docs", not every historical version.
    const versioned = docVersionedPaths()
    expect(versioned.length).toBeGreaterThan(0)
    for (const path of versioned) {
      expect(COMMITTED, path).not.toContain(`<loc>${ORIGIN}/${path}</loc>`)
    }
  })

  it('does not list the retired redirect URLs', () => {
    // Those still get a bucket object (site-routes), but a sitemap entry
    // for a redirect tells a crawler to index the redirect.
    for (const legacy of legacyDocPaths()) {
      expect(COMMITTED).not.toContain(`<loc>${ORIGIN}/${legacy}</loc>`)
    }
  })

  it('lists each package landing and its articles', () => {
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/server</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/server/self-hosting-the-server</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/core/changelog</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/fleet</loc>`)
  })

  it('lists the SDK documentation, down to a reference page', () => {
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/igni-client</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/igni-client/scheduler</loc>`)
  })

  it('lists the npm packages’ pages too', () => {
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/extension-bridge</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/ui-react</loc>`)
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/docs/sdk/ui-css</loc>`)
    // Only the latest SDK release, version-less: no pinned or `latest` alias page.
    expect(COMMITTED).not.toMatch(/\/docs\/sdk\/(latest|\d+\.\d+[^/<]*)(\/|<)/)
  })

  it('lists the AgentCore comparison', () => {
    expect(COMMITTED).toContain(`<loc>${ORIGIN}/compare/agentcore</loc>`)
  })
})
