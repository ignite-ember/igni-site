/**
 * The two diagrams the artifacts article needs.
 *
 * Lineage and versioning are both *shapes*: "this is pinned to v3 of
 * something now at v7" and "the chain is linear and append-only, and
 * your base moved" are a paragraph each to describe and a glance to
 * see. The article had the paragraphs.
 *
 * ## Why not a diagram library
 *
 * The published docs are a static bundle behind a strict CSP, and the
 * two diagrams here are fixed — they illustrate a model, not data, so
 * nothing needs laying out at runtime. A renderer would be a
 * dependency, a parse step and a third-party stylesheet in exchange
 * for pictures we can draw directly. These are hand-authored SVG with
 * the geometry in named constants, which also means they can use the
 * same colour tokens as the rest of the page and follow the reader's
 * theme without a second palette to maintain.
 *
 * ## How they reach the markdown
 *
 * `DocArticlePage` maps a fenced block with an `igni-diagram` language
 * onto this component; the fence body names which one:
 *
 *     ```igni-diagram
 *     lineage
 *     ```
 *
 * An unknown name renders nothing rather than throwing — a typo in a
 * document should not blank the page it is in.
 *
 * ## Accessibility
 *
 * Each figure carries a `<title>` read by screen readers and a
 * `<figcaption>` that states the same thing in prose, because a
 * diagram that only exists as geometry is not available to everybody.
 * The surrounding markdown is written to stand on its own, so losing
 * the picture loses an aid and never a fact.
 */

import { type DiagramName } from './docDiagramNames'
import './DocDiagram.css'

/** Nodes are drawn from one scale so the two figures agree visually. */
const BOX_W = 132
const BOX_H = 54
const VERSION_W = 64
const VERSION_H = 44

function Pin({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className="dd-pin">
      <circle cx={x} cy={y} r={11} />
      <text x={x} y={y + 4} textAnchor="middle">{label}</text>
    </g>
  )
}

/**
 * What "built on" records, and the three states an edge can be in.
 *
 * The one fact the picture has to carry is that an edge points at a
 * *version*, not at a document — which is why one of them is drawn
 * stale.
 */
