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

import { FLEET_PRICES, graduatedPrice } from '../site/siteData'

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
 * p50 on a bare-metal GCP server (C3, 100-300 agents); a new app's VM is
 * started and paused when the app is created, so its first wake is a paused
 * one. AgentCore: AWS's published P75
 * cold start, once the idle timeout has ended the session.
 */
export const WAKE: { label: string; side: Side; ms: number; shown: string }[] = [
  { label: 'Fleet: new app (pre-started)', side: 'igni', ms: 33, shown: '~30 ms' },
  { label: 'Fleet: back within 10 minutes', side: 'igni', ms: 33, shown: '~27–33 ms' },
  { label: 'Fleet: back after a long idle', side: 'igni', ms: 40, shown: '~36–40 ms' },
  { label: 'Fleet: from a snapshot', side: 'igni', ms: 148, shown: '~142–148 ms' },
  { label: 'Fleet: from cold', side: 'igni', ms: 141, shown: '~135–141 ms' },
  { label: 'AgentCore: after its idle timeout', side: 'aws', ms: 2000, shown: '~2 s (P75, AWS)' },
]

export const WAKE_MAX_MS = 2000

/* ── Cost by usage ────────────────────────────────────────────────
 *
 * The 200-person case above prices a person; this prices use. One agent
 * session is modelled as a 15-minute cycle in which it works for W
 * seconds and waits for the rest. Both bills are computed from the
 * inputs below, nothing else: the page's calculator and its three worked
 * cases call these same functions, and the test checks the worked cases
 * against the figures the page prints.
 *
 * AgentCore: runtime v2 at us-east-1 list, re-checked on the pricing
 * page on 7 November 2026. Fleet: the graduated licence from the price
 * list plus the servers the load takes. Model tokens are left out on
 * both sides. AgentCore is in dollars and igni in euros; this section
 * does not convert between them.
 */

/** When the usage section's AWS prices and server listing were checked. */
export const USAGE_CHECKED = '7 November 2026'

/** AgentCore Runtime v2, list, us-east-1: the pricing page and the LifecycleConfiguration API reference. */
export const AC_RUNTIME = {
  /** $ per vCPU-hour, consumption. Not billed while the agent waits on I/O. */
  vcpuHour: 0.1276,
  /** $ per GB-hour, consumption. */
  gbHour: 0.0169,
  /** Idle memory is reclaimed after this many seconds. */
  reclaimS: 120,
  /** The 128 MB minimum memory billed, in GB. */
  floorGb: 0.125,
  /** maxLifetime: a session ends after 8 hours at most (28,800 s). */
  maxLifetimeH: 8,
  /** Default idle timeout (idleRuntimeSessionTimeout), s. */
  idleTimeoutS: 900,
} as const

/**
 * The CPU server, bought: Bytestock's UK listing, checked 7 November 2026,
 * £17,950 ex VAT. A server-year is the page's existing basis — two
 * servers at €13–15k a year over 4 years with power and support.
 */
export const SERVER = {
  name: 'Dell PowerEdge R7625',
  cpus: '2 × AMD EPYC 9474F',
  cores: 96,
  threads: 192,
  ramGb: 256,
  priceGbp: 17_950,
  /** € per server-year, low and high. */
  perYear: [6_500, 7_500] as [number, number],
} as const

/** The share of each server sizing may use: the rest is headroom. */
export const HEADROOM = { ram: 0.85, threads: 0.7 } as const

/** Host RAM a paused Fleet agent holds, GB: the median of the measured 190–240 MiB. */
export const PAUSED_GB = 0.23

/** The cycle the model is written in, in seconds. */
export const CYCLE_S = 900

export type Schedule = 'always' | 'working'

/** Hours a year the agents run: all day, or 8 h a day on ~21 days a month. */
export const SCHEDULE_HOURS: Record<Schedule, number> = {
  always: 24 * 365,
  working: 8 * 21 * 12,
}

export type UsageInputs = {
  /** Sessions N: agents, one per person or app. */
  sessions: number
  /** Seconds of work W in each 15-minute cycle, 0–900. */
  workS: number
  /** vCPU C per agent. */
  vcpu: number
  /** CPU busy fraction B while working, 0–1. */
  busy: number
  /** GB M held while working. */
  memGb: number
  schedule: Schedule
}

export type AgentCoreYear = {
  /** $ a year for CPU. */
  cpu: number
  /** $ a year for memory while the agent works. */
  memWorking: number
  /** $ a year for memory while it waits: 120 s at full size, then the 128 MB floor. */
  memIdle: number
  total: number
  /** The share of the bill paid while the agent is idle, 0–1. */
  idleShare: number
}

