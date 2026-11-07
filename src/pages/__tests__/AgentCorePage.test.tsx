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
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { AgentCorePage } from '../AgentCorePage'
import { AUTOPILOT_PRICES, FACTORY_EVAL, FACTORY_PER_YEAR, FLEET_PRICES, graduatedPrice } from '../site/siteData'
import {
  AC_RUNTIME,
  BAND_200,
  COST_BARS,
  COST_SCALE,
  COVERAGE,
  HEADROOM,
  PAUSED_GB,
  SCHEDULE_HOURS,
  SERVER,
  SERVER_EUR,
  SERVER_YEAR_PARTS,
  EUR_PER_GBP,
  USAGE,
  USD_PER_EUR,
  WAKE,
  WAKE_MAX_MS,
  WORKED,
  WORKED_BASE,
  agentCoreYear,
  countFull,
  eurRangeShort,
  eurShort,
  fleetYear,
  type UsageInputs,
} from '../compare/agentcoreData'

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
      'Cost by usage, per year',
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
    expect(t).toMatch(/~30 ms/)
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
    expect(t).toMatch(/Below about 70 people AgentCore is cheaper/)
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
    expect(t).toMatch(/€24k at 200/)
    expect(t).toMatch(/\+40k/)
    expect(t).toMatch(new RegExp(`passed ${FACTORY_EVAL.tuned} of ${FACTORY_EVAL.total}`))
  })

  test('igni’s range includes the graduated licence at every team size', () => {
    // The licence is now graduated: the fee at a given headcount is the sum
    // across the bands the team spans, so igni's low end must clear it plus
    // some hardware — never fall below the licence alone.
    for (const u of USAGE) {
      expect(u.igni[0]).toBeGreaterThan(graduatedPrice(FLEET_PRICES, u.people) / 1000)
    }
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
    expect(document.querySelector('.cmp-chart')?.getAttribute('aria-label')).toMatch(/€315k at 600 people/)
  })
})

