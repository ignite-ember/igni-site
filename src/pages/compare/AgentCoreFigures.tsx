import { useState, type ReactNode } from 'react'
import {
  BrowserIcon,
  ChevronDownIcon,
  CommentIcon,
  GearIcon,
  LockIcon,
  TerminalIcon,
} from '@primer/octicons-react'
import {
  AC_RUNTIME,
  BREAKDOWN,
  COST_SCALE,
  COST_BARS,
  COVERAGE,
  HAS_LABEL,
  USAGE,
  HEADROOM,
  PAUSED_GB,
  SCHEDULE_HOURS,
  SERVER,
  WAKE,
  WAKE_MAX_MS,
  WORKED,
  WORKED_BASE,
  agentCoreYear,
  duration,
  eurK1,
  eurRangeK,
  fleetYear,
  usdK,
  type Has,
  type Schedule,
  type UsageInputs,
} from './agentcoreData'
import { PillTabs } from '../site/Sections'

/* ── The comparison page's figures ────────────────────────────────
 *
 * Drawn in HTML wherever the figure is boxes and bars, so it reflows to
 * a phone instead of shrinking; the one line chart is SVG. Colours are
 * the page's two sides and nothing else: orange is igni, neutral grey is
 * AgentCore — the same pairing the landing page uses for CodeIndex
 * against text search. No AWS colours or marks.
 *
 * Every bar is drawn to the number printed beside it, and the page's
 * test checks that.
 */

/* ── Shared pieces ─────────────────────────────────────────────── */

/**
 * One point, both sides: a single landing-page card with AgentCore first,
 * as the source has it, and Fleet under a rule. No panels inside it.
 */
export function VsCard({ label, aws, igni, igniName = 'Fleet' }: { label: string; aws: ReactNode; igni: ReactNode; igniName?: string }) {
  return (
    <div className="lp-sec-card cmp-vs">
      <h4>{label}</h4>
      <div className="cmp-vs-side">
        <span className="cmp-who cmp-who--aws">AgentCore</span>
        <p>{aws}</p>
      </div>
      <div className="cmp-vs-side">
        <span className="cmp-who cmp-who--igni">{igniName}</span>
        <p>{igni}</p>
      </div>
    </div>
  )
}

/**
 * A table that turns into labelled blocks on a phone, so long text
 * never makes the page scroll sideways. `num` are the columns that
 * hold figures (right-aligned, tabular); `total` the rows that sum.
 */
