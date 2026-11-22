/**
 * The deploy uploads a copy of index.html at every path in
 * `scripts/site-routes.mjs`; a path missing from that list answers 404
 * on a deep link or a reload, however well the app renders it. These
 * tests read the routes a second way — from the React tree App renders
 * and from the docs manifest itself — and fail if the list misses one.
 *
 * Since the per-package split, that includes a landing per package, a
 * page per article, and the retired single-segment `/docs/<slug>`
 * redirects (so an old deep link still serves index.html before the app
 * redirects it).
 */

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import App from '../App'
import { DOCS, LEGACY_REDIRECTS, docHref } from '../docs/docsManifest'
import { routeObjects } from '../../scripts/site-routes.mjs'
import { docVersionedPaths } from '../../scripts/generate-sitemap.mjs'
import { SDK_PAGES } from '../docs/sdkManifest'

/** Every `<Route>` in the element tree App returns, by its `path`. */
function routePaths(node: ReactNode, out: string[] = []): string[] {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return
    const el = child as ReactElement<{ path?: string; index?: boolean; children?: ReactNode }>
    if (el.type === Route && el.props.path) out.push(el.props.path.replace(/^\//, ''))
    routePaths(el.props.children, out)
  })
  return out
}

const objects = routeObjects()

describe('the route copies the deploy uploads', () => {
  it('cover every <Route> the app declares', () => {
    const paths = routePaths(App())
    expect(paths.length).toBeGreaterThanOrEqual(10)
    for (const p of paths) {
      if (p === '*') continue
      if (p.includes(':')) continue // a parameterised route, expanded below
      expect(objects, p).toContain(p)
    }
  })

  it('cover every article in the docs manifest', () => {
    expect(DOCS.length).toBeGreaterThanOrEqual(13)
    for (const d of DOCS) {
      expect(objects, `${d.package}/${d.slug}`).toContain(docHref(d).replace(/^\//, ''))
    }
  })

  it('cover every retired /docs/<slug> redirect', () => {
    // Each legacy URL redirects client-side, but needs an object so the
    // deep link serves index.html in the first place.
    for (const slug of Object.keys(LEGACY_REDIRECTS)) {
      expect(objects, slug).toContain(`docs/${slug}`)
    }
  })

  it('cover every pinned and latest-alias version path', () => {
    // A customer's deep link to an old version must serve index.html, not
    // 404 — so every `docs/<pkg>/<version>[/<slug>]` and `latest` alias
    // needs an object, even though none are in the sitemap.
    const versioned = docVersionedPaths()
    expect(versioned.length).toBeGreaterThan(0)
    for (const path of versioned) expect(objects, path).toContain(path)
    // Spot-checks: a pinned landing, a pinned article, and the aliases.
    expect(objects).toContain('docs/server/0.8')
    expect(objects).toContain('docs/server/0.8/self-hosting-the-server')
    expect(objects).toContain('docs/server/latest')
    expect(objects).toContain('docs/server/latest/self-hosting-the-server')
  })

  it('cover every SDK page', () => {
    expect(SDK_PAGES.length).toBeGreaterThan(30)
    expect(objects).toContain('docs/sdk')
    for (const p of SDK_PAGES) {
      const path = p.slug === 'overview' ? `docs/sdk/${p.package}` : `docs/sdk/${p.package}/${p.slug}`
      expect(objects, path).toContain(path)
    }
  })

  it('cover every page in the sitemap', () => {
    const sitemap = readFileSync(join(process.cwd(), 'public/sitemap.xml'), 'utf8')
    const locs = [...sitemap.matchAll(/<loc>https:\/\/igni\.sh\/?([^<]*)<\/loc>/g)].map((m) => m[1])
    expect(locs.length).toBeGreaterThan(5)
    for (const loc of locs) if (loc) expect(objects, loc).toContain(loc)
  })

  it('are object names, not files or the root', () => {
    for (const o of objects) {
      // No leading/trailing slash, no route parameter, no wildcard. A dot
      // is allowed now — a version segment carries one (`docs/server/0.8`)
      // — but an object that looks like a file (a real extension) is not.
      expect(o).not.toMatch(/^\/|\/$|:|\*/)
      expect(o, `${o} looks like a file`).not.toMatch(/\.(html?|xml|json|js|css|md|txt)$/)
    }
    expect(objects).not.toContain('')
    expect(new Set(objects).size).toBe(objects.length)
  })
})
