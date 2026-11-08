/**
 * LandingPage — a sales page whose prices are a contract.
 *
 * The page quotes Ignite Ember's price list to the people who sign: a wrong number
 * here is worse than a broken one, because it is still persuasive and
 * an integrator will be asked to honour it.
 *
 * So the checks are consistency checks, not transcriptions:
 *
 * * **the quote adds up.** The estimator's lines sum to its annual
 *   total;
 * * **the presets are the catalog's worked examples.** One team €12k,
 *   one department €40k, a regional bank €141k a year with the Factory. These
 *   three are the deals the business has reasoned through; if a price
 *   changes, these fail loudly rather than quietly drifting;
 * * **every place a price appears agrees.** The band buttons, the price
 *   table and the module cards' "from" figure come from the same
 *   constants and are checked against each other;
 * * **nothing unbuilt is sold as built.** Every department mock is
 *   labelled as an illustration.
 *
 * And the nav: every in-page anchor must land on a section that exists.
 * The page makes no network call of its own.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { LandingPage } from '../LandingPage'
import {
  ARTIFACTS_PRICES,
  AUTOPILOT_PRICES,
  CODEINDEX_PRICES,
  FLEET_PRICES,
  SEAT_MINIMUM,
  UNLIMITED,
  graduatedPrice,
  marginalRates,
} from '../site/siteData'

const mediaQuery = { matches: false }
let mediaListeners: Array<(e: { matches: boolean }) => void> = []

beforeEach(() => {
  localStorage.clear()
  mediaListeners = []
  mediaQuery.matches = false
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return mediaQuery.matches
      },
      media: query,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        mediaListeners.push(fn)
      },
      removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        mediaListeners = mediaListeners.filter((f) => f !== fn)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  )
  // Stubbed so a stray request fails loudly in the no-calls test.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

function renderLanding() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<LandingPage />} />
    </Routes>,
    { route: '/' },
  )
}

describe('the navigation', () => {
  test('every in-page anchor lands on a section that exists', async () => {
    // The rule. A dead `#pricing` is invisible to whoever wrote the nav
    // and is the first thing a visitor clicks.
    renderLanding()

    const anchors = Array.from(document.querySelectorAll('a[href^="#"]')).map((a) =>
      (a.getAttribute('href') ?? '').slice(1),
    )
    expect(anchors.length, 'no in-page anchors found — has the nav changed?').toBeGreaterThan(3)

    const dead = anchors.filter((id) => !document.getElementById(id))
    expect(dead, 'these nav links point at no section').toEqual([])
  })

  test('the mobile menu offers the same destinations as the desktop one', async () => {
    // Two hand-written lists of the same six links. They drift, and the
    // half that drifts is the half most people are using.
    const user = userEvent.setup()
    renderLanding()

    const desktop = new Set(
      Array.from(document.querySelectorAll('.landing-nav-links a[href^="#"]')).map((a) =>
        a.getAttribute('href'),
      ),
    )
    await user.click(screen.getByRole('button', { name: /Toggle navigation menu/i }))

    const mobile = new Set(
      Array.from(document.querySelectorAll('.landing-mobile-nav a[href^="#"]')).map((a) =>
        a.getAttribute('href'),
      ),
    )
    expect([...mobile].sort()).toEqual([...desktop].sort())
  })

  test('the menu opens and closes on the hamburger', async () => {
    const user = userEvent.setup()
    renderLanding()

    const toggle = screen.getByRole('button', { name: /Toggle navigation menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(document.querySelector('.landing-mobile-nav')).not.toBeNull()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    await waitFor(() => expect(document.querySelector('.landing-mobile-nav')).toBeNull())
  })

  test('tapping the backdrop closes it; tapping the menu does not', async () => {
    // This is where `e.stopPropagation()` genuinely earns its place —
    // the panel is a *child* of the overlay that closes on click, so
    // without it every tap on a menu item closes the menu before the
    // link is followed.
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('button', { name: /Toggle navigation menu/i }))
    await user.click(document.querySelector('.landing-mobile-nav') as HTMLElement)
    expect(document.querySelector('.landing-mobile-nav'), 'the menu closed itself').not.toBeNull()

    await user.click(document.querySelector('.landing-mobile-nav-overlay') as HTMLElement)
    await waitFor(() => expect(document.querySelector('.landing-mobile-nav')).toBeNull())
  })

  test('growing the window past the breakpoint closes the mobile menu', async () => {
    // Otherwise the overlay is left covering a desktop layout that has
    // its own nav, with no visible way to dismiss it.
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('button', { name: /Toggle navigation menu/i }))
    expect(document.querySelector('.landing-mobile-nav')).not.toBeNull()

    act(() => {
      mediaQuery.matches = true
      mediaListeners.forEach((fn) => fn({ matches: true }))
    })

    await waitFor(() => expect(document.querySelector('.landing-mobile-nav')).toBeNull())
  })

  test('the nav offers a call, not a sign-in', async () => {
    // Ignite Ember hosts nothing a visitor could sign in to, and on the
    // public site /login only bounced back here.
    renderLanding()

    const nav = document.querySelector('.landing-nav') as HTMLElement
    expect(within(nav).queryByRole('button', { name: /^Sign in$/i })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /^Schedule a call$/i })).toHaveAttribute(
      'href',
      expect.stringContaining('calendly.com'),
    )
  })

  test('every link that opens a new tab keeps the opener out of it', async () => {
    renderLanding()

    const external = Array.from(document.querySelectorAll('a[target="_blank"]'))
    expect(external.length).toBeGreaterThan(0)
    for (const link of external) {
      expect(link.getAttribute('rel') ?? '', link.getAttribute('href') ?? '').toContain('noopener')
    }
  })
})

describe('the page calls nothing on load', () => {
  test('no request to GitHub or anywhere else', async () => {
    // The nav used to fetch a live star count from api.github.com — a
    // network call from a page sold to air-gapped buyers, and a small
    // number on it read as a small company.
    renderLanding()
    await new Promise((r) => setTimeout(r, 0))
    expect(fetch).not.toHaveBeenCalled()
  })

  test('the source link is still there', async () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /Source/ })
    expect(link.getAttribute('href')).toMatch(/github\.com\/ignite-ember\//)
  })
})

/** Every euro amount in a piece of text, as numbers. */
function eurosIn(text: string): number[] {
  return Array.from(text.matchAll(/€([\d,]+)/g), (m) => Number(m[1].replace(/,/g, '')))
}