describe('it is built from the landing page’s pieces', () => {
  test('the four key figures sit in the landing’s stat row', () => {
    renderPage()
    const values = Array.from(document.querySelectorAll('.landing-stats .landing-stat-value')).map((e) => e.textContent)
    expect(values).toEqual(['10–50 GiB', 'Until erased', '≈50%', '~30 ms'])
  })

  test('the hero’s second line is the landing’s gradient', () => {
    renderPage()
    expect(document.querySelector('.landing-hero h2 .landing-hero-gradient')?.textContent).toBe('vs AWS Bedrock AgentCore')
  })

  test('sections alternate with the tinted band', () => {
    renderPage()
    const sections = Array.from(document.querySelectorAll('section.cmp-section'))
    expect(sections).toHaveLength(12)
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

describe('cost by usage', () => {
  const at = (workS: number): UsageInputs => ({ ...WORKED_BASE, workS })
  const k1 = (n: number) => Math.round(n / 100) / 10

  test('the three worked cases are the figures the page states', () => {
    // Hand-worked: AgentCore per 15 min at W = 60 is 36 vCPU-s and
    // 2 GB × 180 s + 0.125 GB × 720 s = 450 GB-s, × 35,040 cycles × 1,000.
    expect(WORKED.map((w) => w.workS)).toEqual([60, 300, 900])
    for (const w of WORKED) {
      const a = agentCoreYear(at(w.workS))
      const f = fleetYear(at(w.workS))
      expect(k1(a.total), `aws at ${w.workS}`).toBe(w.aws)
      expect(k1(a.memIdle), `idle at ${w.workS}`).toBe(w.awsIdle)
      expect(Math.round(a.idleShare * 100)).toBe(w.idlePct)
      expect(f.servers, `servers at ${w.workS}`).toBe(w.servers)
      expect(f.firstYear.map(k1), `first at ${w.workS}`).toEqual(w.first)
      expect(f.yearAfter.map(k1), `after at ${w.workS}`).toEqual(w.after)
      expect(f.fourYears.map(k1), `four at ${w.workS}`).toEqual(w.four)
    }
  })

  test('the page prints them', () => {
    renderPage()
    const rows = Array.from(document.querySelectorAll('.cmp-worked tbody tr')).map((r) => r.textContent ?? '')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatch(/€107\.9k€49\.3k \(46%\) while idle€131\.9–134\.9kwith €61\.9k for the servers, bought once.*€70–73k€66k licence \+ €4–7k running.*AgentCore €431\.8kigni €342–354k3$/)
    expect(rows[1]).toMatch(/€337\.8k.*€44\.9k \(13%\).*€175\.9–180\.9k.*€72\.7–77\.7k.*AgentCore €1\.35Migni €394–414k5$/)
    expect(rows[2]).toMatch(/€878\.9k.*€0k \(0%\).*€307\.8–318\.8k.*€80\.7–91\.7k.*AgentCore €3\.52Migni €550–594k11$/)
  })

  test('AgentCore: CPU only while working, memory reclaimed after 120 s down to 128 MB', () => {
    const one: UsageInputs = { sessions: 1, workS: 300, vcpu: 4, busy: 0.5, memGb: 8, schedule: 'always' }
    const cycles = (24 * 365 * 3600) / 900
    const a = agentCoreYear(one)
    expect(a.cpu).toBeCloseTo((((300 * 4 * 0.5) / 3600) * 0.1276 * cycles) / 1.1, 6)
    expect(a.memWorking).toBeCloseTo((((8 * 300) / 3600) * 0.0169 * cycles) / 1.1, 6)
    expect(a.memIdle).toBeCloseTo((((8 * 120 + 0.125 * 480) / 3600) * 0.0169 * cycles) / 1.1, 6)
    expect(a.total).toBeCloseTo(a.cpu + a.memWorking + a.memIdle, 6)
    // Under 120 s of idle, only the full-size hold: no floor.
    const nearlyAll = agentCoreYear({ ...one, workS: 840 })
    expect(nearlyAll.memIdle).toBeCloseTo((((8 * 60) / 3600) * 0.0169 * cycles) / 1.1, 6)
    // Linear in sessions; working hours bill only those hours.
    expect(agentCoreYear({ ...one, sessions: 10 }).total).toBeCloseTo(a.total * 10, 6)
    expect(agentCoreYear({ ...one, schedule: 'working' }).total).toBeCloseTo((a.total * 2016) / 8760, 6)
    expect(SCHEDULE_HOURS).toEqual({ always: 8760, working: 2016 })
    expect(USD_PER_EUR).toBe(1.1)
    expect(AC_RUNTIME).toMatchObject({ vcpuHour: 0.1276, gbHour: 0.0169, reclaimS: 120, floorGb: 0.125, maxLifetimeH: 8 })
  })

  test('Fleet: licence from the price list, servers by RAM or threads at the stated headroom, plus a spare', () => {
    expect(SERVER).toMatchObject({ cpus: '2 × AMD EPYC 9474F', cores: 96, threads: 192, ramGb: 256, priceGbp: 17_950, perYear: [6_500, 7_500] })
    expect(HEADROOM).toEqual({ ram: 0.85, threads: 0.7 })
    expect(PAUSED_GB).toBe(0.23)
    const f = fleetYear(at(300))
    expect(f.licence).toBe(graduatedPrice(FLEET_PRICES, 1000))
    expect(f.active).toBeCloseTo(1000 * 300 / 900, 9)
    expect(f.ramGb).toBeCloseTo(f.active * 2 + (1000 - f.active) * 0.23, 9)
    expect(f.busyThreads).toBeCloseTo(f.active * 2 * 0.3, 9)
    expect(f.byRam).toBe(Math.ceil(f.ramGb / (256 * 0.85)))
    expect(f.byThreads).toBe(Math.ceil(f.busyThreads / (192 * 0.7)))
    expect(f.servers).toBe(Math.max(f.byRam, f.byThreads) + 1)
    // The servers are bought once; each year after is the licence and running them.
    expect(f.serverBuy).toBeCloseTo(f.servers * SERVER_EUR, 6)
    expect(f.running[0]).toBeCloseTo(f.servers * SERVER_YEAR_PARTS.running[0], 6)
    expect(f.firstYear[1]).toBeCloseTo(f.licence + f.serverBuy + f.running[1], 6)
    expect(f.yearAfter[0]).toBeCloseTo(f.licence + f.running[0], 6)
    expect(f.fourYears[0]).toBeCloseTo(4 * f.licence + f.serverBuy + 4 * f.running[0], 6)
    // Over 4 years it comes to the 200-person case's €6.5–7.5k a server-year.
    expect(f.fourYears[0]).toBeCloseTo(4 * (f.licence + f.servers * 6_500), 6)
    // CPU-bound: 100 agents always working at 8 vCPU fully busy need 800 threads.
    const cpu = fleetYear({ sessions: 100, workS: 900, vcpu: 8, busy: 1, memGb: 1, schedule: 'always' })
    expect(cpu.byThreads).toBe(Math.ceil(800 / 134.4))
    expect(cpu.servers).toBe(cpu.byThreads + 1)
    // Exactly full is not one more server.
    // 64 agents × 6.8 GB = 435.2 GB, two servers' usable RAM exactly.
    expect(fleetYear({ sessions: 64, workS: 900, vcpu: 1, busy: 0.1, memGb: 6.8, schedule: 'always' }).byRam).toBe(2)
    // Servers are bought for the peak: the schedule does not change igni's bill.
    expect(fleetYear({ ...at(300), schedule: 'working' })).toEqual(f)
  })

  test('the calculator recomputes both quotes as the inputs move, and fetches nothing', async () => {
    const user = userEvent.setup()
    renderPage()
    const total = (sel: string) => document.querySelector(sel)?.textContent
    expect(total('.cmp-calc-aws-total')).toBe('€107.9k')
    expect(total('.cmp-calc-igni-total')).toBe('€70–73k')
    expect(total('.cmp-calc-igni-first')).toBe('€131.9–134.9k')
    expect(total('.cmp-calc-servers')).toBe('€61.9k')
    expect(total('.cmp-calc-aws-four')).toMatch(/€431\.8k over 4 years/)

    await user.click(screen.getByRole('button', { name: /5 minutes in 15/ }))
    expect(total('.cmp-calc-aws-total')).toBe('€337.8k')
    expect(total('.cmp-calc-igni-total')).toBe('€72.7–77.7k')
    expect(total('.cmp-calc-igni-first')).toBe('€175.9–180.9k')

    fireEvent.change(screen.getByLabelText('Sessions running (N)'), { target: { value: '200' } })
    const inp: UsageInputs = { ...WORKED_BASE, sessions: 200, workS: 300 }
    expect(total('.cmp-calc-aws-total')).toBe(`€${(agentCoreYear(inp).total / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`)
    expect(total('.cmp-calc-licence')).toBe('€24k')

    await user.click(screen.getByRole('button', { name: /Working hours/ }))
    const wk = agentCoreYear({ ...inp, schedule: 'working' })
    expect(total('.cmp-calc-aws-total')).toBe(`€${(wk.total / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('the servers are shown as paid for once', () => {
    expect(EUR_PER_GBP).toBe(1.15)
    expect(SERVER.years).toBe(4)
    expect(SERVER_EUR).toBeCloseTo(20_642.5, 6)
    expect(SERVER_YEAR_PARTS.purchase + SERVER_YEAR_PARTS.running[0]).toBeCloseTo(6_500, 6)
    expect(SERVER_YEAR_PARTS.running[0]).toBeGreaterThan(0)
    expect(fleetYear(at(60)).serverBuy).toBeCloseTo(3 * 20_642.5, 6)
    renderPage()
    const buy = document.querySelector('.cmp-calc-buy')?.textContent ?? ''
    expect(buy).toMatch(/paid for once: 3 × £17,950 ≈ €61\.9k at £1 = €1\.15\. After that a server costs power and support, €1\.3–2\.3k a year; rack space and staff are not included\. Over 4 years, the servers once: €342–354k/)
    expect(document.querySelector('.cmp-calc-quote:not(.cmp-calc-quote--aws)')?.textContent).toMatch(/RAM needs 2, CPU 1: the larger, plus 1 spare/)
    const sec = document.querySelector('#cost-usage')?.textContent ?? ''
    expect(sec).toMatch(/Servers are bought once, in the first year.*only power and support, €1\.3–2\.3k a year\. Rack space and staff are not included\. Plan to replace them after about 4 years/)
    expect(sec).toMatch(/its first year costs more than AgentCore’s; from the second year it is the licence and running the servers/)
  })

  test('it says what is measured, what bursts do, and that it is all in euros', () => {
    renderPage()
    const sec = document.querySelector('#cost-usage')?.textContent ?? ''
    expect(sec).toMatch(/up to 400 agents on one server \(c3-highcpu-192-metal, 192 vCPU, 512 GiB\)/)
    expect(sec).toMatch(/1,000 agents, and hundreds working at once, have not been measured/)
    expect(sec).toMatch(/not a benchmark/)
    expect(sec).toMatch(/if every agent works at the same moment, Fleet needs servers for that peak/)
    expect(sec).toMatch(/Both in euros, AgentCore at €1 = \$1\.10/)
    expect(sec).toMatch(/converted at €1 = \$1\.10/)
    expect(document.querySelector('.cmp-calc-quote--aws')?.textContent).toMatch(/in euros at €1 = \$1\.10/)
    // No dollar amount outside the stated AWS list rates and the rate itself.
    expect(sec.replace(/\$0\.1276|\$0\.0169|\$1\.10/g, '')).not.toMatch(/\$/)
    expect(sec).toMatch(/Model tokens are left out on both sides/)
    expect(sec).toMatch(/85% of its RAM and 70% of its threads/)
    expect(sec).toMatch(/maxLifetime/)
    expect(sec).not.toMatch(/×\s*cheaper|times (cheaper|as much)/)
  })

  test('the 200-person case says its two servers have no spare', () => {
    renderPage()
    expect(text()).toMatch(/CPU servers: 2, bought .*No spare: 200 agents fill about 97% of their usable RAM/)
  })

  test('the server is the 256 GB R7625 everywhere, with its CPUs and its source', () => {
    renderPage()
    const t = text()
    expect(t).not.toMatch(/512 GB/)
    expect(t).not.toMatch(/£17\.9k/)
    expect(document.querySelector('#sources')?.textContent).toMatch(/2 × AMD EPYC 9474F \(96 cores, 192 threads\), 256 GB.*£17,950.*bytestock.*7 Nov 2026/)
  })

  test('its sources are on the page', () => {
    renderPage()
    const src = document.querySelector('#sources')?.textContent ?? ''
    expect(src).toMatch(/LifecycleConfiguration/)
    expect(src).toMatch(/End to end on bare metal: 400 real producers/)
    expect(src).toMatch(/Step 6 again on bare metal/)
    expect(src).toMatch(/Step 6 a third time on bare metal/)
    expect(src).toMatch(/results log/)
  })
})

describe('usage amounts print in k below a million and in M from a million', () => {
  test('euros', () => {
    expect(eurShort(107_900)).toBe('€107.9k')
    expect(eurShort(1_757_800)).toBe('€1.76M')
    expect(eurShort(66_000)).toBe('€66k')
    expect(eurShort(1_200_000)).toBe('€1.2M')
  })
  test('a range takes the unit of its higher end', () => {
    expect(eurRangeShort([85_500, 88_500])).toBe('€85.5–88.5k')
    expect(eurRangeShort([950_000, 1_050_000])).toBe('€0.95–1.05M')
  })
})
