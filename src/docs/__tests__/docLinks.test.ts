/**
 * In-article links and diagram fences must both resolve.
 *
 * The documentation was fourteen articles with no path through it —
 * literally zero links from one to another — so a reader who arrived
 * to deploy the server was never told where to go next. The fix added
 * "Where to go next" sections, and this is what stops them rotting
 * the way the sidebar's links and the sitemap already did: a slug
 * renamed without updating a link is caught here, not by somebody
 * clicking it.
 *
 * Since the per-package split, an in-site doc link is one of:
 *   - `](/docs/<package>)` — a package landing (core, app, server) or a
 *     single-page package (fleet, artifacts, codeindex);
 *   - `](/docs/<package>/<slug>)` — an article inside a multi-page package.
 * Either must point at something the manifest serves. SDK links
 * (`/docs/sdk/...`) are generated and checked elsewhere, so they are
 * skipped here.
 *
 * It covers two things an article can name and get wrong:
 *
 * - a `/docs/...` link whose target no package or article serves.
 * - ```` ```igni-diagram ```` — must name a diagram that is drawn.
 *   An unknown name renders nothing, which is the right behaviour at
 *   runtime and useless as a signal, so the check is here.
 *
 * External links are deliberately not fetched. A test that reaches the
 * network fails for reasons that have nothing to do with the change
 * that is running it.
 */

import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DOCS, PACKAGES, docHref } from '../docsManifest'
import { DIAGRAM_NAMES } from '../docDiagramNames'

/** Every `/docs/...` path the site serves, without the `/docs/` prefix:
 *  each package landing, and each article's canonical path. */
const DOC_PATHS = new Set<string>([
  ...PACKAGES.map((p) => p.slug),
  ...DOCS.map((d) => docHref(d).replace(/^\/docs\//, '')),
])

/** `](/docs/foo)` and `](/docs/foo/bar#heading)` — one or two segments.
 *  Three-segment SDK links do not match and are not checked here. */
const DOC_LINK = /\]\(\/docs\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)(?:#[a-z0-9-]+)?\)/g
const DIAGRAM_FENCE = /```igni-diagram\n([^\n]+)\n```/g

/** Captured `/docs/...` targets, skipping the SDK section. */
function docLinks(content: string): string[] {
  return [...content.matchAll(DOC_LINK)]
    .map((m) => m[1].trim())
    .filter((p) => p !== 'sdk' && !p.startsWith('sdk/'))
}

function matches(content: string, re: RegExp): string[] {
  return [...content.matchAll(re)].map((m) => m[1].trim())
}

describe('the rules measure something', () => {
  it('there are articles to check', () => {
    expect(DOCS.length).toBeGreaterThanOrEqual(13)
  })

  it('at least one article links to another', () => {
    // Without this the link rule below passes vacuously, which is
    // exactly the state the documentation was already in.
    const total = DOCS.reduce((n, d) => n + docLinks(d.content).length, 0)

    expect(total).toBeGreaterThan(0)
  })

  it('the link pattern matches a package and an article, and not a bare path', () => {
    expect(docLinks('see [Fleet](/docs/fleet) for more')).toEqual(['fleet'])
    expect(docLinks('see [Installing](/docs/app/installing-igni) first')).toEqual([
      'app/installing-igni',
    ])
    expect(docLinks('the path /docs/fleet is served')).toEqual([])
    // The SDK section is generated and checked elsewhere.
    expect(docLinks('[client](/docs/sdk/igni-client)')).toEqual([])
  })

  it('at least one article embeds a diagram', () => {
    const total = DOCS.reduce((n, d) => n + matches(d.content, DIAGRAM_FENCE).length, 0)

    expect(total).toBeGreaterThan(0)
  })
})

describe.each(DOCS.map((d) => [`${d.package}/${d.slug}`, d] as const))('%s', (_id, doc) => {
  const content = doc.content

  it('links only to packages and articles that exist', () => {
    const broken = docLinks(content).filter((p) => !DOC_PATHS.has(p))

    expect(broken, `${_id} links to ${broken.join(', ')}, which nothing serves`).toEqual([])
  })

  it('names only diagrams that are drawn', () => {
    const unknown = matches(content, DIAGRAM_FENCE).filter(
      (n) => !(DIAGRAM_NAMES as readonly string[]).includes(n),
    )

    expect(unknown, `${_id} asks for diagram(s) ${unknown.join(', ')}`).toEqual([])
  })

  it('does not link to itself', () => {
    // A "next step" pointing at the page you are on is a dead end that
    // looks like navigation.
    const self = docHref(doc).replace(/^\/docs\//, '')
    expect(docLinks(content)).not.toContain(self)
  })
})

/**
 * The crawler fallback in `index.html` is markup, so nothing imports
 * it and nothing type-checks it — and it had five dead links from before
 * the rebuild. It is the copy served to a crawler and to a reader with no
 * JavaScript, so those were the links most likely to be followed by
 * something that cannot recover from a redirect to `/`.
 */
describe('the no-script fallback in index.html', () => {
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
  const linked = [...html.matchAll(/href="\/docs\/([a-z0-9/-]+?)"/g)].map((m) => m[1])

  it('links to some documentation', () => {
    expect(linked.length).toBeGreaterThan(0)
  })

  it.each(linked)('/docs/%s is a package or article the manifest serves', (path) => {
    expect(DOC_PATHS.has(path)).toBe(true)
  })

  it('does not offer routes the public build redirects away', () => {
    // `/login` and `/signup` go to `/` on the public site, so a crawler
    // following them indexes a redirect.
    expect(html).not.toContain('href="/login"')
    expect(html).not.toContain('href="/signup"')
  })
})
