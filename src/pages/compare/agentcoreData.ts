/* The figures on the AgentCore comparison page. Data only: the page and
 * its figures live beside it in .tsx files.
 *
 * Ported from the comparison written on 2 November 2026, whose AWS facts
 * and list prices were checked against AWS's documentation on 1–2
 * November 2026. Usage figures are assumptions, listed on the page under
 * "Assumptions and sources". Do not edit a number here without redoing
 * the sum it came from: the cost lines are AWS list prices in dollars at
 * €1 = $1.10, and igni's lines are the graduated Fleet licence from
 * siteData.ts (which at 200 people comes to €24k) plus hardware. A test
 * checks that the price list still says what this page assumed.
 */

/** When the AWS side was last checked. Shown on the page; keep it true. */
export const AWS_CHECKED = '1–2 November 2026'
export const WRITTEN = '2 November 2026'

/** The band the 200-person case is priced on: index into BANDS. */
export const BAND_200 = 2

/* ── At a glance ──────────────────────────────────────────────────── */

export type Has = 'full' | 'half' | 'none'

export const HAS_LABEL: Record<Has, string> = {
  full: 'Has it',
  half: 'Partial',
  none: 'No',
}

/** One row per capability. `igniNote` overrides the label for a half. */
export const COVERAGE: { cap: string; aws: Has; igni: Has; igniNote?: string }[] = [
  { cap: 'Agent runtime', aws: 'full', igni: 'full' },
  { cap: 'Persistent per-person workspace', aws: 'half', igni: 'full' },
  { cap: 'Memory service', aws: 'full', igni: 'full' },
  { cap: 'MCP tools', aws: 'full', igni: 'full' },
  { cap: 'REST APIs as MCP tools', aws: 'full', igni: 'half', igniNote: 'Via open source' },
  { cap: 'Identity', aws: 'full', igni: 'full' },
  { cap: 'Policy & network', aws: 'full', igni: 'full' },
  { cap: 'Audit & observability', aws: 'full', igni: 'full' },
  { cap: 'Code execution', aws: 'full', igni: 'full' },
  { cap: 'Web browser', aws: 'full', igni: 'half', igniNote: 'Via open source' },
  { cap: 'Web search', aws: 'full', igni: 'full' },
  { cap: 'Changeable VM profiles', aws: 'half', igni: 'full' },
  { cap: 'Evaluations', aws: 'full', igni: 'full' },
  { cap: 'Models', aws: 'full', igni: 'full' },
  { cap: 'Coding assistant', aws: 'half', igni: 'full' },
  { cap: 'End-user app (UI)', aws: 'none', igni: 'full' },
  { cap: 'Extensions with UI', aws: 'half', igni: 'full' },
  { cap: 'On-prem / air-gapped', aws: 'none', igni: 'full' },
  { cap: 'Fixed price', aws: 'none', igni: 'full' },
  { cap: 'Certification & assurance', aws: 'full', igni: 'half', igniNote: 'Software, not a service: CRA evidence in build' },
]

export function countFull(side: 'aws' | 'igni'): number {
  return COVERAGE.filter((r) => r[side] === 'full').length
}

/* ── Cost for 200 people, € thousand a year ───────────────────────── */

export type Side = 'aws' | 'igni'

/** The side-by-side bars: a range, low to high, drawn to the high end. */
export const COST_BARS: { label: string; side: Side; low: number; high: number }[] = [
  { label: 'AgentCore, all services, no model', side: 'aws', low: 52, high: 66 },
  { label: 'AgentCore + open-weight model (Qwen3 32B)', side: 'aws', low: 88, high: 107 },
  { label: 'AgentCore + Claude Sonnet (frontier model)', side: 'aws', low: 363, high: 413 },
  { label: 'Fleet licence + CPU servers', side: 'igni', low: 37, high: 39 },
  { label: 'igni: Fleet + servers + 1 GH200 (bought or rented)', side: 'igni', low: 51, high: 57 },
]

/** The longest cost bar's share of its track, leaving room for its amount after it. */
export const COST_SCALE = 80

/** What each bill is made of: open-weight model, heavy use, middle of each range. */
export const BREAKDOWN: { side: Side; name: string; total: number; parts: { label: string; k: number }[] }[] = [
  {
    side: 'aws',
    name: 'AgentCore',
    total: 107,
    parts: [
      { label: 'Runtime', k: 42 },
      { label: 'Services', k: 24 },
      { label: 'Model tokens', k: 40 },
    ],
  },
  {
    side: 'igni',
    name: 'igni + Fleet',
    total: 54,
    parts: [
      { label: 'Licence', k: 24 },
      { label: 'Servers', k: 14 },
      { label: 'GPU', k: 16 },
    ],
  },
]

