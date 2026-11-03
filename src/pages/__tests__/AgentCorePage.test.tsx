/**
 * The AgentCore comparison: a page that sets igni's prices beside AWS's.
 *
 * So the checks are the ones a sceptical reader would make:
 *
 * * **it still says when AWS was checked**, and keeps what counts
 *   against igni — where AgentCore is ahead, no certificate held, and
 *   that the costs are estimates, not a quote;
 * * **igni's side is the price list.** The cost tables were worked out
 *   on the ≤ 200 band; if the price list moves, this fails and the sums
 *   have to be redone rather than quietly going stale;
 * * **every bar is drawn to the number it prints**, and the at-a-glance
 *   counts are counted, not typed;
 * * **nothing internal leaks.** The comparison it was ported from cited
 *   private repositories and documents as sources.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { AgentCorePage } from '../AgentCorePage'
import { AUTOPILOT_PRICES, FACTORY_EVAL, FACTORY_PER_YEAR, FLEET_PRICES } from '../site/siteData'
import { BAND_200, COST_BARS, COST_SCALE, COVERAGE, USAGE, WAKE, WAKE_MAX_MS, countFull } from '../compare/agentcoreData'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/compare/agentcore" element={<AgentCorePage />} />
    </Routes>,
    { route: '/compare/agentcore' },
  )
}

const text = () => document.body.textContent ?? ''

describe('the page renders', () => {
  test('with its title, in the tab and on the page', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 2, name: 'igni + Fleet vs AWS Bedrock AgentCore' })).toBeInTheDocument()
    expect(document.title).toMatch(/^igni \+ Fleet vs AWS Bedrock AgentCore — igni$/)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(/AgentCore/)
  })

  test('every section the source had', () => {
    renderPage()
    for (const name of [
      'How the two differ',
      'Feature by feature',
      'Extensions and the UI',
      'Models and GPU capacity',
      'Cost for 200 people, per year',
      'Speed',
      'Security and where data lives',
      'What erasure covers',
      'Where AgentCore is ahead',
      'Which to choose',
      'Assumptions and sources',
    ]) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument()
    }
  })

  test('every contents link lands on something that exists', () => {
    renderPage()
    const ids = Array.from(document.querySelectorAll('a[href^="#"]')).map((a) => a.getAttribute('href')!.slice(1))
    expect(ids.length).toBeGreaterThan(10)
    expect(ids.filter((id) => !document.getElementById(id))).toEqual([])
  })

  test('the key figures are on it', () => {
    renderPage()
    const t = text()
    expect(t).toMatch(/10–50 GiB/)
    expect(t).toMatch(/≈50%/)
    expect(t).toMatch(/~29 ms/)
    expect(t).toMatch(/€51–57k/)
    expect(t).toMatch(/107k \/ 413k/)
  })

  test('it calls nothing on load', () => {
    renderPage()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('it stays honest', () => {
  test('it says when the AWS facts were checked', () => {
    renderPage()
    expect(document.querySelector('.lp-hero-note')?.textContent).toMatch(/Checked against AWS documentation, 1–2 November 2026/)
    // The full detail — when it was written, the exchange rate — is with the sources.
    expect(document.querySelector('#sources')?.textContent).toMatch(
      /Written 2 November 2026\. AWS facts and list prices checked against AWS documentation on 1–2 November 2026\..*€1 = \$1\.10/,
    )
  })

  test('it keeps what counts against igni', () => {
    renderPage()
    const t = text()
    expect(t).toMatch(/igni holds no certificate/)
    expect(t).toMatch(/No independent penetration test yet/)
    expect(t).toMatch(/Estimates, not a quote/)
    expect(t).toMatch(/your integrator quotes the final price/)
    expect(t).toMatch(/Below about half of the heavy case AgentCore is cheaper/)
    expect(document.querySelectorAll('#aws-wins tbody tr').length).toBe(8)
  })

  test('no internal repository, document or note is cited', () => {
    renderPage()
    const t = text()
    for (const leak of [/igni__/, /ember-code/, /RESULTS\.md/, /EXTENSIBILITY/, /SERVING_ARCHITECTURE/, /catalogue/i, /for discussion/i, /ECB rate/, /the partner/i]) {
      expect(t, String(leak)).not.toMatch(leak)
    }
  })

  test('no AWS logo or mark: the only images are igni’s own screenshots', () => {
    renderPage()
    const imgs = Array.from(document.querySelectorAll('img'))
    expect(imgs).toHaveLength(3)
    for (const img of imgs) {
      expect(img.getAttribute('src')).toMatch(/igni-claims-/)
      expect(img.getAttribute('alt')?.length).toBeGreaterThan(40)
      // Each comes in the reader's theme.
      expect(img.parentElement?.querySelector('source[media*="dark"]')?.getAttribute('srcset')).toMatch(/-dark/)
    }
  })
})

describe('igni’s side is the price list', () => {
  test('the cost section was worked out on these prices', () => {
    // If one of these fails, the price list has moved: redo the sums in
    // compare/agentcoreData.ts and the page's tables, then update here.
    expect(FLEET_PRICES[BAND_200]).toBe(24_000)
    expect(FACTORY_PER_YEAR).toBe(40_000)
    expect(AUTOPILOT_PRICES[BAND_200]).toBe(24_000)
  })

  test('the page prints them', () => {
    renderPage()
    const t = text()
    expect(t).toMatch(/€24k for up to 200/)
    expect(t).toMatch(/\+40k/)
    expect(t).toMatch(new RegExp(`passed ${FACTORY_EVAL.tuned} of ${FACTORY_EVAL.total}`))
  })

  test('igni’s range includes the licence at every level of use', () => {
    for (const u of USAGE) expect(u.igni[0]).toBeGreaterThan(FLEET_PRICES[BAND_200] / 1000)
  })
})

describe('every figure is drawn to its number', () => {
  test('the at-a-glance counts are counted', () => {
    renderPage()
    expect(countFull('aws')).toBe(13)
    expect(countFull('igni')).toBe(17)
    expect(text()).toMatch(`AgentCore has 13 of ${COVERAGE.length} in full; igni has 17`)
    expect(document.querySelectorAll('.cmp-cov .cmp-cov-aws .cmp-dot--full')).toHaveLength(13)
    expect(document.querySelectorAll('.cmp-cov .cmp-cov-igni .cmp-dot--full')).toHaveLength(17)
  })

  test('each cost bar is its upper figure against the largest, amount beside it', () => {
    renderPage()
    const max = Math.max(...COST_BARS.map((b) => b.high))
    const bars = Array.from(document.querySelectorAll('.cmp-cost-bar'))
    expect(bars).toHaveLength(COST_BARS.length)
    for (const bar of bars) {
      const high = Number(bar.querySelector('.cmp-bar-value')?.getAttribute('data-high'))
      expect(bar.querySelector('.cmp-bar-value')?.textContent).toMatch(new RegExp(`–${high}k$`))
      const width = parseFloat((bar.querySelector('.cmp-bar-fill') as HTMLElement).style.width)
      // The longest bar takes COST_SCALE% of the track, so its amount fits after it.
      expect(width).toBeCloseTo((high / max) * COST_SCALE, 5)
    }
  })

  test('each wake bar is to scale', () => {
    renderPage()
    const fills = Array.from(document.querySelectorAll<HTMLElement>('.cmp-wake .cmp-bar-fill'))
    expect(fills).toHaveLength(WAKE.length)
    for (const f of fills) {
      expect(parseFloat(f.style.width)).toBeCloseTo((Number(f.dataset.ms) / WAKE_MAX_MS) * 100, 5)
    }
  })

  test('the usage table and the chart come from the same rows', () => {
    renderPage()
    const rows = Array.from(document.querySelectorAll('.cmp-usage tbody tr'))
    expect(rows).toHaveLength(USAGE.length)
    expect(document.querySelector('.cmp-chart')?.getAttribute('aria-label')).toMatch(/€315k at 300%/)
  })
})

describe('it is built from the landing page’s pieces', () => {
  test('the four key figures sit in the landing’s stat row', () => {
    renderPage()
    const values = Array.from(document.querySelectorAll('.landing-stats .landing-stat-value')).map((e) => e.textContent)
    expect(values).toEqual(['10–50 GiB', 'Until erased', '≈50%', '~29 ms'])
  })

  test('the hero’s second line is the landing’s gradient', () => {
    renderPage()
    expect(document.querySelector('.landing-hero h2 .landing-hero-gradient')?.textContent).toBe('vs AWS Bedrock AgentCore')
  })

  test('sections alternate with the tinted band', () => {
    renderPage()
    const sections = Array.from(document.querySelectorAll('section.cmp-section'))
    expect(sections).toHaveLength(11)
    sections.forEach((sec, i) => {
      expect(sec.parentElement?.classList.contains('lp-band'), sec.id).toBe(i % 2 === 1)
    })
  })
})

describe('long sections stay short', () => {
  test('the feature detail is behind a button, and still in the page', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = screen.getByRole('button', { name: 'Show the detail for each capability' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const region = document.getElementById(button.getAttribute('aria-controls')!)!
    expect(region).not.toBeVisible()
    expect(region.textContent).toMatch(/FastMCP/)

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveTextContent('Hide the detail')
    expect(region).toBeVisible()
  })

  test('the detail rates each row in the at-a-glance dots, not a second badge system', () => {
    renderPage()
    expect(document.querySelectorAll('#feature-detail .lp-pill')).toHaveLength(0)
    expect(document.querySelectorAll('#feature-detail .cmp-dot--full').length).toBeGreaterThan(10)
    expect(document.querySelectorAll('#feature-detail .cmp-dot--half')).toHaveLength(2)
  })

  test('the screenshots are tabs, one shown at a time', async () => {
    const user = userEvent.setup()
    renderPage()
    const tabs = screen.getAllByRole('tab').filter((t) => t.id.startsWith('cmp-shot-tab'))
    expect(tabs.map((t) => t.textContent)).toEqual(['Plain igni', 'An extension’s page', 'In the chat'])
    const shown = () => Array.from(document.querySelectorAll<HTMLImageElement>('.cmp-shot img')).filter((i) => i.closest('[hidden]') === null)
    expect(shown()).toHaveLength(1)
    expect(shown()[0].getAttribute('src')).toMatch(/plain-light/)

    await user.click(tabs[2])
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(shown()).toHaveLength(1)
    expect(shown()[0].getAttribute('src')).toMatch(/chat-light/)
  })
})

describe('the Fleet diagram says only what is true today', () => {
  test('no client app is drawn connecting to Fleet', () => {
    renderPage()
    const fleet = document.querySelector('.cmp-arch-panel--igni')?.textContent ?? ''
    expect(fleet).not.toMatch(/desktop|web app/i)
    expect(fleet).toMatch(/Your services, commands and events/)
  })

  test('erasure resuming after a crash says how it was tested', () => {
    renderPage()
    for (const el of Array.from(document.querySelectorAll('main *')).filter((e) => e.children.length === 0 && /after a crash/.test(e.textContent ?? ''))) {
      expect(el.textContent).toMatch(/simulated nodes/)
    }
  })
})

describe('it is linked', () => {
  test('from the footer', () => {
    renderPage()
    expect(document.querySelector('.landing-footer a[href="/compare/agentcore"]')).not.toBeNull()
  })
})
