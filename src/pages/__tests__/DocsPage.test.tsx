/**
 * DocsPage — the product grid, and the search across every package.
 *
 * Phase 1 of the docs-versioning plan turned `/docs` from one mixed index
 * into a product grid: a card per documentation package (core, app,
 * server, Fleet, Artifacts, CodeIndex), plus the SDKs. The rules worth
 * holding:
 *
 * - every package in the manifest has a card, and each links into that
 *   package — an omitted package is a product nobody can find from here;
 * - the SDK card links to the SDK section;
 * - searching still works, across every package's articles, and a stray
 *   space is not a search (that would read as a broken, empty page).
 *
 * Asserted over the real `PACKAGES`/`DOCS` on purpose: a fixture could
 * agree with a stale list.
 */
import { afterEach, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, screen } from '@testing-library/react'
import { Route, Routes, useParams } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { PACKAGES, DOCS } from '../../docs/docsManifest'
import { DocsPage } from '../DocsPage'

afterEach(cleanup)

/** Shows which package/article/section a navigation arrived at. */
function PackageStub() {
  const { package: pkg } = useParams()
  return <div data-testid="arrived">package:{pkg}</div>
}
function ArticleStub() {
  const { package: pkg, slug } = useParams()
  return <div data-testid="arrived">article:{pkg}/{slug}</div>
}
function SdkStub() {
  return <div data-testid="arrived">sdk</div>
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/docs/sdk" element={<SdkStub />} />
      <Route path="/docs/:package" element={<PackageStub />} />
      <Route path="/docs/:package/:slug" element={<ArticleStub />} />
      <Route path="/" element={<div>landing stub</div>} />
    </Routes>,
    { route: '/docs' },
  )
}

/** The product-card headings currently on the page. */
function productTitles(): string[] {
  return Array.from(document.querySelectorAll('.product-card-title')).map(
    (el) => el.textContent?.trim() ?? '',
  )
}

/** The article-card headings currently on the page (shown while searching). */
function cardTitles(): string[] {
  return Array.from(document.querySelectorAll('.doc-card-title')).map(
    (el) => el.textContent?.trim() ?? '',
  )
}

function productCard(title: string): HTMLElement {
  const heading = Array.from(document.querySelectorAll('.product-card-title')).find(
    (el) => el.textContent?.trim() === title,
  )
  expect(heading, `no product card titled ${title}`).toBeDefined()
  return heading!.closest('.product-card') as HTMLElement
}

describe('the product grid', () => {
  test('every package in the manifest has a card', () => {
    renderPage()
    const titles = productTitles()
    const missing = PACKAGES.filter((p) => !titles.includes(p.title))
    expect(missing.map((p) => p.slug), 'these packages have no card').toEqual([])
  })

  test('the grid also offers the SDKs', () => {
    renderPage()
    expect(productTitles().some((t) => /SDK/i.test(t))).toBe(true)
  })

  test('and there were packages to check', () => {
    expect(PACKAGES.length).toBeGreaterThanOrEqual(6)
  })

  test('a product card links into its package', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(productCard(PACKAGES[0].title))

    expect(await screen.findByTestId('arrived')).toHaveTextContent(`package:${PACKAGES[0].slug}`)
  })

  test('the SDK card links to the SDK section', async () => {
    const user = userEvent.setup()
    renderPage()

    const sdk = Array.from(document.querySelectorAll('.product-card-title')).find((el) =>
      /SDK/i.test(el.textContent ?? ''),
    )!
    await user.click(sdk.closest('.product-card') as HTMLElement)

    expect(await screen.findByTestId('arrived')).toHaveTextContent('sdk')
  })

  test('every card is a focusable link, so the grid can be traversed', () => {
    renderPage()
    const cards = Array.from(document.querySelectorAll('.doc-card'))
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.getAttribute('tabindex')).toBe('0')
      expect(card.getAttribute('role')).toBe('link')
    }
  })
})

describe('searching', () => {
  test('a title match shows matching article cards', async () => {
    const user = userEvent.setup()
    const target = DOCS[0]
    renderPage()

    await user.type(screen.getByLabelText(/Search documentation/i), target.title)

    expect(cardTitles()).toContain(target.title)
  })

  test('a description match counts too', async () => {
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
    // Typing a space must keep the product grid, not empty the page.
    const user = userEvent.setup()
    renderPage()
    const before = productTitles().length

    await user.type(screen.getByLabelText(/Search documentation/i), '   ')

    expect(productTitles()).toHaveLength(before)
    expect(screen.queryByText(/No results found/i)).not.toBeInTheDocument()
  })

  test('no match says so, and says what to do', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Search documentation/i), 'zzzzz-no-such-doc')

    expect(await screen.findByText(/No results found/i)).toBeInTheDocument()
    expect(screen.getByText(/Try a different search term/i)).toBeInTheDocument()
  })

  test('clicking a matched article opens it', async () => {
    const user = userEvent.setup()
    // A multi-page-package article, so its path is /docs/<pkg>/<slug>.
    const doc = DOCS.find((d) => d.package === 'server')!
    renderPage()

    await user.type(screen.getByLabelText(/Search documentation/i), doc.title)
    const heading = Array.from(document.querySelectorAll('.doc-card-title')).find(
      (el) => el.textContent?.trim() === doc.title,
    )!
    await user.click(heading.closest('.doc-card') as HTMLElement)

    expect(await screen.findByTestId('arrived')).toHaveTextContent(`article:${doc.package}/${doc.slug}`)
  })
})
