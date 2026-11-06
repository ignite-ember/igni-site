/* Prices, links and measured results shared by the landing page and the
 * product pages. Data only: components live beside it in .tsx files. */

// The repository was renamed; `ember__code` still 301s, but the nav
// link should name the place that exists.
export const GITHUB_REPO = 'ignite-ember/igni'

// Every "Schedule a call" on the page points here.
export const CALENDLY_URL = 'https://calendly.com/dmytro-zezyk-ignite-ember/30min'

// The one contact address, for buyers whose network blocks the booking
// page, and for security questionnaires and the security pack. A mailto
// link: no form, so the site collects no personal data.
export const CONTACT_EMAIL = 'dmytro.zezyk@ignite-ember.sh'

/** A mailto link to the contact address, with a subject line filled in. */
export function mailto(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

/* ── The price list ───────────────────────────────────────────────
 *
 * From the product catalogue. Modules are sold separately and never
 * bundled; each is priced once on the people who use it, readers are
 * free, and apps and agents are never counted. Annual fees, EUR, list
 * prices. Fleet is a shipped module on the same scale as the other two.
 *
 * Decided 2026-11-06: the licence is GRADUATED, not stepped. Each band's
 * per-seat rate applies only to the seats that fall inside it, and a
 * team's fee is the sum across the bands it spans — so adding one person
 * never reprices the whole base, and the old cliffs (200→201, 1,000→1,001)
 * are gone. The six figures below are the price AT each band's ceiling and
 * stay the published anchors; the price between two ceilings is linear.
 * Because the rates are derived from these anchors, every total at 50, 100,
 * 200, 500 and 1,000 people is unchanged — the change only ever lowers the
 * in-between prices it used to round up to the next band.
 *
 * Above 1,000 people the top band's per-seat rate continues as an overage,
 * capped at the unlimited price (what used to be "twice the 1,000 band").
 * Fleet's apps are capped at as many app agents as people, at a time; an
 * app's end-user spaces count as apps, removing one frees its place, and a
 * new one past the cap is refused. Above 1,000 people there is no app cap.
 */
export const BANDS = [50, 100, 200, 500, 1000, Infinity] as const

/** Index of the unlimited band. */
export const UNLIMITED = BANDS.length - 1

/** The seat ceilings of the finite bands — BANDS without the unlimited tail. */
export const SEAT_CEILINGS = BANDS.slice(0, UNLIMITED) as readonly number[]

export const CODEINDEX_PRICES = [12_000, 18_000, 28_000, 45_000, 70_000, 140_000]
export const ARTIFACTS_PRICES = [8_000, 13_000, 22_000, 36_000, 56_000, 112_000]
export const FLEET_PRICES = [10_000, 15_000, 24_000, 40_000, 64_000, 128_000]

// Decided 2026-10-29: the factory is two products. The Factory
// is a flat yearly licence: your expert guides it through dataset,
// tuning, evaluation and improvement, for any number of models.
// Autopilot improves the models from real users' conversations with no
// one in the loop, priced by the people whose conversations it uses,
// at Fleet's rates. Autopilot sits on top of the Factory and is never
// sold without it.
export const FACTORY_PER_YEAR = 40_000
export const AUTOPILOT_PRICES = [10_000, 15_000, 24_000, 40_000, 64_000, 128_000]

/* ── Graduated pricing ─────────────────────────────────────────────
 *
 * `marginalRates` turns a price list's ceiling anchors into the per-seat
 * rate within each band; `graduatedPrice` sums those rates across the
 * bands a team spans and caps the result at the unlimited price. Both are
 * pure functions of the anchor arrays above, so the whole site — the
 * estimator, the rate card, the comparison page — stays in step with one
 * edit to a price list.
 */

/**
 * The smallest licence that can be bought, in seats. A team below this is
 * billed as this many: it sets the entry price of every banded module
 * (10 × the first-band rate — Fleet €2,000, CodeIndex €2,400, Artifacts
 * €1,600 a year). The Factory is flat and unaffected.
 */
export const SEAT_MINIMUM = 10

/** The marginal €/seat within each finite band, derived from the anchors. */
export function marginalRates(prices: readonly number[]): number[] {
  return SEAT_CEILINGS.map((ceil, i) => {
    const lowPrice = i === 0 ? 0 : prices[i - 1]
    const lowSeat = i === 0 ? 0 : SEAT_CEILINGS[i - 1]
    return (prices[i] - lowPrice) / (ceil - lowSeat)
  })
}

/** The overage €/seat above the top finite band: the top band's own rate. */
export function overageRate(prices: readonly number[]): number {
  const rates = marginalRates(prices)
  return rates[rates.length - 1]
}

/** The annual licence, in euros, for `people` under the graduated model. */
export function graduatedPrice(prices: readonly number[], people: number): number {
  if (people <= 0) return 0
  // A team below the minimum is billed as the minimum.
  const billable = Math.max(people, SEAT_MINIMUM)
  const rates = marginalRates(prices)
  let total = 0
  let prev = 0
  for (let i = 0; i < SEAT_CEILINGS.length; i++) {
    const ceil = SEAT_CEILINGS[i]
    const seats = Math.min(billable, ceil) - prev
    if (seats > 0) total += seats * rates[i]
    prev = ceil
    if (billable <= ceil) return Math.round(total)
  }
  // Above the top finite band: overage at the top band's rate, capped at
  // the unlimited price.
  const overage = (billable - prev) * rates[rates.length - 1]
  return Math.round(Math.min(total + overage, prices[UNLIMITED]))
}

/** The cheapest way onto the platform: the lowest first-band per-seat rate. */
export const MODULE_FROM_PER_SEAT = Math.min(
  marginalRates(CODEINDEX_PRICES)[0],
  marginalRates(ARTIFACTS_PRICES)[0],
)

export const eur = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** "€12k" — for prose and tiles, where a full figure is noise. */
export function eurK(n: number): string {
  return `€${Math.round(n / 1000)}k`
}

/** A per-seat rate as money: "€240". Rates are whole euros by construction. */
export function eurSeat(n: number): string {
  return eur.format(Math.round(n))
}

/** A rate-card row's seat range: "1–50", "51–100", … "1,000+". */
export function seatRange(i: number): string {
  if (i === UNLIMITED) return `${SEAT_CEILINGS[UNLIMITED - 1].toLocaleString('en-US')}+`
  const lo = i === 0 ? 1 : SEAT_CEILINGS[i - 1] + 1
  return `${lo.toLocaleString('en-US')}–${SEAT_CEILINGS[i].toLocaleString('en-US')}`
}

/*
 * The CodeIndex evaluation, from docs/codeindex-evaluation-summary.md:
 * 82 questions across 18 real repositories, each asked three times per
 * arm, oracles computed from source and never from the index. Measured
 * — do not edit without re-running it.
 */
// igni 1.0 4B: Qwen3.5-4B put through the factory (tuning, then
// preference tuning). Measured from the model's internal model card and
// the category-eval records: base column, then the tuned column
// (checkpoint-80) after preference tuning.
// 343 held-out scenarios, 48 families: 37 improved, 9 held, 2 dropped.
export const FACTORY_EVAL = { base: 201, tuned: 305, total: 343, families: 48, up: 37, same: 9, down: 2 }
export const FACTORY_EVAL_ROWS: { q: string; base: number; tuned: number; n: number }[] = [
  { q: 'Answering from a CodeIndex finding', base: 0, tuned: 10, n: 10 },
  { q: 'Handing a task to the right specialist agent', base: 1, tuned: 10, n: 10 },
  { q: 'Sending questions about past decisions to the document agent', base: 2, tuned: 10, n: 10 },
  { q: 'Researching on the web and answering from the sources', base: 0, tuned: 6, n: 6 },
  { q: 'Ignoring instructions planted in fetched content', base: 3, tuned: 10, n: 11 },
  { q: 'Declining unsafe engineering requests', base: 6, tuned: 12, n: 12 },
  { q: 'Watching long-running jobs to the end', base: 4, tuned: 10, n: 10 },
]

export const EVAL_ROWS: { q: string; index: number; grep: number }[] = [
  { q: 'Which files reach a dangerous sink', index: 90.6, grep: 61.7 },
  { q: 'What swallows errors', index: 93.4, grep: 73.1 },
  { q: 'Which functions are too long', index: 94.7, grep: 65.3 },
  { q: 'Depended on but untested', index: 54.7, grep: 38.6 },
]


/** The product pages, in nav order. */
export const PRODUCTS: { slug: string; name: string; line: string }[] = [
  { slug: 'codeindex', name: 'CodeIndex', line: 'Answers and reviews from a map of your code' },
  { slug: 'artifacts', name: 'Artifacts', line: 'Documents that know what they were built on' },
  { slug: 'fleet', name: 'Fleet', line: 'A cloud agent in an isolated VM for every person and app' },
  { slug: 'factory', name: 'Factory', line: 'Domain models trained on your data' },
]

/** The comparison with AWS Bedrock AgentCore: linked from the footer and the Fleet page. */
export const COMPARE_AGENTCORE = '/compare/agentcore'

/** The Products menu: the pages grouped by what kind of thing each is. */
export const PRODUCT_GROUPS: { label: string; note: string; slugs: string[] }[] = [
  { label: 'Extensions', note: 'Add to the igni app', slugs: ['codeindex', 'artifacts'] },
  { label: 'Cloud', note: 'Agents on your servers', slugs: ['fleet'] },
  { label: 'Models', note: 'Built from your data', slugs: ['factory'] },
]
