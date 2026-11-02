/* The figures on the AgentCore comparison page. Data only: the page and
 * its figures live beside it in .tsx files.
 *
 * Ported from the comparison written on 2 November 2026, whose AWS facts
 * and list prices were checked against AWS's documentation on 1–2
 * November 2026. Usage figures are assumptions, listed on the page under
 * "Assumptions and sources". Do not edit a number here without redoing
 * the sum it came from: the cost lines are AWS list prices in dollars at
 * €1 = $1.10, and igni's lines are the ≤ 200 band of the price list in
 * siteData.ts plus hardware. A test checks that the price list still
 * says what this page assumed.
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
  { cap: 'Certifications', aws: 'full', igni: 'none' },
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
 * If usage is different: the same 200 people, each using their agent
 * more or less than the heavy case. AgentCore at list; igni's range
 * includes the Fleet licence and the hardware it takes.
 */
export const USAGE: { pct: number; aws: number; igni: [number, number]; hw: string }[] = [
  { pct: 25, aws: 29, igni: [51, 57], hw: '1 GH200, 2 servers' },
  { pct: 50, aws: 55, igni: [51, 57], hw: '1 GH200, 2 servers' },
  { pct: 100, aws: 107, igni: [51, 57], hw: '1 GH200, 2 servers' },
  { pct: 150, aws: 159, igni: [65, 75], hw: '2 GH200, 2 servers' },
  { pct: 200, aws: 211, igni: [72, 82], hw: '2 GH200, 3 servers' },
  { pct: 250, aws: 263, igni: [92, 108], hw: '3 GH200, 4 servers' },
  { pct: 300, aws: 315, igni: [92, 108], hw: '3 GH200, 4 servers' },
]

/* ── Speed ────────────────────────────────────────────────────────── */

/**
 * How long a person waits for their agent after it has been idle, in
 * milliseconds, drawn to `ms` (the upper end of a range). Fleet: measured
 * p50 on a nested-virtualisation GCP VM. AgentCore: AWS's published P75
 * cold start, once the idle timeout has ended the session.
 */
export const WAKE: { label: string; side: Side; ms: number; shown: string }[] = [
  { label: 'Fleet: new app (pre-started)', side: 'igni', ms: 25, shown: '25 ms' },
  { label: 'Fleet: back from a pause', side: 'igni', ms: 29, shown: '~29 ms' },
  { label: 'Fleet: from a snapshot', side: 'igni', ms: 150, shown: '~95–150 ms' },
  { label: 'Fleet: from cold', side: 'igni', ms: 230, shown: '~200–230 ms' },
  { label: 'AgentCore: after its idle timeout', side: 'aws', ms: 2000, shown: '~2 s (P75, AWS)' },
]

export const WAKE_MAX_MS = 2000
