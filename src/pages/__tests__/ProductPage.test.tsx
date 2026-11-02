/**
 * The product pages: one per paid module, on the public site.
 *
 * The same rules as the landing page. Measured numbers are drawn to the
 * value they print; anything not finished says so on the page; and the
 * Factory page says that the customer's Factory makes no external calls.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { ProductPage } from '../ProductPage'

const SLUGS = ['codeindex', 'artifacts', 'fleet', 'factory'] as const

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  )
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderProduct(slug: string) {
  return renderWithProviders(
    <Routes>
      <Route path={`/${slug}`} element={<ProductPage slug={slug} />} />
    </Routes>,
    { route: `/${slug}` },
  )
}

describe('every product page', () => {
  test.each(SLUGS)('%s has a price, proof, a not-finished list and its docs', (slug) => {
    renderProduct(slug)

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(document.querySelector('.lp-hero-note')?.textContent).toMatch(/€\d+k a year/)
    expect(document.querySelector('.lp-prod-notyet li')).not.toBeNull()
    expect(document.querySelector('a[href^="/docs/"]')).not.toBeNull()
    expect(document.querySelectorAll('.lp-prod-other')).toHaveLength(SLUGS.length - 1)
  })

  test.each(SLUGS)('%s labels its illustration as one', (slug) => {
    renderProduct(slug)
    expect(document.querySelector('.lp-scn-visual .lp-illustrative')).not.toBeNull()
  })

  test.each(SLUGS)('%s calls nothing on load', (slug) => {
    renderProduct(slug)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('CodeIndex', () => {
  test('each pair of bars is drawn to the value it prints', () => {
    renderProduct('codeindex')

    const lines = Array.from(document.querySelectorAll('.lp-eval-line'))
    expect(lines.length).toBeGreaterThan(3)
    for (const line of lines) {
      const printed = Number((line.querySelector('em')?.textContent ?? '').replace('%', ''))
      const width = parseFloat((line.querySelector('.lp-eval-bar > span') as HTMLElement).style.width)
      expect(width).toBeCloseTo(printed, 5)
    }
  })

  test('CodeIndex is the first bar of every pair and beats text search on each', () => {
    renderProduct('codeindex')
    for (const row of Array.from(document.querySelectorAll('.lp-eval-row'))) {
      const [ours, grep] = Array.from(row.querySelectorAll('.lp-eval-line em')).map((e) =>
        Number((e.textContent ?? '').replace('%', '')),
      )
      expect(ours).toBeGreaterThan(grep)
    }
  })
})

describe('the Factory (igni 1.0 4B showcase)', () => {
  // igni__fine-tuning: model card and the two category-eval docs.
  test('each bar is drawn to the score it prints, and tuning never loses', () => {
    renderProduct('factory')
    const rows = Array.from(document.querySelectorAll('.lp-eval-row'))
    expect(rows.length).toBeGreaterThan(3)
    for (const row of rows) {
      const scores = Array.from(row.querySelectorAll('.lp-eval-line')).map((line) => {
        const [got, of] = (line.querySelector('em')?.textContent ?? '').split('/').map(Number)
        const width = parseFloat((line.querySelector('.lp-eval-bar > span') as HTMLElement).style.width)
        expect(width).toBeCloseTo((got / of) * 100, 5)
        return got
      })
      expect(scores[0]).toBeGreaterThan(scores[1])
    }
  })

  test('the headline is the measured 305 of 343, against 201 before', () => {
    renderProduct('factory')
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/88\.9%/)
    expect(text).toMatch(/58\.6% before/)
    expect(text).toMatch(/37 of 48/)
    expect(text).toMatch(/MiniMax-M2\.7 judge/)
  })

  test('the customer’s Factory makes no external calls, and is not sold as built', () => {
    renderProduct('factory')
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/makes no external calls/)
    expect(document.querySelector('.lp-pill--build')?.textContent).toMatch(/In build/)
    expect(text).toMatch(/€40k a year for any number of models/)
  })
})

describe('Fleet', () => {
  test('quotes the wake times measured on bare metal through the real gateway', () => {
    renderProduct('fleet')
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/c3-highcpu-192-metal/)
    expect(text).toMatch(/29 ms/)
    expect(text).toMatch(/137 ms/)
    expect(text).not.toMatch(/~25 ms/)
  })

  test('links to the comparison with AWS Bedrock AgentCore', () => {
    renderProduct('fleet')
    expect(document.querySelector('.lp-prod-docs a[href="/compare/agentcore"]')).not.toBeNull()
  })
})
