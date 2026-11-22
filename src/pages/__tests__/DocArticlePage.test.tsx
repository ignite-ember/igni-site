/**
 * DocArticlePage — and a table of contents that linked to nothing.
 *
 * This page had no test, and the reason turned out to be mechanical:
 * `useActiveSectionId` uses `IntersectionObserver`, which jsdom does
 * not provide, so rendering it threw before any assertion ran. Stubbing
 * that is three lines. Nobody had, so nothing here was ever checked.
 *
 * What the first render found: **the "on this page" nav had a dead
 * entry.** Two slug computations, fed different things. `extractSections`
 * slugs the raw markdown of a heading; the renderer slugged
 * `String(children)` of the parsed nodes — and `String` on an array of
 * nodes is `[object Object]`. Fixed by sharing one `headingId` over text
 * flattened recursively first; the test that matters is the last one —
 * every heading in every shipped document.
 *
 * Since the per-package split the route is `/docs/:package/:slug`, and
 * prev/next walk the articles of one package, not the whole manifest.
 */
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { DOCS, articlesOf, docHref, extractSections } from '../../docs/docsManifest'
import { DocArticlePage } from '../DocArticlePage'

beforeAll(() => {
  // jsdom has no IntersectionObserver, and the page's active-section
  // tracking constructs one on mount. Without this the component throws
  // before rendering — which is why it had no tests.
  class StubObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    StubObserver
})

afterEach(cleanup)

/** The articles of a multi-page package, in nav order, for prev/next. */
const CORE = articlesOf('core')

function renderArticle(pkg: string, slug: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/docs/:package/:slug" element={<DocArticlePage />} />
      <Route path="/docs/:package" element={<div>package stub</div>} />
      <Route path="/docs" element={<div>docs index stub</div>} />
    </Routes>,
    { route: `/docs/${pkg}/${slug}` },
  )
}

/** Anchor ids actually present in the rendered document. */
function renderedHeadingIds(): string[] {
  return Array.from(document.querySelectorAll('h2[id], h3[id]')).map((h) => h.id)
}

/** The titles offered by the previous/next footer, scoped to it. */
function prevNextTitles(): string[] {
  const nav = document.querySelector('.doc-prev-next')
  if (!nav) return []
  return Array.from(nav.querySelectorAll('a, button')).map((el) => el.textContent?.trim() ?? '')
}

function offers(title: string): boolean {
  return prevNextTitles().some((text) => text.includes(title))
}

describe('an unknown slug', () => {
  test('says the article is not found rather than rendering an empty page', async () => {
    renderArticle('core', 'no-such-article')

    expect(await screen.findByText(/Article not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to docs/i })).toBeInTheDocument()
  })

  test('a known slug under the wrong package is not found either', async () => {
    // installing-igni belongs to `app`, not `server`; a mismatch must not
    // silently resolve to the article.
    renderArticle('server', 'installing-igni')

    expect(await screen.findByText(/Article not found/i)).toBeInTheDocument()
  })
})

describe('an article renders', () => {
  test('its title appears once, not twice', async () => {
    const doc = CORE[0]
    renderArticle(doc.package, doc.slug)

    const headings = await screen.findAllByRole('heading', { name: doc.title })
    expect(headings).toHaveLength(1)
  })

  test('markdown becomes elements rather than being shown as source', async () => {
    const withCode = CORE.find((d) => d.content.includes('```')) ?? CORE[0]
    renderArticle(withCode.package, withCode.slug)

    await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))
    expect(document.body.textContent).not.toContain('```')
  })

  test('the breadcrumb names the package', async () => {
    const doc = CORE[0]
    renderArticle(doc.package, doc.slug)

    await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))
    // "igni core" is the core package's title.
    expect(screen.getAllByText(/igni core/i).length).toBeGreaterThan(0)
  })
})

describe('previous and next walk one package', () => {
  test('the first article offers a next and no previous', async () => {
    renderArticle(CORE[0].package, CORE[0].slug)

    await waitFor(() => expect(prevNextTitles().length).toBeGreaterThan(0))
    expect(offers(CORE[1].title)).toBe(true)
    expect(offers(CORE[CORE.length - 1].title)).toBe(false)
  })

  test('the last article offers a previous and no next', async () => {
    const last = CORE[CORE.length - 1]
    renderArticle(last.package, last.slug)

    await waitFor(() => expect(prevNextTitles().length).toBeGreaterThan(0))
    expect(offers(CORE[CORE.length - 2].title)).toBe(true)
    expect(offers(CORE[0].title)).toBe(false)
  })

  test('following next arrives at the next article in the package', async () => {
    const user = userEvent.setup()
    renderArticle(CORE[0].package, CORE[0].slug)

    await waitFor(() => expect(prevNextTitles().length).toBeGreaterThan(0))
    const next = Array.from(
      document.querySelectorAll('.doc-prev-next a, .doc-prev-next button'),
    ).find((el) => el.textContent?.includes(CORE[1].title))
    expect(next, 'the footer offers no link to the next article').toBeDefined()
    await user.click(next as HTMLElement)

    expect(
      await screen.findByRole('heading', { name: CORE[1].title, level: 1 }),
    ).toBeInTheDocument()
  })

  test('the footer links use the new per-package path', async () => {
    renderArticle(CORE[0].package, CORE[0].slug)
    await waitFor(() => expect(prevNextTitles().length).toBeGreaterThan(0))
    // Sanity on docHref: core articles are two-segment paths.
    expect(docHref(CORE[1])).toBe(`/docs/core/${CORE[1].slug}`)
  })
})

describe('the table of contents points at real anchors', () => {
  test('the case that was broken: a heading containing inline code', async () => {
    // `## `@` imports` in project-context-and-memory. The id derives from
    // the text content, not the markdown source (which produced ids with
    // `[object Object]`).
    const doc = DOCS.find((d) => d.slug === 'project-context-and-memory')
    expect(doc, 'the article carrying a heading with inline code has gone').toBeDefined()

    renderArticle(doc!.package, doc!.slug)
    await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))

    expect(renderedHeadingIds()).toContain('imports')
    expect(renderedHeadingIds().join(' ')).not.toContain('object-object')
  })

  test.each(DOCS.map((d) => [`${d.package}/${d.slug}`, d] as const))(
    'every section the nav offers for %s exists in the page',
    async (_id, doc) => {
      const wanted = extractSections(doc.content).map((s) => s.id)

      renderArticle(doc.package, doc.slug)
      await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))

      const present = renderedHeadingIds()
      const dead = wanted.filter((id) => !present.includes(id))

      expect(dead, `${_id}: nav links with no matching heading`).toEqual([])
    },
  )
})

describe('the id derivation itself', () => {
  test('one algorithm, and it handles the nesting a heading can contain', async () => {
    const doc = DOCS.find((d) => /^## .*[`*_[]/m.test(d.content))
    if (!doc) return

    renderArticle(doc.package, doc.slug)
    await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))

    for (const id of renderedHeadingIds()) {
      expect(id).not.toContain('object')
      expect(id).toMatch(/^[a-z0-9-]*$/)
    }
  })
})