export function RTable({
  head,
  rows,
  num = [],
  total = [],
  className = '',
}: {
  head: string[]
  rows: ReactNode[][]
  num?: number[]
  total?: number[]
  className?: string
}) {
  return (
    <div className={`cmp-table-wrap ${className}`}>
      <table className="cmp-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} className={num.includes(i) ? 'cmp-num' : undefined}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className={total.includes(r) ? 'cmp-total' : undefined}>
              {cells.map((c, i) => (
                <td key={i} data-label={head[i]} className={num.includes(i) ? 'cmp-num' : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Figure({ title, caption, children, after }: { title: string; caption?: ReactNode; children: ReactNode; after?: ReactNode }) {
  return (
    <figure className="cmp-panel">
      <h4>{title}</h4>
      {caption && <p className="cmp-cap">{caption}</p>}
      {children}
      {after && <p className="cmp-cap cmp-cap--after">{after}</p>}
    </figure>
  )
}

/* ── Where each piece runs ─────────────────────────────────────── */

const AWS_SERVICES = [
  'Memory',
  'Gateway (MCP tools)',
  'Identity · Policy',
  'Session storage · S3',
  'Browser · Code Interpreter',
  'CloudWatch',
]

const IGNI_SERVICES = [
  'Models · your GPUs',
  'Keys · your Vault',
  'Your object store',
  'igni server · audit',
]

export function Architecture() {
  return (
    <div className="cmp-arch">
      <section className="cmp-arch-panel cmp-arch-panel--aws" aria-label="AgentCore">
        <span className="cmp-arch-where">AWS region</span>
        <div className="cmp-arch-box">
          Your front end — <span className="cmp-muted">you build it</span>
        </div>
        <span className="cmp-arch-down" aria-hidden="true">↓</span>
        <div className="cmp-arch-split">
          <div>
            <div className="cmp-arch-box cmp-arch-box--left">
              <strong>Runtime</strong>
              <div className="cmp-arch-vms">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="cmp-arch-vm cmp-arch-vm--session">
                    session<em>≤ 8 h</em>
                  </span>
                ))}
              </div>
              <span className="cmp-muted cmp-small">VM discarded when the session ends</span>
            </div>
            <span className="cmp-arch-down" aria-hidden="true">↓</span>
            <div className="cmp-arch-box">
              Bedrock models <span className="cmp-muted">· per token</span>
            </div>
          </div>
          <ul className="cmp-arch-services">
            {AWS_SERVICES.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <p className="cmp-arch-foot">Metered: vCPU-hours, GB-hours, calls, records, tokens</p>
      </section>

      <section className="cmp-arch-panel cmp-arch-panel--igni" aria-label="igni with Fleet">
        <span className="cmp-arch-where">Your network — can be air-gapped</span>
        <div className="cmp-arch-box">
          Your services, commands and events <span className="cmp-muted">· through igni server and the gateway&rsquo;s API</span>
        </div>
        <span className="cmp-arch-down" aria-hidden="true">↓</span>
        <div className="cmp-arch-split">
          <div>
            <div className="cmp-arch-box cmp-small">Fleet gateway · authenticates, wakes, routes, caps</div>
            <span className="cmp-arch-down" aria-hidden="true">↓</span>
            <div className="cmp-arch-box cmp-arch-box--left">
              <strong>Node <span className="cmp-muted">· egress rules</span></strong>
              <div className="cmp-arch-vms">
                {['Ada', 'Ben', 'Claims app'].map((who) => (
                  <span key={who} className="cmp-arch-vm cmp-arch-vm--owned">
                    <strong>{who}</strong>
                    <em>VM</em>
                    <span className="cmp-arch-disk">
                      <LockIcon size={12} aria-label="encrypted" /> disk
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <ul className="cmp-arch-services">
            {IGNI_SERVICES.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <p className="cmp-arch-foot">Fixed licence · idle VMs suspend and keep their disks</p>
      </section>
    </div>
  )
}

/* ── A week of one person's agent ──────────────────────────────── */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

/** Working 9–17 on each of five days, as a share of the week. */
const SESSIONS = DAYS.map((_, d) => ({ left: d * 20 + (9 / 24) * 20, width: (8 / 24) * 20 }))

/** The agent update, at midday on Wednesday. */
const UPDATE_AT = 50

function WeekRow({ label, side, children }: { label: string; side: 'aws' | 'igni'; children: ReactNode }) {
  return (
    <div className="cmp-week-row">
      <span className={`cmp-week-label cmp-week-label--${side}`}>{label}</span>
      <div className="cmp-week-track">
        {DAYS.map((d) => <span key={d} className="cmp-week-day" />)}
        {children}
      </div>
    </div>
  )
}

function Span({ left, width, kind }: { left: number; width: number; kind: string }) {
  return <span className={`cmp-week-span cmp-week-span--${kind}`} style={{ left: `${left}%`, width: `${width}%` }} />
}

function Update({ kept }: { kept: boolean }) {
  return (
    <>
      <span className={`cmp-week-update cmp-week-update--${kept ? 'kept' : 'wiped'}`} style={{ left: `${UPDATE_AT}%` }} />
      <span className={`cmp-week-note cmp-week-note--${kept ? 'kept' : 'wiped'}`} style={{ left: `${UPDATE_AT + 1}%` }}>
        <span className="cmp-week-note-lead">agent update → </span>files {kept ? 'kept' : 'wiped'}
      </span>
    </>
  )
}

export function WeekTimeline() {
  return (
    <div className="cmp-week" role="img" aria-label="A working week, Monday to Friday, 9 to 17 each day. AgentCore starts a new VM for every session; its files last until the agent update on Wednesday wipes them. Fleet's VM is suspended between sessions and its workspace is kept through the update.">
      <div className="cmp-week-row cmp-week-row--head" aria-hidden="true">
        <span className="cmp-week-label" />
        <div className="cmp-week-days">
          {DAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>
      <WeekRow label="AgentCore VM" side="aws">
        {SESSIONS.map((s, i) => <Span key={i} {...s} kind="session" />)}
      </WeekRow>
      <WeekRow label="AgentCore files" side="aws">
        <Span left={0} width={UPDATE_AT} kind="aws-files" />
        <Span left={UPDATE_AT} width={100 - UPDATE_AT} kind="aws-files-after" />
        <Update kept={false} />
      </WeekRow>
      <WeekRow label="Fleet VM" side="igni">
        <Span left={0} width={100} kind="suspended" />
        {SESSIONS.map((s, i) => <Span key={i} {...s} kind="running" />)}
      </WeekRow>
      <WeekRow label="Fleet workspace" side="igni">
        <Span left={0} width={100} kind="workspace" />
        <Update kept />
      </WeekRow>
      <div className="cmp-legend" aria-hidden="true">
        <span><i className="cmp-swatch cmp-swatch--running" /> running</span>
        <span><i className="cmp-swatch cmp-swatch--suspended" /> suspended (wakes in ms)</span>
        <span><i className="cmp-swatch cmp-swatch--session" /> new VM each session</span>
      </div>
    </div>
  )
}

const WORKSPACES: { label: string; side: 'aws' | 'igni'; pct: number; note: string }[] = [
  { label: 'AgentCore session storage', side: 'aws', pct: 2, note: '1 GB · preview · 14 days idle · wiped on update' },
  { label: 'Fleet, default', side: 'igni', pct: 20, note: '10 GiB · until erased' },
  { label: 'Fleet, maximum', side: 'igni', pct: 100, note: '50 GiB · until erased' },
]

export function WorkspaceBars() {
  return (
    <div className="cmp-bars">
      <h5 className="cmp-bars-title">Workspace kept per person</h5>
      {WORKSPACES.map((w) => (
        <div key={w.label} className="cmp-bar cmp-bar--wrap">
          <span className="cmp-bar-label">{w.label}</span>
          <span className="cmp-bar-track">
            <span className={`cmp-bar-fill cmp-bar-fill--${w.side}`} style={{ width: `${w.pct}%` }} />
          </span>
          <span className="cmp-bar-value">{w.note}</span>
        </div>
      ))}
    </div>
  )
}

/* ── At a glance ───────────────────────────────────────────────── */

export function Dot({ has, note }: { has: Has; note?: string }) {
  return (
    <span className="cmp-has">
      <span className={`cmp-dot cmp-dot--${has}`} aria-hidden="true" />
      {/* On a phone the dot carries a plain status and the word is for
          screen readers only; a note ("Via open source") stays visible. */}
      <span className={note ? 'cmp-has-note' : 'cmp-has-label'}>{note ?? HAS_LABEL[has]}</span>
    </span>
  )
}

export function Coverage() {
  return (
    <div className="cmp-table-wrap cmp-cov">
      <table className="cmp-table">
        <thead>
          <tr>
            <th>Capability</th>
            <th>AgentCore</th>
            <th>igni + Fleet</th>
          </tr>
        </thead>
        <tbody>
          {COVERAGE.map((r) => (
            <tr key={r.cap}>
              <td>{r.cap}</td>
              <td className="cmp-cov-aws" data-has={r.aws}><Dot has={r.aws} /></td>
              <td className="cmp-cov-igni" data-has={r.igni}><Dot has={r.igni} note={r.igniNote} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── How an extension connects ─────────────────────────────────── */

export function ExtensionFlow() {
  return (
    <div className="cmp-flow">
      <div className="cmp-flow-box">
        <strong>Your system</strong>
        <span className="cmp-muted">claims, documents, risk…</span>
        <span className="cmp-flow-chip">igni service SDK</span>
      </div>
      <div className="cmp-flow-link">
        <span>messages · events <b aria-hidden="true">→</b></span>
        <span><b aria-hidden="true">←</b> tool &amp; page calls</span>
      </div>
      <div className="cmp-flow-box cmp-flow-box--ext">
        <strong>Extension</strong>
        <span className="cmp-muted">signed bundle, verified</span>
        <span className="cmp-muted">OS sandbox, own grants</span>
        <span className="cmp-muted">sidecar or endpoint</span>
        <span className="cmp-muted">in your network</span>
      </div>
      <div className="cmp-flow-link">
        <span>contributes <b aria-hidden="true">→</b></span>
      </div>
      <div className="cmp-flow-app">
        <span className="cmp-flow-app-name">igni app</span>
        <span className="cmp-flow-item"><BrowserIcon size={14} /> Pages — in a sandboxed frame</span>
        <span className="cmp-flow-item"><CommentIcon size={14} /> Cards and messages in the chat</span>
        <span className="cmp-flow-item"><TerminalIcon size={14} /> Slash commands and menu entries</span>
        <span className="cmp-flow-item"><GearIcon size={14} /> Status chips · admin settings</span>
        <span className="cmp-flow-agent">
          <strong>Agent</strong>
          <span>tools over MCP · prompt edits</span>
          <span>access to chats and models, as granted</span>
        </span>
      </div>
    </div>
  )
}

/**
 * Detail that would make a section very long, behind a button. The
 * content stays in the page (hidden), so search and tests still find it.
 */
export function Disclosure({ id, show, hide, children }: { id: string; show: string; hide: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`cmp-disclosure${open ? ' cmp-disclosure--open' : ''}`}>
      <button
        type="button"
        className="landing-btn-secondary cmp-disclosure-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDownIcon size={16} /> {open ? hide : show}
      </button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </div>
  )
}

/** A screenshot in the reader's theme. */
export function Shot({ light, dark, alt, children }: { light: string; dark: string; alt: string; children: ReactNode }) {
  return (
    <figure className="cmp-shot">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet={dark} />
        <img src={light} alt={alt} width={1920} height={1080} loading="lazy" decoding="async" />
      </picture>
      <figcaption>{children}</figcaption>
    </figure>
  )
}

type ShotTab<T extends string> = { id: T; tab: string; light: string; dark: string; alt: string; caption: ReactNode }

/**
 * Screenshots behind the landing's pill tabs, one at a time. All of them
 * stay in the page; the others are hidden, and a lazy image loads when
 * its tab shows it.
 */
export function ShotTabs<T extends string>({ label, shots }: { label: string; shots: ShotTab<T>[] }) {
  const [active, setActive] = useState<T>(shots[0].id)
  return (
    <div className="cmp-shot-tabs">
      <PillTabs
        label={label}
        tabs={shots.map((x) => ({ id: x.id, label: x.tab }))}
        active={active}
        onSelect={setActive}
        idPrefix="cmp-shot-tab"
        panelId="cmp-shot-panel"
      />
      <div role="tabpanel" id="cmp-shot-panel" aria-labelledby={`cmp-shot-tab-${active}`}>
        {shots.map((x) => (
          <div key={x.id} hidden={x.id !== active}>
            <Shot light={x.light} dark={x.dark} alt={x.alt}>{x.caption}</Shot>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── One GH200 with the 27B ────────────────────────────────────── */

const PEOPLE = 200
const GENERATING = 60

export function GpuCapacity() {
  return (
    <div className="cmp-gpu">
      <div>
        <h5 className="cmp-bars-title">People on one GPU</h5>
        <div className="cmp-gpu-dots" role="img" aria-label={`${PEOPLE} people on one GPU: about ${GENERATING} generating at any moment, the rest reading, thinking or typing.`}>
          {Array.from({ length: PEOPLE }, (_, i) => (
            <span key={i} className={i < GENERATING ? 'cmp-gpu-dot cmp-gpu-dot--on' : 'cmp-gpu-dot'} />
          ))}
        </div>
        <div className="cmp-legend cmp-legend--col">
          <span><i className="cmp-swatch cmp-swatch--round cmp-swatch--running" /> ~60 generating now · 25–100k context each</span>
          <span><i className="cmp-swatch cmp-swatch--round cmp-swatch--suspended" /> ~140 reading, thinking or typing · cache kept</span>
        </div>
      </div>
      <div>
        <h5 className="cmp-bars-title">Where the cache lives</h5>
        <div className="cmp-tiers">
          <ol>
            <li className="cmp-tier cmp-tier--1">
              <strong>GPU memory (HBM)</strong>
              <span>sessions generating now · fastest</span>
            </li>
            <li className="cmp-tier cmp-tier--2">
              <strong>CPU memory (Grace, up to 480 GB)</strong>
              <span>paused sessions · back in milliseconds</span>
            </li>
            <li className="cmp-tier cmp-tier--3">
              <strong>NVMe SSD (terabytes)</strong>
              <span>idle sessions and shared prompt prefixes</span>
              <span className="cmp-muted">reloaded instead of recomputed</span>
            </li>
          </ol>
          <div className="cmp-tier-axis" aria-hidden="true">
            <span>faster<br /><em>smaller</em></span>
            <span className="cmp-tier-arrow">↕</span>
            <span>bigger<br /><em>cheaper</em></span>
          </div>
        </div>
        <p className="cmp-cap cmp-cap--after">A 100k-token context reloaded from RAM or SSD is far cheaper than computing it again.</p>
      </div>
    </div>
  )
}

/* ── Cost ──────────────────────────────────────────────────────── */

const COST_MAX = Math.max(...COST_BARS.map((b) => b.high))

export function CostBars() {
  return (
    <div className="cmp-bars">
      {COST_BARS.map((b) => (
        <div key={b.label} className="cmp-bar cmp-bar--wrap cmp-cost-bar">
          <span className="cmp-bar-label">{b.label}</span>
          <span className="cmp-bar-track cmp-bar-track--bare cmp-wake-track">
            <span className={`cmp-bar-fill cmp-bar-fill--${b.side}`} style={{ width: `${(b.high / COST_MAX) * COST_SCALE}%` }} />
            <span className="cmp-bar-value" data-high={b.high}>€{b.low}–{b.high}k</span>
          </span>
        </div>
      ))}
    </div>
  )
}

const BREAKDOWN_MAX = Math.max(...BREAKDOWN.map((b) => b.total))

export function Breakdown() {
  return (
    <div className="cmp-bars">
      {BREAKDOWN.map((b) => (
        <div key={b.name} className="cmp-stack">
          <div className="cmp-bar">
            <span className={`cmp-bar-label cmp-bar-label--${b.side}`}>{b.name}</span>
            <span className="cmp-bar-track cmp-bar-track--bare">
              <span className="cmp-stack-bar" style={{ width: `${(b.total / BREAKDOWN_MAX) * 100}%` }}>
                {b.parts.map((p, i) => (
                  <span
                    key={p.label}
                    className={`cmp-stack-part cmp-bar-fill--${b.side} cmp-stack-part--${i}`}
                    style={{ flexGrow: p.k }}
                    title={`${p.label} €${p.k}k`}
                  />
                ))}
              </span>
            </span>
            <span className="cmp-bar-value cmp-strong">€{b.total}k</span>
          </div>
          <div className="cmp-legend cmp-legend--left cmp-stack-legend">
            {b.parts.map((p, i) => (
              <span key={p.label}>
                <i className={`cmp-swatch cmp-bar-fill--${b.side} cmp-stack-part--${i}`} /> {p.label} {p.k}k
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* The cost-against-team-size chart, drawn twice: a wide drawing for the
 * panel on a desktop, and a narrower, taller one for a phone, so that its
 * text stays readable instead of shrinking with a wide drawing. CSS shows
 * one. The people axis is categorical — the seven team sizes evenly
 * spaced — and the cost axis is linear in € a year, so the widening gap
 * between the two bills is read at a glance. Geometry is in viewBox units;
 * text is sized in the stylesheet, which on SVG text is in viewBox units
 * too. */
type Geometry = { W: number; H: number; M: { l: number; r: number; t: number; b: number }; ticks: number[] }

const WIDE: Geometry = { W: 960, H: 380, M: { l: 72, r: 24, t: 28, b: 64 }, ticks: [50, 100, 200, 300, 400, 500, 600] }
const NARROW: Geometry = { W: 340, H: 400, M: { l: 54, r: 12, t: 28, b: 64 }, ticks: [50, 200, 400, 600] }

const Y_MAX = 350
const Y_TICKS = [0, 100, 200, 300]
const mid = (r: [number, number]) => (r[0] + r[1]) / 2
/** The chart plots only the smaller teams, where the two lines stay legible
 * side by side; the table beside it carries the full range to 5,000. */
const CHART = USAGE.filter((u) => u.people <= 600)
const N = CHART.length

/** € a year, short: "€500k", "€2.5M". */
const yLabel = (k: number) => (k >= 1000 ? `€${k / 1000}M` : `€${k}k`)
/** A people count, short: "500", "5k". */
const pLabel = (p: number) => (p >= 1000 ? `${p / 1000}k` : `${p}`)
/** A € thousands figure with a separator: "2,603". */
const kf = (n: number) => n.toLocaleString('en-US')
/** The index (0…N-1) of a people count, for the categorical x-axis. */
const idxOf = (people: number) => CHART.findIndex((u) => u.people === people)

/** Where AgentCore's line crosses igni's, between the first two points, in people. */
function breakEven(): number {
  const [a, b] = CHART
  const target = mid(a.igni)
  return a.people + ((b.people - a.people) * (target - a.aws)) / (b.aws - a.aws)
}

const be = breakEven()
const beRounded = Math.round(be / 10) * 10
const last = CHART[CHART.length - 1]
const USAGE_LABEL = `Cost against team size, € a year, open-weight model. AgentCore rises from €${kf(CHART[0].aws)}k at ${CHART[0].people} people to €${kf(last.aws)}k at ${kf(last.people)} people. igni with Fleet rises in steps as licence bands and GPUs are added, from €${kf(CHART[0].igni[0])}–${kf(CHART[0].igni[1])}k to €${kf(last.igni[0])}–${kf(last.igni[1])}k at ${kf(last.people)} people. They cross at about ${beRounded} people.`

function UsageDrawing({ g, className }: { g: Geometry; className: string }) {
  const { W, H, M } = g
  const innerW = W - M.l - M.r
  // Categorical x: the seven bands evenly spaced. A fractional index (the
  // break-even) lands between its two neighbours.
  const xi = (i: number) => M.l + (N === 1 ? 0 : (i / (N - 1)) * innerW)
  const x = (people: number) => xi(idxOf(people))
  const y = (k: number) => H - M.b - (k / Y_MAX) * (H - M.t - M.b)
  const pts = (f: (u: (typeof CHART)[number]) => number) => CHART.map((u, i) => `${xi(i)},${y(f(u))}`).join(' ')
  const lower = CHART.map((u, i) => `${xi(i)},${y(u.igni[0])}`)
  const upper = CHART.map((u, i) => `${xi(i)},${y(u.igni[1])}`).reverse()
  const band = [...lower, ...upper].join(' ')
  // The break-even sits in the first segment: a fractional index 0…1.
  const beIdx = (be - CHART[0].people) / (CHART[1].people - CHART[0].people)
  return (
    <svg className={`cmp-chart ${className}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={USAGE_LABEL}>
      {Y_TICKS.map((k) => (
        <g key={k}>
          <line x1={M.l} x2={W - M.r} y1={y(k)} y2={y(k)} className="cmp-chart-grid" />
          <text x={M.l - 8} y={y(k) + 5} textAnchor="end" className="cmp-chart-muted">{yLabel(k)}</text>
        </g>
      ))}
      {g.ticks.map((p) => (
        <text key={p} x={x(p)} y={H - M.b + 24} textAnchor="middle" className="cmp-chart-muted">{pLabel(p)}</text>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 10} textAnchor="middle" className="cmp-chart-muted">people (at the heavy per-person rate)</text>

      <polygon points={band} className="cmp-chart-band" />
      <polyline points={pts((u) => mid(u.igni))} className="cmp-chart-line cmp-chart-line--igni" />
      <polyline points={pts((u) => u.aws)} className="cmp-chart-line cmp-chart-line--aws" />
      {CHART.map((u, i) => (
        <g key={u.people}>
          <circle cx={xi(i)} cy={y(u.aws)} r={4} className="cmp-chart-dot--aws" />
          <circle cx={xi(i)} cy={y(mid(u.igni))} r={4} className="cmp-chart-dot--igni" />
        </g>
      ))}

      <line x1={xi(beIdx)} x2={xi(beIdx)} y1={M.t} y2={H - M.b} className="cmp-chart-rule" />
      <text x={xi(beIdx) + 6} y={M.t + 4} className="cmp-chart-muted">break-even ≈ {beRounded} people</text>
      <text x={x(last.people) - 8} y={y(last.aws) - 4} textAnchor="end" className="cmp-chart-label--aws">AgentCore €{kf(last.aws)}k</text>
      <text x={x(last.people) - 8} y={y(last.igni[1]) - 12} textAnchor="end" className="cmp-chart-label--igni">igni + Fleet €{kf(last.igni[0])}–{kf(last.igni[1])}k</text>
    </svg>
  )
}

export function UsageChart() {
  return (
    <div className="cmp-usage-chart">
      <UsageDrawing g={WIDE} className="cmp-chart--wide" />
      <UsageDrawing g={NARROW} className="cmp-chart--narrow" />
    </div>
  )
}

/* ── Speed ─────────────────────────────────────────────────────── */

export function WakeChart() {
  return (
    <div className="cmp-bars cmp-wake">
      {WAKE.map((w) => (
        <div key={w.label} className="cmp-bar cmp-bar--wrap">
          <span className="cmp-bar-label">{w.label}</span>
          <span className="cmp-bar-track cmp-bar-track--bare cmp-wake-track">
            <span className={`cmp-bar-fill cmp-bar-fill--${w.side}`} style={{ width: `${(w.ms / WAKE_MAX_MS) * 100}%` }} data-ms={w.ms} />
            <span className="cmp-wake-value">{w.shown}</span>
          </span>
        </div>
      ))}
      <div className="cmp-bar cmp-bar--wrap" aria-hidden="true">
        <span className="cmp-bar-label" />
        <span className="cmp-wake-axis">
          {['0', '0.5 s', '1 s', '1.5 s', '2 s'].map((t, i) => (
            <span key={t} style={{ left: `${i * 25}%` }}>{t}</span>
          ))}
        </span>
      </div>
    </div>
  )
}

/* ── Cost by usage ─────────────────────────────────────────────── */

/** One input of the calculator: a label, its value, and the landing estimator's slider. */
function UsageSlider({
  id,
  label,
  shown,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string
  label: string
  shown: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className="lp-est-field">
      <div className="lp-est-topline">
        <label className="lp-est-label" htmlFor={id}>
          {label}
        </label>
        <span className="lp-est-readout">
          <span className="lp-est-big cmp-calc-value" aria-live="polite">{shown}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="lp-est-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

const SCHEDULES: { id: Schedule; label: string; note: string }[] = [
  { id: 'always', label: 'Around the clock', note: '24/7' },
  { id: 'working', label: 'Working hours', note: '8 h × 21 days' },
]

/**
 * The cost-by-usage calculator: the landing estimator's controls, and two
 * quotes computed by the same functions as the worked cases. Each side in
 * its own currency; nothing is converted.
 */
export function UsageCalculator() {
  const [inp, setInp] = useState<UsageInputs>({ ...WORKED_BASE, workS: WORKED[0].workS })
  const set = (patch: Partial<UsageInputs>) => setInp((v) => ({ ...v, ...patch }))
  const aws = agentCoreYear(inp)
  const igni = fleetYear(inp)
  const preset = WORKED.find(
    (w) =>
      w.workS === inp.workS &&
      inp.sessions === WORKED_BASE.sessions &&
      inp.vcpu === WORKED_BASE.vcpu &&
      inp.busy === WORKED_BASE.busy &&
      inp.memGb === WORKED_BASE.memGb &&
      inp.schedule === WORKED_BASE.schedule,
  )
  const n = inp.sessions.toLocaleString('en-US')
  const idle = inp.workS < 900

  return (
    <div className="lp-est cmp-calc">
      <div className="lp-est-controls">
        <div className="lp-est-presets" role="group" aria-label="The worked cases">
          {WORKED.map((w) => (
            <button
              key={w.workS}
              type="button"
              aria-pressed={preset === w}
              className={`lp-est-preset${preset === w ? ' lp-est-preset--on' : ''}`}
              onClick={() => setInp({ ...WORKED_BASE, workS: w.workS })}
            >
              <strong>{w.label}</strong>
              <span>1,000 sessions, 2 vCPU, 2 GB, 24/7</span>
            </button>
          ))}
        </div>

        <UsageSlider id="cmp-calc-n" label="Sessions running (N)" shown={n} value={inp.sessions} min={10} max={5000} step={10} onChange={(v) => set({ sessions: v })} />
        <UsageSlider id="cmp-calc-w" label="Work in each 15 minutes (W)" shown={duration(inp.workS)} value={inp.workS} min={0} max={900} step={15} onChange={(v) => set({ workS: v })} />
        <UsageSlider id="cmp-calc-c" label="vCPU per agent (C)" shown={`${inp.vcpu}`} value={inp.vcpu} min={0.5} max={8} step={0.5} onChange={(v) => set({ vcpu: v })} />
        <UsageSlider id="cmp-calc-b" label="CPU busy while working (B)" shown={`${Math.round(inp.busy * 100)}%`} value={Math.round(inp.busy * 100)} min={5} max={100} step={5} onChange={(v) => set({ busy: v / 100 })} />
        <UsageSlider id="cmp-calc-m" label="Memory held while working (M)" shown={`${inp.memGb} GB`} value={inp.memGb} min={0.5} max={16} step={0.5} onChange={(v) => set({ memGb: v })} />

        <div className="lp-est-field">
          <span className="lp-est-label" id="cmp-calc-s-label">When the agents run</span>
          <div className="lp-est-bands" role="group" aria-labelledby="cmp-calc-s-label">
            {SCHEDULES.map((sc) => (
              <button
                key={sc.id}
                type="button"
                aria-pressed={inp.schedule === sc.id}
                className={`lp-est-seg-btn${inp.schedule === sc.id ? ' lp-est-seg-btn--on' : ''}`}
                onClick={() => set({ schedule: sc.id })}
              >
                <span className="lp-est-seg-top">{sc.label}</span>
                <span className="lp-est-seg-unit">{sc.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cmp-calc-out">
        <div className="lp-est-quote cmp-calc-quote cmp-calc-quote--aws" aria-live="polite">
          <span className="lp-est-quote-kicker">AgentCore runtime v2, list, US dollars</span>
          <ul className="lp-est-lines">
            <li>
              <span>
                CPU while working
                <em>{inp.vcpu} vCPU × {Math.round(inp.busy * 100)}% busy for {duration(inp.workS)}, every 15 min</em>
              </span>
              <strong className="cmp-calc-aws-cpu">{usdK(aws.cpu)}</strong>
            </li>
            <li>
              <span>
                Memory while working
                <em>{inp.memGb} GB for {duration(inp.workS)}</em>
              </span>
              <strong>{usdK(aws.memWorking)}</strong>
            </li>
            <li>
              <span>
                Memory while idle
                <em>{idle ? `${inp.memGb} GB for up to ${AC_RUNTIME.reclaimS} s, then the 128 MB minimum` : 'never idle'}</em>
              </span>
              <strong className="cmp-calc-aws-idle">{usdK(aws.memIdle)}</strong>
            </li>
          </ul>
          <div className="lp-est-total">
            <span>
              Per year, {n} sessions
              <em>{Math.round(aws.idleShare * 100)}% of it paid while idle · {SCHEDULE_HOURS[inp.schedule].toLocaleString('en-US')} h</em>
            </span>
            <strong className="cmp-calc-aws-total">{usdK(aws.total)}</strong>
          </div>
        </div>

        <div className="lp-est-quote cmp-calc-quote" aria-live="polite">
          <span className="lp-est-quote-kicker">igni + Fleet, euros</span>
          <ul className="lp-est-lines">
            <li>
              <span>
                Fleet licence
                <em>{n} people on the price list (or fewer people plus apps)</em>
              </span>
              <strong className="cmp-calc-licence">{eurK1(igni.licence)}</strong>
            </li>
            <li>
              <span>
                {igni.servers} × {SERVER.name}
                <em>
                  {igni.byRam} for RAM, {igni.byThreads} for CPU, + 1 spare ·{' '}
                  {Math.round(igni.active).toLocaleString('en-US')} working at once need{' '}
                  {Math.round(igni.ramGb).toLocaleString('en-US')} GB and {Math.round(igni.busyThreads).toLocaleString('en-US')} busy threads
                </em>
              </span>
              <strong className="cmp-calc-servers">{eurRangeK(igni.serverCost)}</strong>
            </li>
          </ul>
          <div className="lp-est-total">
            <span>
              Per year
              <em>the same around the clock or in working hours</em>
            </span>
            <strong className="cmp-calc-igni-total">{eurRangeK(igni.total)}</strong>
          </div>
          <p className="lp-est-fine">
            Each server {SERVER.cpus} ({SERVER.cores} cores, {SERVER.threads} threads), {SERVER.ramGb} GB; sized
            to {Math.round(HEADROOM.ram * 100)}% of its RAM and {Math.round(HEADROOM.threads * 100)}% of its
            threads. A paused agent holds {PAUSED_GB} GB.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Erasure ───────────────────────────────────────────────────── */

const ERASE_STEPS: { title: string; note: string }[] = [
  { title: 'Discard command', note: 'person removed, or app discarded' },
  { title: 'New VM at once', note: 'a fresh disk was prepared ahead' },
  { title: 'Old data erased', note: 'volume, replicas, offloaded copies' },
  { title: 'Keys destroyed · audited', note: 'resumes by itself after a crash (tested on simulated nodes so far)' },
]

export function ErasureSteps() {
  return (
    <ol className="cmp-steps">
      {ERASE_STEPS.map((s, i) => (
        <li key={s.title}>
          <span className="lp-step-n">{i + 1}</span>
          <div>
            <strong>{s.title}</strong>
            <span className="cmp-muted cmp-small">{s.note}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
