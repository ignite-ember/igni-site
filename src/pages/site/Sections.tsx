import type { ReactNode } from 'react'

/* ── The landing page's section pieces ────────────────────────────
 *
 * The markup every section of the landing page opens with, the tinted
 * band that breaks its rhythm, and the stat row under the hero — shared
 * so that another page built from them looks like the same site rather
 * than an imitation of it. Styles are the landing page's own
 * (landing-shared.css, LandingPage.css).
 */

/** The centred eyebrow, heading and short intro at the top of a section. */
export function SectionHead({ label, title, children }: { label: string; title: ReactNode; children?: ReactNode }) {
  return (
    <>
      <span className="landing-section-label">{label}</span>
      {/* With no intro, the heading takes the space the intro would have
          left, as the product pages' headline-only sections do. */}
      <h3 className={children ? undefined : 'lp-h3-tight'}>{title}</h3>
      {children && <p className="landing-section-desc lp-desc">{children}</p>}
    </>
  )
}

/**
 * A landing-page section. `band` puts it on the full-width tinted band,
 * with its warm glow and the rules above and below.
 */
export function Section({
  id,
  label,
  title,
  desc,
  band = false,
  className = '',
  children,
}: {
  id?: string
  label: string
  title: ReactNode
  desc?: ReactNode
  band?: boolean
  className?: string
  children: ReactNode
}) {
  const section = (
    <section id={id} className={`landing-section lp-center ${className}`.trim()}>
      <SectionHead label={label} title={title}>{desc}</SectionHead>
      {children}
    </section>
  )
  return band ? <div className="lp-band">{section}</div> : section
}

/** The row of big gradient figures between full-width rules. */
export function StatRow({ stats }: { stats: { value: string; label: ReactNode }[] }) {
  return (
    <div className="landing-stats lp-stats">
      {stats.map((s) => (
        <div key={s.value} className="landing-stat">
          <div className="landing-stat-value">{s.value}</div>
          <div className="landing-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * The landing page's pill tabs (the department tabs): a tablist of
 * buttons controlling one panel, which the caller renders with
 * `role="tabpanel"`, `id={panelId}` and `aria-labelledby={`${idPrefix}-${active}`}`.
 */
export function PillTabs<T extends string>({
  label,
  tabs,
  active,
  onSelect,
  idPrefix,
  panelId,
}: {
  label: string
  tabs: { id: T; label: ReactNode; icon?: ReactNode }[]
  active: T
  onSelect: (id: T) => void
  idPrefix: string
  panelId: string
}) {
  return (
    <div className="lp-scn-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${idPrefix}-${t.id}`}
          aria-selected={t.id === active}
          aria-controls={panelId}
          className={`lp-scn-tab${t.id === active ? ' lp-scn-tab--on' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