/**
 * If the team is a different size: the same heavy per-person workload, but
 * a different number of people — from a 50-person team to a 5,000-person
 * enterprise. The axis is people, but it stands for load: each person's
 * agent, the app agents a Fleet band includes (as many as there are
 * people), and the parallel subagent runs an agent spawns all load the
 * same GPUs, so more apps or more fan-out move along the same curve.
 *
 * AgentCore is at list and scales ~linearly with people (≈€0.52k a person
 * a year: open-weight model, heavy use, one session each). igni is the
 * graduated Fleet licence plus the hardware the load takes: 1 GH200 per
 * ~200 people (€14–18k each) and a CPU server per ~150 (€6.5–7.5k each,
 * two minimum). The licence is graduated (siteData.ts), so each team pays
 * only for the people in each band: it comes to €10k at 50, €15k at 100,
 * €24k at 200, €29k at 300, €35k at 400, €40k at 500, €45k at 600, €66k at
 * 1,000 and €97k at 2,000, reaching the €128k ceiling at 3,000. Above 3,000
 * the licence is flat at €128k — no further per-person charge. The old
 * stepped bands doubled at each edge; the graduated licence does not.
 *
 * The 200-person row is the measured/modelled anchor (BAND_200, 1 GH200);
 * the rows above 1,000 people scale that sizing linearly and are MODELLED,
 * not measured — the page says so. The table shows every row; the chart
 * (AgentCoreFigures) plots only the rows ≤600, where the two lines are
 * still legible side by side. Do not edit a number without redoing the
 * sum: licence = graduatedPrice(FLEET_PRICES, people), hardware from the
 * per-unit rates above (low = €14k GPU + €6.5k server; high = €18k + €7.5k).
 */
export const USAGE: { people: number; aws: number; igni: [number, number]; hw: string }[] = [
  { people: 50, aws: 29, igni: [37, 43], hw: '1 GH200, 2 servers · €10k licence' },
  { people: 100, aws: 55, igni: [42, 48], hw: '1 GH200, 2 servers · €15k licence' },
  { people: 200, aws: 107, igni: [51, 57], hw: '1 GH200, 2 servers · €24k licence' },
  { people: 300, aws: 159, igni: [70, 80], hw: '2 GH200, 2 servers · €29k licence' },
  { people: 400, aws: 211, igni: [82, 93], hw: '2 GH200, 3 servers · €35k licence' },
  { people: 500, aws: 263, igni: [108, 124], hw: '3 GH200, 4 servers · €40k licence' },
  { people: 600, aws: 315, igni: [113, 129], hw: '3 GH200, 4 servers · €45k licence' },
  { people: 1000, aws: 523, igni: [182, 209], hw: '5 GH200, 7 servers · €66k licence' },
  { people: 2000, aws: 1043, igni: [328, 382], hw: '10 GH200, 14 servers · €97k licence' },
  { people: 5000, aws: 2603, igni: [699, 833], hw: '25 GH200, 34 servers · €128k licence (flat)' },
]

/* ── Speed ────────────────────────────────────────────────────────── */

/**
 * How long a person waits for their agent after it has been idle, in
 * milliseconds, drawn to `ms` (the upper end of a range). Fleet: measured
 * p50 on a bare-metal GCP server (C3, 50 and 300 agents); the new-app figure
 * on a nested-virtualisation GCP VM. AgentCore: AWS's published P75
 * cold start, once the idle timeout has ended the session.
 */
export const WAKE: { label: string; side: Side; ms: number; shown: string }[] = [
  { label: 'Fleet: new app (pre-started)', side: 'igni', ms: 25, shown: '25 ms' },
  { label: 'Fleet: back from a pause', side: 'igni', ms: 30, shown: '~29–30 ms' },
  { label: 'Fleet: from a snapshot', side: 'igni', ms: 155, shown: '~146–155 ms' },
  { label: 'Fleet: from cold', side: 'igni', ms: 139, shown: '~137–139 ms' },
  { label: 'AgentCore: after its idle timeout', side: 'aws', ms: 2000, shown: '~2 s (P75, AWS)' },
]

export const WAKE_MAX_MS = 2000
