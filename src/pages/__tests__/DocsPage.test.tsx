/**
 * DocsPage — the index, and the article it could silently omit.
 *
 * The page renders categories from a hand-written `CATEGORY_ORDER`, not
 * from the manifest:
 *
 *     const CATEGORY_ORDER: DocCategory[] = [
 *       'getting-started', 'core-concepts', 'features', 'operations',
 *     ]
 *
 * So an article in a fifth category renders **nowhere on this page**,
 * while `/docs/<slug>` keeps working perfectly. Nothing errors, no
 * category appears empty, and the only symptom is a document nobody can
 * find unless they already know its URL. That is the rule worth having
 * here — asserted over the real manifest, so the check is `DOCS` and
 * not a fixture that can agree with a stale list.
 *
 * The counterpart is that a category with no *matching* articles must
 * disappear rather than render an empty heading, which is the same
 * condition read the other way and is why the omission is invisible.
 *
 * Search is title-or-description, and the trimmed-empty case matters:
 * `!query.trim()` returns everything, so typing a space must not empty
 * the index.
 */
import { afterEach, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { DOCS, CATEGORY_META } from '../../docs/docsManifest'
import { DocsPage } from '../DocsPage'

/**
 * **The documentation is deliberately empty right now.** The sixteen
 * articles described the hosted product and were dropped whole rather
 * than edited around; they are being rebuilt from the repositories.
 *
 * The blocks below assert over the *real* manifest on purpose — the
 * file note above explains why a fixture would be worse — so with no
 * articles they have nothing to check and are skipped.
 */
afterEach(cleanup)

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/docs/:slug" element={<ArticleStub />} />
      <Route path="/" element={<div>landing stub</div>} />
    </Routes>,
    { route: '/docs' },
  )
}

/** Reports which article the card navigated to. */
function ArticleStub() {
  return <div data-testid="article">arrived</div>
}

/**
 * The card carrying a given title.
 *
 * Scoped to `.doc-card-title`, because `DOCS[0]` is called "Getting
 * Started" and so is its category heading — `getByText` throws on the
 * ambiguity, and a looser query would have clicked the heading and
 * navigated nowhere.
 */
function card(title: string): HTMLElement {
  const heading = Array.from(document.querySelectorAll('.doc-card-title')).find(
    (el) => el.textContent?.trim() === title,
  )
  expect(heading, `no card titled ${title}`).toBeDefined()
  return heading!.closest('.doc-card') as HTMLElement
}

/** The card titles currently on the page. */
function cardTitles(): string[] {
  return Array.from(document.querySelectorAll('.doc-card-title')).map(
    (el) => el.textContent?.trim() ?? '',
  )
}

describe('every article is reachable from the index', () => {
  test('each document in the manifest has a card', async () => {
    // The rule. An article whose category is missing from
    // `CATEGORY_ORDER` renders nowhere here and stays reachable by URL
    // — a document that exists and cannot be found.
    renderPage()

    const missing = DOCS.filter((doc) => !cardTitles().includes(doc.title))

    expect(missing.map((d) => `${d.slug} (${d.category})`), 'these articles appear on no card — is their category in CATEGORY_ORDER?').toEqual([])
  })

  test('and the scan had documents to check', () => {
    // A rule over an empty manifest passes and proves nothing.
    expect(DOCS.length).toBeGreaterThan(10)
  })

  test('every category the manifest describes is ordered', () => {
    // Said directly as well as through the cards, because this is the
    // list that goes stale: `CATEGORY_META` gains a key, the articles
    // are written, and nothing points at the omission.
    renderPage()

    const headings = Array.from(document.querySelectorAll('.doc-category-title')).map(
      (el) => el.textContent?.trim() ?? '',
    )
    const used = new Set(DOCS.map((d) => d.category))
    const expected = Object.entries(CATEGORY_META)
      .filter(([key]) => used.has(key as never))
      .map(([, meta]) => meta.label)

    expect(headings.sort()).toEqual(expected.sort())
  })
})

describe('searching', () => {
  test('a title match narrows the list', async () => {
    const user = userEvent.setup()
    const target = DOCS[0]
    renderPage()

    await user.type(screen.getByLabelText(/Search documentation/i), target.title)

    expect(cardTitles()).toContain(target.title)
    expect(cardTitles().length).toBeLessThan(DOCS.length)
  })

  test('a description match counts too', async () => {
    // Both fields, because the words somebody searches for are more
    // often in the description than in a four-word title.
    const user = userEvent.setup()
    const doc = DOCS.find((d) => {
      const word = d.description.split(/\s+/).find((w) => w.length > 7)
      return word && !d.title.toLowerCase().includes(word.toLowerCase())
    })
    expect(doc, 'no document has a distinctive word outside its title').toBeDefined()
    const word = doc!.description.split(/\s+/).find((w) => w.length > 7)!
    renderPage()

    await user.type(screen.getByLabelText(/Search documentation/i), word)

    expect(cardTitles()).toContain(doc!.title)
  })

  test('the match ignores case', async () => {
    const user = userEvent.setup()
    const target = DOCS[0]
    renderPage()

    await user.type(screen.getByLabelText(/Search documentation/i), target.title.toUpperCase())

    expect(cardTitles()).toContain(target.title)
  })

  test('whitespace alone is not a search', async () => {
    // `!query.trim()` returns the whole manifest. Without the trim a
    // stray space empties the index and reads as a broken page.
    const user = userEvent.setup()
    renderPage()
    const before = cardTitles().length

    await user.type(screen.getByLabelText(/Search documentation/i), '   ')

    expect(cardTitles()).toHaveLength(before)
    expect(screen.queryByText(/No results found/i)).not.toBeInTheDocument()
  })

  test('no match says so, and says what to do', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Search documentation/i), 'zzzzz-no-such-doc')

    expect(await screen.findByText(/No results found/i)).toBeInTheDocument()
    expect(screen.getByText(/Try a different search term/i)).toBeInTheDocument()
    // Not the other empty state, which claims there is no documentation
    // at all.
    expect(screen.queryByText(/No documentation yet/i)).not.toBeInTheDocument()
  })

  test('a category with no matches disappears rather than showing an empty heading', async () => {
    // `articles.length === 0 → null`. The same condition that hides an
    // unordered category, which is why the omission above is silent.
    const user = userEvent.setup()
    const target = DOCS[0]
    renderPage()
    const allHeadings = document.querySelectorAll('.doc-category-title').length

    await user.type(screen.getByLabelText(/Search documentation/i), target.title)

    expect(document.querySelectorAll('.doc-category-title').length).toBeLessThan(allHeadings)
  })
})

describe('a card is a link', () => {
  test('clicking one opens the article', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(card(DOCS[0].title))

    expect(await screen.findByTestId('article')).toBeInTheDocument()
  })

  test('Enter opens it too, because the card is not a real anchor', async () => {
    // `role="link"` on a div with `tabIndex={0}`. The keyboard
    // behaviour a browser gives an `<a>` for free has to be written
    // here, and its absence is invisible to anybody using a mouse.
    const user = userEvent.setup()
    renderPage()

    card(DOCS[0].title).focus()
    await user.keyboard('{Enter}')

    expect(await screen.findByTestId('article')).toBeInTheDocument()
  })

  test('each card is focusable, so the list can be traversed at all', async () => {
    renderPage()

    const cards = Array.from(document.querySelectorAll('.doc-card'))
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.getAttribute('tabindex')).toBe('0')
      expect(card.getAttribute('role')).toBe('link')
    }
  })
})