/** AgentCore's runtime bill for a year, in dollars. */
export function agentCoreYear(i: UsageInputs): AgentCoreYear {
  const w = Math.min(Math.max(i.workS, 0), CYCLE_S)
  const cycles = (SCHEDULE_HOURS[i.schedule] * 3600) / CYCLE_S
  const idle = CYCLE_S - w
  const vcpuS = w * i.vcpu * i.busy
  const gbSWorking = i.memGb * w
  const gbSIdle = i.memGb * Math.min(AC_RUNTIME.reclaimS, idle) + AC_RUNTIME.floorGb * Math.max(0, idle - AC_RUNTIME.reclaimS)
  const perYear = (unitS: number, rate: number) => (unitS / 3600) * rate * cycles * i.sessions
  const cpu = perYear(vcpuS, AC_RUNTIME.vcpuHour)
  const memWorking = perYear(gbSWorking, AC_RUNTIME.gbHour)
  const memIdle = perYear(gbSIdle, AC_RUNTIME.gbHour)
  const total = cpu + memWorking + memIdle
  return { cpu, memWorking, memIdle, total, idleShare: total > 0 ? memIdle / total : 0 }
}

export type FleetYear = {
  /** € a year: the graduated Fleet licence for `sessions` people. */
  licence: number
  /** Agents working at once, A = N·W/900. */
  active: number
  /** GB of RAM the agents need at once. */
  ramGb: number
  /** Threads busy at once. */
  busyThreads: number
  /** Servers RAM alone needs, at its headroom. */
  byRam: number
  /** Servers the busy threads alone need, at their headroom. */
  byThreads: number
  /** Servers to buy: the larger of the two, plus one spare. */
  servers: number
  /** € a year for the servers, low and high. */
  serverCost: [number, number]
  /** € a year, licence + servers, low and high. */
  total: [number, number]
}

/** Fleet's bill for a year, in euros. The schedule does not change it: servers are sized for the working peak and owned all year. */
export function fleetYear(i: UsageInputs): FleetYear {
  const w = Math.min(Math.max(i.workS, 0), CYCLE_S)
  const licence = graduatedPrice(FLEET_PRICES, i.sessions)
  const active = (i.sessions * w) / CYCLE_S
  const ramGb = active * i.memGb + (i.sessions - active) * PAUSED_GB
  const busyThreads = active * i.vcpu * i.busy
  // Rounded to a millionth before the ceiling, so a float such as
  // 2.0000000001 does not buy a server.
  const fit = (need: number, per: number) => Math.ceil(Math.round((need / per) * 1e6) / 1e6)
  const byRam = fit(ramGb, SERVER.ramGb * HEADROOM.ram)
  const byThreads = fit(busyThreads, SERVER.threads * HEADROOM.threads)
  const servers = Math.max(byRam, byThreads, 1) + 1
  const serverCost: [number, number] = [servers * SERVER.perYear[0], servers * SERVER.perYear[1]]
  return {
    licence,
    active,
    ramGb,
    busyThreads,
    byRam,
    byThreads,
    servers,
    serverCost,
    total: [licence + serverCost[0], licence + serverCost[1]],
  }
}

/** The unit a usage-section amount is printed in: millions from €/$1M up, else thousands. */
const unitOf = (n: number): [number, string] => (Math.abs(n) >= 1_000_000 ? [1_000_000, 'M'] : [1000, 'k'])
const short = (n: number, div: number) =>
  (n / div).toLocaleString('en-US', { maximumFractionDigits: div === 1000 ? 1 : 2 })
/** "$118.7k", "$1.93M": a dollar figure as the usage section prints it. */
export const usdShort = (n: number) => {
  const [div, unit] = unitOf(n)
  return `$${short(n, div)}${unit}`
}
/** "€66k", "€85.5k", "€1.2M": a euro figure. */
export const eurShort = (n: number) => {
  const [div, unit] = unitOf(n)
  return `€${short(n, div)}${unit}`
}
/** "€85.5–88.5k", "€1.05–1.2M": a euro range, both ends in the unit of the higher. */
export const eurRangeShort = ([lo, hi]: [number, number]) => {
  const [div, unit] = unitOf(hi)
  return `€${short(lo, div)}–${short(hi, div)}${unit}`
}
/** "4 min 30 s", "45 s", "15 min". */
export const duration = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r} s`
  return r === 0 ? `${m} min` : `${m} min ${r} s`
}

/** The worked cases' shared inputs: 1,000 sessions, 2 vCPU busy 30%, 2 GB, all day. */
export const WORKED_BASE: Omit<UsageInputs, 'workS'> = { sessions: 1000, vcpu: 2, busy: 0.3, memGb: 2, schedule: 'always' }

/**
 * The three worked cases as the page states them, worked by hand from the
 * functions above: AgentCore in $ thousand a year, Fleet in € thousand.
 * The test recomputes them; edit only together with the functions.
 */
export const WORKED: {
  workS: number
  label: string
  aws: number
  awsIdle: number
  idlePct: number
  servers: number
  igni: [number, number]
}[] = [
  { workS: 60, label: '1 minute in 15', aws: 118.7, awsIdle: 54.3, idlePct: 46, servers: 3, igni: [85.5, 88.5] },
  { workS: 300, label: '5 minutes in 15', aws: 371.6, awsIdle: 49.3, idlePct: 13, servers: 5, igni: [98.5, 103.5] },
  { workS: 900, label: 'All the time', aws: 966.8, awsIdle: 0, idlePct: 0, servers: 11, igni: [137.5, 148.5] },
]