function quote(): HTMLElement {
  return document.querySelector('.lp-est-quote') as HTMLElement
}

function annualTotal(): number {
  return eurosIn(quote().querySelector('.lp-est-total-annual')?.textContent ?? '')[0]
}


/** The amounts on the quote's itemised lines. */
function lineAmounts(): number[] {
  return Array.from(quote().querySelectorAll('.lp-est-lines li strong')).flatMap((el) =>
    eurosIn(el.textContent ?? ''),
  )
}

/**
 * The yearly total on one quote line, read from its `<strong>`. The line's
 * `<em>` also carries the blended per-person rate ("· €109 each"), so the
 * whole-line text holds two euro amounts; the total is the one in `<strong>`.
 */
function lineTotal(cls: string): number {
  return eurosIn(quote().querySelector(`${cls} strong`)?.textContent ?? '')[0]
}

async function pickPreset(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(screen.getByRole('button', { name: label }))
}

describe('the quote adds up', () => {
  test('the lines sum to the annual total', async () => {
    const user = userEvent.setup()
    renderLanding()

    for (const preset of [/One team/, /One department/, /Several departments/]) {
      await pickPreset(user, preset)
      const sum = lineAmounts().reduce((a, b) => a + b, 0)
      expect(annualTotal(), String(preset)).toBe(sum)
    }
  })

  test('the Factory is €40k a year, for any number of models', async () => {
    const user = userEvent.setup()
    renderLanding()
    const before = annualTotal()

    await user.click(screen.getByRole('checkbox', { name: /Factory/ }))

    const line = lineTotal('.lp-est-line-factory')
    expect(line).toBe(40_000)
    expect(annualTotal()).toBe(before + line)
  })

  test('Autopilot is never quoted without the Factory', async () => {
    const user = userEvent.setup()
    renderLanding()
    const factory = screen.getByRole('checkbox', { name: /Factory/ })
    expect(factory).not.toBeChecked()

    const autopilot = screen.getByRole('spinbutton', { name: /Autopilot.*people/ })
    await user.clear(autopilot)
    await user.type(autopilot, '50')
    expect(factory, 'giving Autopilot a headcount adds the Factory').toBeChecked()

    await user.click(factory)
    expect(quote().querySelector('.lp-est-line-autopilot'), 'dropping the Factory drops Autopilot').toBeNull()
  })

  test('Autopilot adds its graduated price to the total', async () => {
    const user = userEvent.setup()
    renderLanding()
    await user.click(screen.getByRole('checkbox', { name: /Factory/ }))
    const before = annualTotal()

    const autopilot = screen.getByRole('spinbutton', { name: /Autopilot.*people/ })
    await user.clear(autopilot)
    await user.type(autopilot, '50')

    const line = lineTotal('.lp-est-line-autopilot')
    expect(line).toBe(graduatedPrice(AUTOPILOT_PRICES, 50))
    expect(annualTotal()).toBe(before + line)
  })

  test('adding Fleet adds its graduated price to the total', async () => {
    const user = userEvent.setup()
    renderLanding()
    const before = annualTotal()

    const fleet = screen.getByRole('spinbutton', { name: /Fleet: people/ })
    await user.clear(fleet)
    await user.type(fleet, '240')

    const fleetLine = lineTotal('.lp-est-line-fleet')
    expect(fleetLine).toBe(graduatedPrice(FLEET_PRICES, 240))
    expect(annualTotal()).toBe(before + fleetLine)
  })

  test('the quote shows the blended per-person rate, and it falls as seats are added', async () => {
    // "Price per 1": each line prints the yearly total and, beside the
    // headcount, the effective rate per person — which drops as a larger
    // team spans into the cheaper bands, so the discount is visible.
    const user = userEvent.setup()
    renderLanding()
    const fleet = screen.getByRole('spinbutton', { name: /Fleet: people/ })

    const perPersonAt = async (people: number) => {
      await user.clear(fleet)
      await user.type(fleet, String(people))
      const em = quote().querySelector('.lp-est-line-fleet em')?.textContent ?? ''
      const each = eurosIn(em)
      expect(each, `€ each for ${people}`).toHaveLength(1)
      expect(each[0]).toBe(Math.round(graduatedPrice(FLEET_PRICES, people) / people))
      return each[0]
    }

    expect(await perPersonAt(1000)).toBeLessThan(await perPersonAt(50))
  })

  test('the graduated price floors at the seat minimum', () => {
    // A team of 1–9 is billed as the minimum, so every module has a floor
    // equal to its 10-seat price — and that is the entry price.
    for (const prices of [FLEET_PRICES, CODEINDEX_PRICES, ARTIFACTS_PRICES, AUTOPILOT_PRICES]) {
      const floor = graduatedPrice(prices, SEAT_MINIMUM)
      expect(graduatedPrice(prices, 1)).toBe(floor)
      expect(graduatedPrice(prices, SEAT_MINIMUM - 1)).toBe(floor)
      expect(graduatedPrice(prices, SEAT_MINIMUM + 1)).toBeGreaterThan(floor)
      // Off (no seats) is still nothing, not the floor.
      expect(graduatedPrice(prices, 0)).toBe(0)
    }
  })

  test('a headcount below the minimum is billed as the minimum and snaps up on blur', async () => {
    const user = userEvent.setup()
    renderLanding()
    const fleet = screen.getByRole('spinbutton', { name: /Fleet: people/ })
    expect(fleet).toHaveAttribute('min', String(SEAT_MINIMUM))

    await user.clear(fleet)
    await user.type(fleet, '4')
    // Priced as the minimum while the small number is still in the field.
    expect(lineTotal('.lp-est-line-fleet')).toBe(graduatedPrice(FLEET_PRICES, SEAT_MINIMUM))

    // Leaving the field snaps the headcount up to the minimum.
    await user.tab()
    expect((fleet as HTMLInputElement).value).toBe(String(SEAT_MINIMUM))
  })

  test('a mid-band headcount is cheaper than the band ceiling it used to round up to', async () => {
    // The whole point of the change: 240 people is no longer priced as the
    // old ≤500 band (€40k), but graduated — between the €24k (200) and €40k
    // (500) anchors.
    const user = userEvent.setup()
    renderLanding()
    const fleet = screen.getByRole('spinbutton', { name: /Fleet: people/ })
    await user.clear(fleet)
    await user.type(fleet, '240')

    const line = lineTotal('.lp-est-line-fleet')
    expect(line).toBeGreaterThan(24_000)
    expect(line).toBeLessThan(40_000)
  })

  test('clearing a module takes it off the quote', async () => {
    const user = userEvent.setup()
    renderLanding()

    const artifacts = screen.getByRole('spinbutton', { name: /Artifacts: people who use it/ })
    await user.clear(artifacts)

    expect(quote().querySelector('.lp-est-line-artifacts')).toBeNull()
    expect(annualTotal()).toBe(lineAmounts().reduce((a, b) => a + b, 0))
  })

})

