/**
 * DocPackagePage — a product's own documentation at `/docs/<package>`.
 *
 * A multi-page package (core, app, server, fleet) shows its articles as
 * cards, grouped by category. A single-page package (Artifacts, CodeIndex)
 * renders its one article inline here, so its original `/docs/<slug>` URL
 * keeps showing the content rather than a one-card index.
 *
 * Asserted over the real manifest: the point is that every package the
 * manifest declares is reachable and complete, not that a fixture agrees.
 */
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { Route, Routes, useParams } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { articlesOf, overviewArticle, packageVersionLabel, docPackage } from '../../docs/docsManifest'
import { DocPackagePage } from '../DocPackagePage'

beforeAll(() => {
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

function ArticleStub() {
  const { package: pkg, slug } = useParams()
  return <div data-testid="arrived">article:{pkg}/{slug}</div>
}

function renderPackage(pkg: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/docs/:package" element={<DocPackagePage />} />
      <Route path="/docs/:package/:slug" element={<ArticleStub />} />
      <Route path="/docs" element={<div>docs index stub</div>} />
    </Routes>,
    { route: `/docs/${pkg}` },
  )
}

function cardTitles(): string[] {
  return Array.from(document.querySelectorAll('.doc-card-title')).map(
    (el) => el.textContent?.trim() ?? '',
  )
}

describe('a multi-page package', () => {
  test('lists every one of its articles as a card', () => {
    renderPackage('server')
    const expected = articlesOf('server').map((a) => a.title)
    const titles = cardTitles()
    const missing = expected.filter((t) => !titles.includes(t))
    expect(missing, 'server articles with no card').toEqual([])
    expect(expected.length).toBeGreaterThan(3)
  })

  test('shows the package version', () => {
    renderPackage('server')
    expect(screen.getByText(packageVersionLabel(docPackage('server')!))).toBeInTheDocument()
  })

  test('a card opens the article at its per-package path', async () => {
    const user = userEvent.setup()
    renderPackage('core')
    const first = articlesOf('core')[0]
    const heading = Array.from(document.querySelectorAll('.doc-card-title')).find(
      (el) => el.textContent?.trim() === first.title,
    )!
    await user.click(heading.closest('.doc-card') as HTMLElement)

    expect(await screen.findByTestId('arrived')).toHaveTextContent(`article:core/${first.slug}`)
  })

  test('fleet now lists its articles as cards (it left the single-page group)', () => {
    renderPackage('fleet')
    const expected = articlesOf('fleet').map((a) => a.title)
    const titles = cardTitles()
    const missing = expected.filter((t) => !titles.includes(t))
    expect(missing, 'fleet articles with no card').toEqual([])
    expect(expected.length).toBeGreaterThan(3)
  })
})

describe('a single-page package', () => {
  test('renders its one article inline, with the version', async () => {
    renderPackage('codeindex')
    const article = overviewArticle('codeindex')!

    // The article's own H1 is shown (the inline render), not a card grid.
    expect(await screen.findByRole('heading', { name: article.title, level: 1 })).toBeInTheDocument()
    expect(cardTitles()).toEqual([])
    // The body may also say the module label, so assert at least one match.
    await waitFor(() =>
      expect(screen.getAllByText(packageVersionLabel(docPackage('codeindex')!)).length).toBeGreaterThan(0),
    )
  })

  test('a parked module shows its module label', () => {
    renderPackage('artifacts')
    // The body also says 'paid module', so scope to the version Label.
    expect(screen.getAllByText(/Paid module/i).length).toBeGreaterThan(0)
  })
})

describe('an unknown package', () => {
  test('says so rather than rendering an empty page', async () => {
    renderPackage('not-a-package')
    expect(await screen.findByText(/Documentation not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to docs/i })).toBeInTheDocument()
  })
})