function LineageDiagram() {
  return (
    <figure className="dd-figure">
      <div className="dd-scroll">
        <svg viewBox="0 0 760 390" className="dd-svg" role="img" aria-labelledby="dd-lineage-title">
          <title id="dd-lineage-title">
            A document whose three incoming edges are confirmed, candidate and dismissed, with the
            confirmed one pinned to version 3 of a source that has since moved to version 7.
          </title>

          <defs>
            <marker id="dd-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" className="dd-arrowhead" />
            </marker>
            <marker id="dd-arrow-muted" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" className="dd-arrowhead dd-muted" />
            </marker>
          </defs>

          <text x={86} y={26} className="dd-axis" textAnchor="middle">built on</text>
          <text x={620} y={26} className="dd-axis" textAnchor="middle">depends on it</text>

          {/* ── Sources, left ───────────────────────────────────── */}
          <g className="dd-node">
            <rect x={20} y={48} rx={8} width={BOX_W} height={BOX_H} />
            <text x={86} y={70} textAnchor="middle">auth design</text>
            <text x={86} y={88} textAnchor="middle" className="dd-sub">head v7</text>
          </g>

          <g className="dd-node">
            <rect x={20} y={158} rx={8} width={BOX_W} height={BOX_H} />
            <text x={86} y={180} textAnchor="middle">rate limits</text>
            <text x={86} y={198} textAnchor="middle" className="dd-sub">head v2</text>
          </g>

          <g className="dd-node dd-node-dim">
            <rect x={20} y={268} rx={8} width={BOX_W} height={BOX_H} />
            <text x={86} y={290} textAnchor="middle">old spike</text>
            <text x={86} y={308} textAnchor="middle" className="dd-sub">head v1</text>
          </g>

          {/* ── The three edges ─────────────────────────────────── */}
          <path d="M152,75 C215,75 215,170 278,170" className="dd-edge dd-edge-confirmed" markerEnd="url(#dd-arrow)" />
          <Pin x={215} y={100} label="v3" />
          <text x={215} y={132} className="dd-edge-label dd-confirmed" textAnchor="middle">confirmed · stale</text>

          <path d="M152,185 L278,185" className="dd-edge dd-edge-candidate" markerEnd="url(#dd-arrow-muted)" />
          <text x={215} y={176} className="dd-edge-label" textAnchor="middle">candidate</text>
          <Pin x={215} y={206} label="v2" />

          <path d="M152,295 C215,295 215,210 278,200" className="dd-edge dd-edge-dismissed" />
          <text x={215} y={282} className="dd-edge-label dd-muted" textAnchor="middle">dismissed</text>

          {/* ── The document in question ────────────────────────── */}
          <g className="dd-node dd-node-focus">
            <rect x={278} y={140} rx={8} width={168} height={70} />
            <text x={362} y={168} textAnchor="middle">session store</text>
            <text x={362} y={188} textAnchor="middle" className="dd-sub">head v4 · you own this</text>
          </g>

          {/* ── Dependents, right ───────────────────────────────── */}
          <path d="M446,160 C520,160 500,88 554,80" className="dd-edge dd-edge-confirmed" markerEnd="url(#dd-arrow)" />
          <Pin x={508} y={108} label="v2" />

          <path d="M446,190 C520,190 500,262 554,270" className="dd-edge dd-edge-confirmed" markerEnd="url(#dd-arrow)" />
          <Pin x={508} y={236} label="v4" />

          <g className="dd-node">
            <rect x={554} y={52} rx={8} width={BOX_W} height={BOX_H} />
            <text x={620} y={74} textAnchor="middle">login flow</text>
            <text x={620} y={92} textAnchor="middle" className="dd-sub">pinned 2 behind</text>
          </g>

          <g className="dd-node">
            <rect x={554} y={242} rx={8} width={BOX_W} height={BOX_H} />
            <text x={620} y={264} textAnchor="middle">sdk notes</text>
            <text x={620} y={282} textAnchor="middle" className="dd-sub">current</text>
          </g>

          <g className="dd-node dd-node-hidden">
            <rect x={554} y={152} rx={8} width={BOX_W} height={BOX_H} />
            <text x={620} y={182} textAnchor="middle">hidden: 1</text>
          </g>
          <path d="M446,175 L554,179" className="dd-edge dd-edge-dismissed" />

          {/* ── What makes the top edge stale ───────────────────
              No leader line back to the source: the only route down
              the left side runs through the `old spike` box, and the
              note names both versions, so it stands on its own. The
              first draft had a dotted path through a node and a
              sentence that ran off the right edge of the viewBox. */}
          <text x={20} y={356} className="dd-note">
            the pin says v3, the source is at v7 — that gap is what stale means
          </text>
        </svg>
      </div>
      <figcaption>
        An edge records that one document was built on a <strong>specific version</strong> of
        another. Here <code>session store</code> is pinned to <code>v3</code> of{' '}
        <code>auth design</code>, which has since moved to <code>v7</code> — that gap, and nothing
        else, is what makes an edge stale. Candidates come from reads the agent made and are not
        stale-checked; a dismissal is kept so the same candidate is not proposed again. Looking the
        other way, two documents depend on this one at different versions, and a third is removed
        and counted in <code>hidden</code> because the reader cannot open it.
      </figcaption>
    </figure>
  )
}

/**
 * The version chain, the draft beside it, and what a 409 is.
 *
 * Drawn as one line because the chain really is linear: the server
 * assigns `n` and nothing branches. The divergence is shown as two
 * writers naming the same `base_n`, which is the only way to get a
 * conflict and therefore the only thing worth picturing.
 */
