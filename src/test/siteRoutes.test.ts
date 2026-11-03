/**
 * The deploy uploads a copy of index.html at every path in
 * `scripts/site-routes.mjs`; a path missing from that list answers 404
 * on a deep link or a reload, however well the app renders it. These
 * tests read the routes a second way — from the React tree App renders
 * and from the docs manifest itself — and fail if the list misses one.
 */

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import App from '../App'
import { DOCS } from '../docs/docsManifest'
import { routeObjects } from '../../scripts/site-routes.mjs'

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
      if (p === 'docs/:slug') continue // expanded below
      expect(objects, p).toContain(p)
    }
  })

  it('cover every article in the docs manifest', () => {
    expect(DOCS.length).toBeGreaterThanOrEqual(13)
    for (const d of DOCS) expect(objects, d.slug).toContain(`docs/${d.slug}`)
  })

  it('cover every page in the sitemap', () => {
    const sitemap = readFileSync(join(process.cwd(), 'public/sitemap.xml'), 'utf8')
    const locs = [...sitemap.matchAll(/<loc>https:\/\/ignite-ember\.sh\/?([^<]*)<\/loc>/g)].map((m) => m[1])
    expect(locs.length).toBeGreaterThan(5)
    for (const loc of locs) if (loc) expect(objects, loc).toContain(loc)
  })

  it('are object names, not files or the root', () => {
    for (const o of objects) {
      expect(o).not.toMatch(/^\/|\/$|\.|:|\*/)
    }
    expect(objects).not.toContain('')
    expect(new Set(objects).size).toBe(objects.length)
  })
})