describe('the presets are the catalog\u2019s worked examples', () => {
  // The product catalogue's worked examples. If one of these fails, a
  // price moved: change the catalogue first, then this.
  test.each([
    [/One team/, 12_000],
    [/One department/, 40_000],
    [/Several departments/, 143_000],
  ])('%s', async (label, annual) => {
    const user = userEvent.setup()
    renderLanding()
    await pickPreset(user, label)

    expect(annualTotal()).toBe(annual)
  })

  test('the department deal is selected when the page opens', async () => {
    renderLanding()
    expect(screen.getByRole('button', { name: /One department/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('every place a price appears agrees', () => {
  /** The rate card's rows as per-seat euros: [CodeIndex, Artifacts, Fleet, Autopilot]. */
  function rateRows(): number[][] {
    return Array.from(document.querySelectorAll('.lp-ratecard tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td'))
        .slice(1)
        .map((td) => eurosIn(td.textContent ?? '')[0]),
    )
  }

  test('the rate card prints the per-seat rate the model computes', async () => {
    renderLanding()
    const rows = rateRows()
    for (const [prices, col] of [
      [CODEINDEX_PRICES, 0],
      [ARTIFACTS_PRICES, 1],
      [FLEET_PRICES, 2],
      [AUTOPILOT_PRICES, 3],
    ] as const) {
      const rates = marginalRates(prices)
      rates.forEach((rate, i) => {
        expect(rows[i][col], `column ${col} band ${i}`).toBe(Math.round(rate))
      })
      // One row per finite band; the flat fee above the top band is in prose,
      // not the table. The last row is the 1,001–3,000 band's per-seat rate.
      expect(rows.length, 'rate-card rows').toBe(rates.length)
    }
  })

  test('the per-seat rate only ever falls as the team grows, flat above the ceiling', async () => {
    renderLanding()
    const rows = rateRows()
    for (let i = 1; i < rows.length; i++) {
      for (let col = 0; col < 4; col++) {
        expect(rows[i][col], `column ${col} row ${i}`).toBeLessThan(rows[i - 1][col])
      }
    }
    expect(document.getElementById('pricing')?.textContent).toMatch(/flat fee/)
    expect(document.body.textContent).not.toMatch(/Per extra 1,000/)
  })

  test('the licence is graduated, not a flat fee per band', async () => {
    // 1,001 people on Fleet reads just over the €66k (1,000) anchor, not a jump:
    // the band above 1,000 keeps climbing gently to the €128k ceiling at 3,000.
    renderLanding()
    expect(graduatedPrice(FLEET_PRICES, 1001)).toBeGreaterThan(66_000)
    expect(graduatedPrice(FLEET_PRICES, 1001)).toBeLessThan(67_000)
    expect(graduatedPrice(FLEET_PRICES, 3000)).toBe(FLEET_PRICES[UNLIMITED])
    expect(graduatedPrice(FLEET_PRICES, 9000)).toBe(FLEET_PRICES[UNLIMITED])
  })

  test('Fleet includes as many apps as people', async () => {
    renderLanding()
    expect(screen.getByRole('spinbutton', { name: /Fleet: people who use it \(each includes as many apps\)/ })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Apps are never counted/)
  })

  test('each module card\u2019s per-seat price is the rate card\u2019s first row', async () => {
    renderLanding()
    const [first] = rateRows()
    const cards = Array.from(document.querySelectorAll('.lp-module'))
    const perSeatOf = (name: string) =>
      eurosIn(
        cards
          .find((c) => c.querySelector('h4')?.textContent === name)
          ?.querySelector('.lp-module-foot strong')
          ?.textContent ?? '',
      )[0]

    expect(perSeatOf('CodeIndex')).toBe(first[0])
    expect(perSeatOf('Artifacts')).toBe(first[1])
    expect(perSeatOf('Fleet')).toBe(first[2])
  })

  test('the hero\u2019s entry price is the cheapest module\u2019s per-seat rate', async () => {
    renderLanding()
    const [first] = rateRows()
    const note = document.querySelector('.lp-hero-note')?.textContent ?? ''
    expect(eurosIn(note)[0]).toBe(Math.min(...first))
  })
})

describe('nothing unbuilt is sold as built', () => {
  test('Fleet is sold like the other modules, with no in-build label', async () => {
    // Decided 2026-10-28: Fleet is presented as shipped.
    renderLanding()

    const card = Array.from(document.querySelectorAll('.lp-module')).find(
      (c) => c.querySelector('h4')?.textContent === 'Fleet',
    )!
    expect(card.textContent).not.toMatch(/In build/i)
    expect(card.textContent).toMatch(/€\d+ a person a year/)
    expect(document.querySelector('.lp-arch-box--build')).toBeNull()
  })

  test('the Factory and Autopilot are sold as two annual licences', async () => {
    // Decided 2026-10-29: the Factory (expert-guided) and
    // Autopilot (learns from real users) are separate products.
    renderLanding()
    const card = Array.from(document.querySelectorAll('.lp-module')).find(
      (c) => c.querySelector('h4')?.textContent === 'Factory',
    )!
    expect(card.textContent).not.toMatch(/one-off|on acceptance/i)
    expect(card.textContent).toMatch(/€40k a year/)
    expect(card.textContent).toMatch(/Autopilot/)
  })

  test('every module links to its own page', async () => {
    renderLanding()
    for (const slug of ['codeindex', 'artifacts', 'fleet', 'factory']) {
      expect(document.querySelector(`.lp-module-more[href="/${slug}"]`), slug).not.toBeNull()
    }
  })

  test('every department mock is labelled an illustration', async () => {
    const user = userEvent.setup()
    renderLanding()

    const departments = within(screen.getByRole('tablist', { name: 'Departments' }))
    for (const tab of departments.getAllByRole('tab')) {
      await user.click(tab)
      expect(
        document.getElementById('lp-scn-panel')?.querySelector('.lp-illustrative')?.textContent,
        tab.textContent ?? '',
      ).toMatch(/Illustration/i)
    }
  })

  test('modelled sizing never sits in the headline strip', async () => {
    // Reviewers: "1 GPU serves about 200" is a sizing model, and stated as
    // a stat it reads as a measurement. It may appear in the FAQ, labelled.
    renderLanding()
    expect(document.querySelector('.landing-stats')?.textContent).not.toMatch(/200|heavy users|per GPU/)
  })

  test('one currency for prices: no dollar figures except the cited Uber one', async () => {
    renderLanding()
    const dollars = (document.body.textContent ?? '').match(/\$[\d,]+/g) ?? []
    expect(dollars).toEqual(['$500'])
  })

  test('the page never offers to host it', async () => {
    // Ignite Ember never hosts. The previous page offered "Managed by
    // us — we rent, rack, and run the GPUs".
    renderLanding()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/managed by us/i)
    expect(text).not.toMatch(/we (rent|rack|run) the GPUs/i)
  })
})

describe('the scenarios', () => {
  test('one tab is selected at a time and the panel follows it', async () => {
    const user = userEvent.setup()
    renderLanding()

    const departments = within(screen.getByRole('tablist', { name: 'Departments' }))
    await user.click(departments.getByRole('tab', { name: /Legal/ }))
    const selected = departments.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true')
    expect(selected.map((t) => t.textContent)).toEqual(['Legal'])
    expect(document.getElementById('lp-scn-panel')?.textContent).toMatch(/Factory/)
  })

  test('the Fleet animation stops when it leaves the screen', async () => {
    // It only exists on the Operations tab; switching away must clear
    // its interval, or every visit leaves a timer running.
    const user = userEvent.setup()
    renderLanding()
    const clear = vi.spyOn(window, 'clearInterval')

    await user.click(screen.getByRole('tab', { name: /Operations/ }))
    expect(document.querySelector('.lp-fleet')).not.toBeNull()
    await user.click(screen.getByRole('tab', { name: /Engineering/ }))

    expect(document.querySelector('.lp-fleet')).toBeNull()
    expect(clear).toHaveBeenCalled()
  })
})

describe('what an app adds to igni', () => {
  const marks = () =>
    Array.from(document.querySelectorAll('.lp-zones-layer .lp-zone-n')).map((n) => n.textContent)

  test('the switch moves between plain igni, the app\u2019s page and the app in a chat', async () => {
    const user = userEvent.setup()
    renderLanding()
    expect(screen.getByRole('button', { name: /With the Claims desk app/ })).toHaveAttribute('aria-pressed', 'true')
    expect(marks()).toEqual(['1', '2'])

    await user.click(screen.getByRole('button', { name: 'Plain igni' }))
    expect(marks()).toEqual([])

    await user.click(screen.getByRole('button', { name: 'The app in a chat' }))
    expect(marks()).toEqual(['1', '3', '4', '5'])
  })

  test('every mark on a capture is explained in the legend', async () => {
    const user = userEvent.setup()
    renderLanding()
    const told = Array.from(document.querySelectorAll('.lp-zones-legend ol .lp-zone-n')).map((n) => n.textContent)
    for (const name of [/With the Claims desk app/, 'The app in a chat']) {
      await user.click(screen.getByRole('button', { name }))
      for (const m of marks()) expect(told).toContain(m)
    }
  })
})

describe('the page renders its sections', () => {
  test('each anchored section has content under it', async () => {
    renderLanding()

    for (const id of ['platform', 'in-practice', 'modules', 'extensions', 'security', 'pricing', 'start', 'partners']) {
      const section = document.getElementById(id)
      expect(section, `#${id} is missing`).not.toBeNull()
      expect((section?.textContent ?? '').length, `#${id} is empty`).toBeGreaterThan(50)
    }
  })

  test('the company is named as the company', async () => {
    // igni is the software, Ignite Ember the company. Access and
    // liability statements name the company.
    renderLanding()
    expect(document.querySelector('.landing-footer')?.textContent).toMatch(/Ignite Ember/)
    expect(document.getElementById('security')?.textContent).toMatch(/Ignite Ember hosts nothing and has no route into your network/)
  })
})

describe('how an app talks to igni', () => {
  // The four lanes and the SDK names their samples use, checked against
  // igni-sdk: igni-extension, igni-service and igni-client.
  test('four lanes: host API, a message, an event, and igni-client through the gateway', () => {
    renderLanding()
    const lanes = Array.from(document.querySelectorAll('.lp-wire-lane'))
    expect(lanes.map((l) => l.querySelector('.lp-wire-link code')?.textContent)).toEqual([
      'ext.host',
      'send_message',
      'send_event',
      'igni-client',
    ])
    const client = lanes[3].textContent ?? ''
    expect(client).toMatch(/Python · igni-client/)
    expect(client).toMatch(/App\("claims-desk", server=IGNI_URL, key_file="claims\.pem"\)/)
    expect(client).toMatch(/gateway = Fleet\(GATEWAY_URL, auth=auth\)/)
    expect(client).toMatch(/IgniClient\(gateway\) as igni/)
    expect(client).toMatch(/igni\.sessions\.create\(\)/)
    expect(client).toMatch(/reply = await session\.ask\(/)
    expect(client).toMatch(/"Draft the assessment for CL-20431\.", approve=False/)
    expect(client).toMatch(/The gateway wakes the VM if it is asleep/)
    expect(client).toMatch(/A person’s API key, made on the portal, reaches their igni as them/)
    // Both hats: the app's own key, or a person's API key.
    expect(client).toMatch(/auth = App\("claims-desk", server=IGNI_URL, key_file="claims\.pem"\)/)
    expect(client).toMatch(/# auth = Person\.from_api_key\("igpak1\.…", server=IGNI_URL\)/)
    // The difference from a service's message: who gets the answer.
    expect(client).toMatch(/this is a live conversation: the answer comes back to your code/)
    expect(lanes[1].textContent).toMatch(/your\s+service does not get it back/)
  })

  test('says which part of an app each route uses: the extension or the service', () => {
    renderLanding()
    const wire = document.querySelector('.lp-wire')?.textContent ?? ''
    expect(wire).toMatch(/An app has up to two parts: an extension, which igni installs and\s+runs inside the person’s igni/)
    expect(wire).toMatch(/Your extension, its page or its process, sees what happens in igni/)
    expect(wire).toMatch(/Your service is not involved/)
    expect(wire).not.toMatch(/The app sees what happens/)
  })

  test('shows one lane at a time, switched by its tabs', async () => {
    const user = userEvent.setup()
    renderLanding()
    const shown = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.lp-wire-lane'))
        .filter((l) => !l.hidden)
        .map((l) => l.dataset.lane)
    const tabs = within(document.querySelector('.lp-wire') as HTMLElement).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Extension → igni app',
      'Service → agent: a message',
      'Service → extension: an event',
      'Your code → igni in Fleet',
    ])
    expect(shown()).toEqual(['host'])
    await user.click(tabs[3])
    expect(shown()).toEqual(['client'])
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true')
    await user.click(tabs[1])
    expect(shown()).toEqual(['message'])
  })
})