function VersioningDiagram() {
  const versions = [5, 6, 7, 8, 9]
  const X0 = 40
  const GAP = 104
  const ROW_Y = 120
  const MID_Y = ROW_Y + VERSION_H / 2
  const HEAD_X = X0 + (versions.length - 1) * GAP
  const HEAD_RIGHT = HEAD_X + VERSION_W
  const LANE_X = 572
  const LANE_W = 176

  return (
    <figure className="dd-figure">
      <div className="dd-scroll">
        <svg viewBox="0 0 760 372" className="dd-svg" role="img" aria-labelledby="dd-versions-title">
          <title id="dd-versions-title">
            A linear append-only version chain from v5 to v9, with the single draft above the head,
            and two writers both appending from base 9 — the first accepted as v10, the second
            answered with a 409 carrying the versions it was missing.
          </title>

          <defs>
            <marker id="dd-varrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" className="dd-arrowhead" />
            </marker>
            <marker id="dd-varrow-reject" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" className="dd-arrowhead dd-reject-fill" />
            </marker>
          </defs>

          {/* ── The draft, above the head it publishes into ─────── */}
          <g className="dd-node dd-node-draft">
            <rect x={HEAD_X - 52} y={20} rx={8} width={168} height={48} />
            <text x={HEAD_X + 32} y={41} textAnchor="middle">draft</text>
            <text x={HEAD_X + 32} y={58} textAnchor="middle" className="dd-sub">one per document</text>
          </g>
          <path d={`M${HEAD_X + 32},${ROW_Y} L${HEAD_X + 32},68`} className="dd-edge dd-edge-candidate" />
          {/* Beside the draft, not under it: at y=98 this label ran
              into the `base 6` marker on the chain below. */}
          <text x={HEAD_X - 64} y={48} className="dd-edge-label" textAnchor="end">
            editing writes here — publishing is separate
          </text>

          {/* ── The chain ───────────────────────────────────────── */}
          {versions.map((n, i) => {
            const x = X0 + i * GAP
            const isHead = i === versions.length - 1
            return (
              <g key={n} className={`dd-node ${isHead ? 'dd-node-focus' : ''}`}>
                <rect x={x} y={ROW_Y} rx={8} width={VERSION_W} height={VERSION_H} />
                <text x={x + VERSION_W / 2} y={MID_Y + 5} textAnchor="middle">v{n}</text>
                {isHead && (
                  <text x={x + VERSION_W / 2} y={ROW_Y + VERSION_H + 16} textAnchor="middle" className="dd-sub">
                    head
                  </text>
                )}
              </g>
            )
          })}

          {versions.slice(1).map((n, i) => {
            const from = X0 + i * GAP + VERSION_W
            return (
              <g key={n}>
                <path d={`M${from},${MID_Y} L${from + GAP - VERSION_W},${MID_Y}`} className="dd-edge dd-edge-confirmed" markerEnd="url(#dd-varrow)" />
                <text x={from + (GAP - VERSION_W) / 2} y={ROW_Y - 8} className="dd-edge-label" textAnchor="middle">
                  base {n - 1}
                </text>
              </g>
            )
          })}

          {/* ── Two writers, both appending from base 9 ─────────── */}
          <path
            d={`M${HEAD_RIGHT},${MID_Y} C${LANE_X - 36},${MID_Y} ${LANE_X - 36},208 ${LANE_X - 6},208`}
            className="dd-edge dd-edge-confirmed"
            markerEnd="url(#dd-varrow)"
          />
          <g className="dd-node dd-node-focus">
            <rect x={LANE_X} y={186} rx={8} width={LANE_W} height={46} />
            <text x={LANE_X + LANE_W / 2} y={207} textAnchor="middle">accepted as v10</text>
            <text x={LANE_X + LANE_W / 2} y={224} textAnchor="middle" className="dd-sub">first writer, base_n 9</text>
          </g>

          <path
            d={`M${HEAD_RIGHT},${MID_Y} C${LANE_X - 36},${MID_Y} ${LANE_X - 36},292 ${LANE_X - 6},292`}
            className="dd-edge dd-edge-reject"
            markerEnd="url(#dd-varrow-reject)"
          />
          <g className="dd-node dd-node-reject">
            <rect x={LANE_X} y={270} rx={8} width={LANE_W} height={46} />
            <text x={LANE_X + LANE_W / 2} y={291} textAnchor="middle">409 + the versions you lack</text>
            <text x={LANE_X + LANE_W / 2} y={308} textAnchor="middle" className="dd-sub">second writer, base_n 9</text>
          </g>

          <text x={X0} y={352} className="dd-note">
            base_n has no default — a client that lost track would otherwise append over whoever got there first
          </text>
        </svg>
      </div>
      <figcaption>
        The chain is linear and append-only: the server assigns <code>n</code> and does nothing
        else, and nothing is merged on your behalf. Editing does not write a version — it writes
        the single draft, and publishing it is a separate act. An append must state the version it
        was written from, so when two writers both say <code>base_n 9</code> the second is refused
        rather than silently applied, and the <code>409</code> carries the versions it is missing
        so a rebase costs one round trip rather than three.
      </figcaption>
    </figure>
  )
}

/** Typed on `DiagramName`, so a name declared and not drawn is a
 *  typecheck failure rather than a blank space in an article. */
const DIAGRAMS: Record<DiagramName, () => React.ReactElement> = {
  lineage: LineageDiagram,
  versioning: VersioningDiagram,
}

export function DocDiagram({ name }: { name: string }) {
  const Chosen = DIAGRAMS[name.trim() as DiagramName]
  // A typo in an article should cost the picture, not the page.
  if (!Chosen) return null
  return <Chosen />
}
