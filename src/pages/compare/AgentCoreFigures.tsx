import type { ReactNode } from 'react'
import {
  BrowserIcon,
  CommentIcon,
  GearIcon,
  LockIcon,
  TerminalIcon,
} from '@primer/octicons-react'
import {
  BREAKDOWN,
  COST_BARS,
  COVERAGE,
  HAS_LABEL,
  USAGE,
  WAKE,
  WAKE_MAX_MS,
  type Has,
} from './agentcoreData'

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
  'Your services',
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
          igni desktop / web app <span className="cmp-muted">+ extension pages</span>
        </div>
        <span className="cmp-arch-down" aria-hidden="true">↓</span>
        <div className="cmp-arch-split">
          <div>
            <div className="cmp-arch-box cmp-small">Fleet gateway · routes, caps, egress rules</div>
            <span className="cmp-arch-down" aria-hidden="true">↓</span>
            <div className="cmp-arch-box cmp-arch-box--left">
              <strong>Node</strong>
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

function Dot({ has, note }: { has: Has; note?: string }) {
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
        <div key={b.label} className="cmp-bar cmp-cost-bar">
          <span className="cmp-bar-label">{b.label}</span>
          <span className="cmp-bar-track">
            <span className={`cmp-bar-fill cmp-bar-fill--${b.side}`} style={{ width: `${(b.high / COST_MAX) * 100}%` }} />
          </span>
          <span className="cmp-bar-value" data-high={b.high}>€{b.low}–{b.high}k</span>
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

/* The usage chart. Geometry in viewBox units. Text is sized in the
 * stylesheet, which on SVG text is also in viewBox units: larger on a
 * phone, where the drawing is scaled down to fit. */
const W = 600
const H = 330
const M = { l: 76, r: 28, t: 28, b: 58 }
const X_MAX = 320
const Y_MAX = 350
const x = (pct: number) => M.l + (pct / X_MAX) * (W - M.l - M.r)
const y = (k: number) => H - M.b - (k / Y_MAX) * (H - M.t - M.b)
const mid = (r: [number, number]) => (r[0] + r[1]) / 2
const pts = (f: (u: (typeof USAGE)[number]) => number) => USAGE.map((u) => `${x(u.pct)},${y(f(u))}`).join(' ')

/** Where AgentCore's line crosses igni's, between the first two points. */
function breakEven(): number {
  const [a, b] = USAGE
  const target = mid(a.igni)
  return a.pct + ((b.pct - a.pct) * (target - a.aws)) / (b.aws - a.aws)
}

export function UsageChart() {
  const last = USAGE[USAGE.length - 1]
  const band = [
    ...USAGE.map((u) => `${x(u.pct)},${y(u.igni[0])}`),
    ...[...USAGE].reverse().map((u) => `${x(u.pct)},${y(u.igni[1])}`),
  ].join(' ')
  const be = breakEven()
  return (
    <div className="cmp-scroll">
      <svg
        className="cmp-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Cost against usage, € a year, open-weight model. AgentCore rises from €${USAGE[0].aws}k at ${USAGE[0].pct}% to €${last.aws}k at ${last.pct}%. igni with Fleet stays at €${USAGE[0].igni[0]}–${USAGE[0].igni[1]}k up to 100% and reaches €${last.igni[0]}–${last.igni[1]}k at ${last.pct}%. They cross at about 50%.`}
      >
        {[0, 100, 200, 300].map((k) => (
          <g key={k}>
            <line x1={M.l} x2={W - M.r} y1={y(k)} y2={y(k)} className="cmp-chart-grid" />
            <text x={M.l - 8} y={y(k) + 5} textAnchor="end" className="cmp-chart-muted">€{k}k</text>
          </g>
        ))}
        {[50, 100, 150, 200, 250, 300].map((p) => (
          <text key={p} x={x(p)} y={H - M.b + 22} textAnchor="middle" className="cmp-chart-muted">{p}%</text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" className="cmp-chart-muted">usage, % of the heavy case</text>

        <polygon points={band} className="cmp-chart-band" />
        <polyline points={pts((u) => mid(u.igni))} className="cmp-chart-line cmp-chart-line--igni" />
        <polyline points={pts((u) => u.aws)} className="cmp-chart-line cmp-chart-line--aws" />
        {USAGE.map((u) => (
          <g key={u.pct}>
            <circle cx={x(u.pct)} cy={y(u.aws)} r={4} className="cmp-chart-dot--aws" />
            <circle cx={x(u.pct)} cy={y(mid(u.igni))} r={4} className="cmp-chart-dot--igni" />
          </g>
        ))}

        <line x1={x(be)} x2={x(be)} y1={M.t} y2={H - M.b} className="cmp-chart-rule" />
        <text x={x(be) + 6} y={M.t + 14} className="cmp-chart-muted">break-even ≈ 50%</text>
        <text x={x(last.pct) - 8} y={y(last.aws) - 2} textAnchor="end" className="cmp-chart-label--aws">AgentCore €{last.aws}k</text>
        <text x={x(last.pct) - 8} y={y(last.igni[1]) - 10} textAnchor="end" className="cmp-chart-label--igni">igni + Fleet €{last.igni[0]}–{last.igni[1]}k</text>
      </svg>
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

/* ── Erasure ───────────────────────────────────────────────────── */

const ERASE_STEPS: { title: string; note: string }[] = [
  { title: 'Discard command', note: 'person removed, or app discarded' },
  { title: 'New VM at once', note: 'a fresh disk was prepared ahead' },
  { title: 'Old data erased', note: 'volume, replicas, offloaded copies' },
  { title: 'Keys destroyed · audited', note: 'resumes by itself after a crash' },
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
