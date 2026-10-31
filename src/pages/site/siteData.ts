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
 * bundled; each is banded once on the people who use it, readers are
 * free, and apps and agents are never counted. Fixed annual fees, EUR,
 * list prices.
 *
 * Fleet is quoted as a shipped module at the catalogue's Fleet prices,
 * on the same bands as the other two.
 *
 * A sixth band, 1,000+, is unlimited at
 * twice the 1,000 band's price, replacing "per extra 1,000". Fleet's apps
 * are capped: each band includes as many app agents as people, at a time.
 * An app's end-user spaces count as apps; removing one frees its place,
 * and a new one past the cap is refused. The unlimited band has no cap.
 */
export const BANDS = [50, 100, 200, 500, 1000, Infinity] as const

/** Index of the unlimited band. */
export const UNLIMITED = BANDS.length - 1

export const CODEINDEX_PRICES = [12_000, 18_000, 28_000, 45_000, 70_000, 140_000]
export const ARTIFACTS_PRICES = [8_000, 13_000, 22_000, 36_000, 56_000, 112_000]
export const FLEET_PRICES = [10_000, 15_000, 24_000, 40_000, 64_000, 128_000]

// Decided 2026-10-29: the factory is two products. The Factory
// is a flat yearly licence: your expert guides it through dataset,
// tuning, evaluation and improvement, for any number of models.
// Autopilot improves the models from real users' conversations with no
// one in the loop, banded by the people whose conversations it uses,
// at Fleet's prices. Autopilot sits on top of the Factory and is never
// sold without it.
export const FACTORY_PER_YEAR = 40_000
export const AUTOPILOT_PRICES = [10_000, 15_000, 24_000, 40_000, 64_000, 128_000]

/** The cheapest entry on the list: one module, smallest band. */
export const MODULE_FROM = Math.min(CODEINDEX_PRICES[0], ARTIFACTS_PRICES[0])

export const eur = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** "€12k" — for prose and tiles, where a full figure is noise. */
export function eurK(n: number): string {
  return `€${Math.round(n / 1000)}k`
}

/** A band's label: "≤ 50 people", "≤ 50 developers", or "Unlimited people". */
export function bandLabel(i: number, unit = 'people'): string {
  if (i === UNLIMITED) return `Unlimited ${unit}`
  return `≤ ${BANDS[i].toLocaleString('en-US')} ${unit}`
}

/** A band's short name for a picker: "≤ 50", or "" for the unlimited band, which shows the infinity icon. */
export function bandShort(i: number): string {
  return i === UNLIMITED ? '' : `≤ ${BANDS[i].toLocaleString('en-US')}`
}

/** What a screen reader says for a band's picker button. */
export function bandSpoken(i: number): string {
  return i === UNLIMITED ? 'Unlimited' : `Up to ${BANDS[i].toLocaleString('en-US')}`
}

/** What Fleet includes for apps in a band. */
export function fleetApps(i: number): string {
  return i === UNLIMITED ? 'apps unlimited' : `up to ${BANDS[i].toLocaleString('en-US')} apps at a time`
}

/*
 * The CodeIndex evaluation, from docs/codeindex-evaluation-summary.md:
 * 82 questions across 18 real repositories, each asked three times per
 * arm, oracles computed from source and never from the index. Measured
 * — do not edit without re-running it.
 */
// igni 1.0 4B: Qwen3.5-4B put through the factory (tuning, then
// preference tuning). igni__fine-tuning, outputs/igni-1.0-4b_MODEL_CARD.md;
// base column from docs/CATEGORY_EVAL_JUDGED_qwen35-4b.md, tuned column
// (checkpoint-80) from docs/DPO_CATEGORY_EVAL_JUDGED_qwen35-4b.md.
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

/** The Products menu: the pages grouped by what kind of thing each is. */
export const PRODUCT_GROUPS: { label: string; note: string; slugs: string[] }[] = [
  { label: 'Extensions', note: 'Add to the igni app', slugs: ['codeindex', 'artifacts'] },
  { label: 'Cloud', note: 'Agents on your servers', slugs: ['fleet'] },
  { label: 'Models', note: 'Built from your data', slugs: ['factory'] },
]
