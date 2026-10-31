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
 * It covers two things an article can name and get wrong:
 *
 * - `](/docs/<slug>)` — must be an article in the manifest.
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

import { DOCS } from '../docsManifest'
import { DIAGRAM_NAMES } from '../docDiagramNames'

const SLUGS = new Set(DOCS.map((d) => d.slug))

/** `](/docs/foo)` and `](/docs/foo#heading)`. */
const DOC_LINK = /\]\(\/docs\/([a-z0-9-]+)(?:#[a-z0-9-]+)?\)/g
const DIAGRAM_FENCE = /```igni-diagram\n([^\n]+)\n```/g

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
    const total = DOCS.reduce((n, d) => n + matches(d.content, DOC_LINK).length, 0)

    expect(total).toBeGreaterThan(0)
  })

  it('the link pattern matches a real link and not a bare path', () => {
    expect(matches('see [Artifacts](/docs/artifacts) for more', DOC_LINK)).toEqual(['artifacts'])
    expect(matches('the path /docs/artifacts is served', DOC_LINK)).toEqual([])
  })

  it('at least one article embeds a diagram', () => {
    const total = DOCS.reduce((n, d) => n + matches(d.content, DIAGRAM_FENCE).length, 0)

    expect(total).toBeGreaterThan(0)
  })
})

describe.each(DOCS.map((d) => [d.slug, d.content] as const))('%s', (slug, content) => {
  it('links only to articles that exist', () => {
    const broken = matches(content, DOC_LINK).filter((s) => !SLUGS.has(s))

    expect(broken, `${slug} links to ${broken.join(', ')}, which no article serves`).toEqual([])
  })

  it('names only diagrams that are drawn', () => {
    const unknown = matches(content, DIAGRAM_FENCE).filter(
      (n) => !(DIAGRAM_NAMES as readonly string[]).includes(n),
    )

    expect(unknown, `${slug} asks for diagram(s) ${unknown.join(', ')}`).toEqual([])
  })

  it('does not link to itself', () => {
    // A "next step" pointing at the page you are on is a dead end that
    // looks like navigation.
    expect(matches(content, DOC_LINK)).not.toContain(slug)
  })
})

/**
 * The crawler fallback in `index.html` is markup, so nothing imports
 * it and nothing type-checks it — and it had five dead links:
 * `/docs/onboarding`, `/docs/agents`, `/docs/tools`, `/docs/codeindex`
 * and `/docs/orchestration`, all slugs from before the rebuild. It is
 * the copy served to a crawler and to a reader with no JavaScript, so
 * those were the links most likely to be followed by something that
 * cannot recover from a redirect to `/`.
 */
describe('the no-script fallback in index.html', () => {
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
  const linked = [...html.matchAll(/href="\/docs\/([a-z0-9-]+)"/g)].map((m) => m[1])

  it('links to some documentation', () => {
    expect(linked.length).toBeGreaterThan(0)
  })

  it.each(linked)('/docs/%s is an article the manifest defines', (slug) => {
    expect(SLUGS.has(slug)).toBe(true)
  })

  it('does not offer routes the public build redirects away', () => {
    // `/login` and `/signup` go to `/` on the public site, so a crawler
    // following them indexes a redirect.
    expect(html).not.toContain('href="/login"')
    expect(html).not.toContain('href="/signup"')
  })
})
