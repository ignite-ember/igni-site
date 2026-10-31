/**
 * DocArticlePage — and a table of contents that linked to nothing.
 *
 * This page had no test, and the reason turned out to be mechanical:
 * `useActiveSectionId` uses `IntersectionObserver`, which jsdom does
 * not provide, so rendering it threw before any assertion ran. Stubbing
 * that is three lines. Nobody had, so nothing here was ever checked.
 *
 * What the first render found: **the "on this page" nav had a dead
 * entry.** For `## Managing servers (\`/mcp\`)` the nav linked to
 * `#managing-servers-mcp` and the heading carried
 * `id="managing-servers-object-object"`.
 *
 * Two slug computations, fed different things. `extractSections` slugs
 * the raw markdown of a heading. The renderer slugged
 * `String(children)` of the *parsed* nodes — and `String` on
 * `['Managing servers (', <code>/mcp</code>, ')']` is
 * `Managing servers (,[object Object],)`. Clicking the entry did
 * nothing, and the id in the DOM was gibberish.
 *
 * Fixed by sharing one `headingId` and giving it one kind of input: the
 * page flattens children to text recursively first. The test that
 * matters is the last one — every heading in every shipped document,
 * because noticing the backtick in one heading was luck and there are
 * sixteen documents.
 */
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { DOCS, extractSections } from '../../docs/docsManifest'
import { DocArticlePage } from '../DocArticlePage'

/**
 * **The documentation is deliberately empty right now.** The sixteen
 * articles described the hosted product and were dropped whole rather
 * than edited around; they are being rebuilt from the repositories.
 *
 * The blocks below assert over the *real* manifest on purpose — the
 * file note above explains why a fixture would be worse — so with no
 * articles they have nothing to check and are skipped.
 */
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

function renderArticle(slug: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/docs/:slug" element={<DocArticlePage />} />
      <Route path="/docs" element={<div>docs index stub</div>} />
    </Routes>,
    { route: `/docs/${slug}` },
  )
}

/** Anchor ids actually present in the rendered document. */
function renderedHeadingIds(): string[] {
  return Array.from(document.querySelectorAll('h2[id], h3[id]')).map((h) => h.id)
}

/**
 * The titles offered by the previous/next footer, scoped to it.
 *
 * A document's title appears in several places at once — the footer
 * link, the sidebar, sometimes the prose — so `getByText(title)` throws
 * on the ambiguity, and a looser query would have matched the sidebar
 * and passed while the footer was empty.
 */
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
    renderArticle('no-such-article')

    expect(await screen.findByText(/Article not found/i)).toBeInTheDocument()
    // And offers the way out, because a blankslate with no action is a
    // dead end.
    expect(screen.getByRole('link', { name: /Back to docs/i })).toBeInTheDocument()
  })
})

describe('an article renders', () => {
  test('its title appears once, not twice', async () => {
    // `stripH1` removes the H1 from the markdown because the page
    // chrome renders the title itself. Without it the reader sees the
    // same heading twice, which looks like a rendering bug and is one.
    const doc = DOCS[0]
    renderArticle(doc.slug)

    const headings = await screen.findAllByRole('heading', { name: doc.title })
    expect(headings).toHaveLength(1)
  })

  test('markdown becomes elements rather than being shown as source', async () => {
    const withCode = DOCS.find((d) => d.content.includes('```')) ?? DOCS[0]
    renderArticle(withCode.slug)

    await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))
    // A markdown fence left unparsed would be visible as literal
    // backticks in the text.
    expect(document.body.textContent).not.toContain('```')
  })
})

describe('previous and next', () => {
  test('the first article offers a next and no previous', async () => {
    renderArticle(DOCS[0].slug)

    await waitFor(() => expect(prevNextTitles().length).toBeGreaterThan(0))
    expect(offers(DOCS[1].title)).toBe(true)
    // An off-by-one here wraps to the last article, which reads as a
    // navigation loop rather than an end.
    expect(offers(DOCS[DOCS.length - 1].title)).toBe(false)
  })

  test('the last article offers a previous and no next', async () => {
    const last = DOCS[DOCS.length - 1]
    renderArticle(last.slug)

    await waitFor(() => expect(prevNextTitles().length).toBeGreaterThan(0))
    expect(offers(DOCS[DOCS.length - 2].title)).toBe(true)
    expect(offers(DOCS[0].title)).toBe(false)
  })

  test('following next arrives at the next article', async () => {
    const user = userEvent.setup()
    renderArticle(DOCS[0].slug)

    await waitFor(() => expect(prevNextTitles().length).toBeGreaterThan(0))
    const next = Array.from(
      document.querySelectorAll('.doc-prev-next a, .doc-prev-next button'),
    ).find((el) => el.textContent?.includes(DOCS[1].title))
    expect(next, 'the footer offers no link to the next article').toBeDefined()
    await user.click(next as HTMLElement)

    expect(
      await screen.findByRole('heading', { name: DOCS[1].title, level: 1 }),
    ).toBeInTheDocument()
  })
})

describe('the table of contents points at real anchors', () => {
  test('the case that was broken: a heading containing inline code', async () => {
    // `## Managing servers (`/mcp`)`. The nav wanted
    // `#managing-servers-mcp`; the heading had
    // `id="managing-servers-object-object"`. Pinned by name because a
    // regression here is invisible — the page renders, the nav renders,
    // the link does nothing.
    // Repointed when the documentation was rebuilt from source: the
    // old `mcp` article became `tools-mcp-and-language-servers`, and
    // the heading with inline code now lives in project-context-and-
    // memory (`## `@` imports`). The case is about the id derivation,
    // not about which article happens to carry it.
    const mcp = DOCS.find((d) => d.slug === 'project-context-and-memory')
    expect(mcp, 'the article carrying a heading with inline code has gone; repoint this case at one that has one').toBeDefined()

    renderArticle('project-context-and-memory')
    await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))

    // `## `@` imports` — the backticks are stripped by the renderer, so
    // the id derives from the text content and not from the markdown
    // source. That is the whole point of the case: deriving it from the
    // source produced ids containing `[object Object]`.
    expect(renderedHeadingIds()).toContain('imports')
    expect(renderedHeadingIds().join(' ')).not.toContain('object-object')
  })

  test.each(DOCS.map((d) => [d.slug] as const))(
    'every section the nav offers for %s exists in the page',
    async (slug) => {
      // The rule, over every shipped document. Noticing the backticks
      // in one heading was luck; this is what makes it unnecessary.
      const doc = DOCS.find((d) => d.slug === slug)!
      const wanted = extractSections(doc.content).map((s) => s.id)

      renderArticle(slug)
      await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))

      const present = renderedHeadingIds()
      const dead = wanted.filter((id) => !present.includes(id))

      expect(dead, `${slug}: nav links with no matching heading`).toEqual([])
    },
  )
})

describe('the id derivation itself', () => {
  test('one algorithm, and it handles the nesting a heading can contain', async () => {
    // `childrenToText` is recursive because bold inside a link inside a
    // heading is one string to a reader and three nodes here. Asserted
    // through a real document rather than by exporting the helper: what
    // matters is the id on the element.
    const doc = DOCS.find((d) => /^## .*[`*_[]/m.test(d.content))
    if (!doc) return

    renderArticle(doc.slug)
    await waitFor(() => expect(renderedHeadingIds().length).toBeGreaterThan(0))

    for (const id of renderedHeadingIds()) {
      expect(id).not.toContain('object')
      expect(id).toMatch(/^[a-z0-9-]*$/)
    }
  })
})
