import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertIcon,
  ArrowRightIcon,
  AppsIcon,
  BookIcon,
  CheckIcon,
  GitPullRequestIcon,
  LawIcon,
  PeopleIcon,
  SearchIcon,
  ServerIcon,
  SyncIcon,
} from '@primer/octicons-react'
import { BANDS, CODEINDEX_PRICES, ARTIFACTS_PRICES, FLEET_PRICES, FACTORY_PER_YEAR, AUTOPILOT_PRICES, eurK } from './siteData'

/* ── Fleet, drawn ─────────────────────────────────────────────────
 *
 * The one idea a manager needs from Fleet: every person and every app
 * has its own agent, and the idle ones cost nothing. A grid of
 * producers where a few are awake at any moment says that faster than
 * a paragraph about microVMs. The waking is decorative, so it stops for
 * anyone who asked for reduced motion.
 */
const FLEET_CELLS = 48
const FLEET_AWAKE = 6

const FLEET_APPS = new Set([3, 11, 17, 26, 34, 41])

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    let mq: MediaQueryList
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    } catch {
      return
    }
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function FleetGrid() {
  const reduced = useReducedMotion()
  const [awake, setAwake] = useState<number[]>([2, 9, 17, 22, 30, 39])

  useEffect(() => {
    if (reduced) return
    const t = window.setInterval(() => {
      setAwake((prev) => {
        // Put one to sleep, wake another: the count stays steady, which
        // is the point — most of the fleet is asleep at any moment.
        const next = prev.slice(1)
        let pick = Math.floor(Math.random() * FLEET_CELLS)
        while (next.includes(pick)) pick = (pick + 1) % FLEET_CELLS
        return [...next, pick].slice(-FLEET_AWAKE)
      })
    }, 900)
    return () => window.clearInterval(t)
  }, [reduced])

  return (
    <div className="lp-fleet" aria-hidden>
      <div className="lp-fleet-grid">
        {Array.from({ length: FLEET_CELLS }, (_, i) => (
          <span
            key={i}
            className={[
              'lp-fleet-cell',
              FLEET_APPS.has(i) ? 'lp-fleet-cell--app' : '',
              awake.includes(i) ? 'lp-fleet-cell--awake' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {FLEET_APPS.has(i) ? <AppsIcon size={12} /> : <PeopleIcon size={12} />}
          </span>
        ))}
      </div>
      <div className="lp-fleet-legend">
        <span>
          <i className="lp-fleet-dot lp-fleet-dot--awake" /> working
        </span>
        <span>
          <i className="lp-fleet-dot" /> asleep, using no memory
        </span>
        <span>
          <AppsIcon size={12} /> an app &nbsp; <PeopleIcon size={12} /> a person
        </span>
      </div>
    </div>
  )
}

/* ── Department scenarios ─────────────────────────────────────────
 *
 * One installation, four departments, each with the part of igni that does
 * the work. The mock on the left of each is an illustration and is
 * labelled as one: the file names, the policy and the scores are made
 * up to show the shape of the output, not reported from a customer.
 */
type Scenario = {
  id: string
  dept: string
  icon: ReactNode
  module: string
  status?: string
  title: string
  body: string
  outcome: string
  price: string
  // The tab's headline number. `source` says where a measured one was
  // measured; the Artifacts one states behaviour and has no source.
  stat?: { value: string; label: string; source?: string }
  mock: ReactNode
}

const SCENARIOS: Scenario[] = [
  {
    id: 'engineering',
    dept: 'Engineering',
    icon: <GitPullRequestIcon size={16} />,
    module: 'CodeIndex',
    title: 'igni reviews every pull and merge request',
    body: 'CodeIndex keeps a map of every repository and re-analyses it on every push. It reviews each pull or merge request on GitHub or GitLab: what calls the changed code, what it could break, and what has no test.',
    outcome: 'Reviewers see what the change could break next to the diff they are reading.',
    // ember-code docs/BENCHMARKS.md: 12 tasks × 5 runs, deterministic
    // grading. igni ran an open-weight model (MiniMax-M2.7) with CodeIndex;
    // Claude Code ran Opus 4.7 without it. Not the igni model, not Opus 5.
    stat: {
      value: '82%',
      label: 'of changes directly mergeable. Claude Code on Opus 4.7: 52%.',
      source: 'Ignite Ember benchmark: 12 tasks, 5 runs each, igni with CodeIndex on the open-weight MiniMax-M2.7, at about 1/80th the cost per run.',
    },
    price: `${eurK(CODEINDEX_PRICES[0])} a year for up to ${BANDS[0]} developers`,
    mock: (
      <div className="lp-mock lp-mock-pr">
        <div className="lp-mock-bar">
          <GitPullRequestIcon size={14} /> payments-service · PR #482 · Refund retries
        </div>
        <div className="lp-mock-body">
          <div className="lp-mock-author">
            <span className="lp-mock-avatar">i</span> igni review · 2 findings
          </div>
          <div className="lp-mock-finding lp-mock-finding--high">
            <AlertIcon size={14} />
            <div>
              <strong>Error swallowed</strong>
              <code>billing/refund.py:88</code>
              <p>The new retry catches every exception and returns success. Three callers treat that as a completed refund.</p>
            </div>
          </div>
          <div className="lp-mock-finding">
            <SearchIcon size={14} />
            <div>
              <strong>Untested dependency</strong>
              <code>auth/session.py</code>
              <p>Imported by 14 modules, covered by no test. This change alters its return type.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'risk',
    dept: 'Risk & compliance',
    icon: <BookIcon size={16} />,
    module: 'Artifacts',
    title: 'When a source changes, every document built on it is flagged',
    body: 'Artifacts keeps your documents on a graph. Each version carries a hash of its content and links to the sources and documents it was built from. When one changes, every document built on the old version joins its owner\u2019s queue, and the agent can redraft it for a person to approve.',
    outcome: 'For every version of a document, you can show an auditor what it was based on.',
    // A statement of what the graph does, not a measurement, so it carries
    // no source line. Replace with a measured figure when there is one.
    stat: {
      value: '1 change',
      label: 'flags every document built on it, furthest behind first.',
    },
    price: `${eurK(ARTIFACTS_PRICES[0])} a year for up to ${BANDS[0]} people. Readers are free.`,
    mock: (
      <div className="lp-mock lp-mock-doc">
        <div className="lp-mock-bar">
          <BookIcon size={14} /> ICT third-party risk policy · v7
        </div>
        <div className="lp-mock-body">
          <div className="lp-mock-stale">
            <AlertIcon size={14} /> Out of date: a source changed 2 days ago
          </div>
          <div className="lp-mock-lines">
            <span style={{ width: '92%' }} />
            <span style={{ width: '78%' }} />
            <span className="lp-mock-line--changed" style={{ width: '85%' }} />
            <span style={{ width: '64%' }} />
          </div>
          <div className="lp-mock-sources">
            <span className="lp-mock-sources-label">Written from</span>
            <span className="lp-chip">DORA Art. 28</span>
            <span className="lp-chip lp-chip--changed">Register of information · updated</span>
            <span className="lp-chip">Procurement standard v3</span>
          </div>
          <div className="lp-mock-action">
            <SyncIcon size={14} /> 3 documents built on an old version · ready for review
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'operations',
    dept: 'Operations',
    icon: <ServerIcon size={16} />,
    module: 'Fleet',
    title: 'A cloud agent for every person and every app, on your servers',
    body: 'Everyone already has a free agent in the igni app on their own machine. Fleet adds a cloud agent for each person and each app, in its own isolated VM on your servers, so it keeps working when the laptop is closed and your systems can reach it. An idle agent is paused, then suspended to disk, where it uses no memory until a request wakes it.',
    outcome: 'The licence counts people, and each band includes as many app agents.',
    // igni__cloudvm RESULTS.md, "End to end on bare metal": real igni on
    // c3-highcpu-192-metal, volumes on Filestore, first answer at the
    // client, p50: paused 29.4 ms (50 agents), 29.9 ms (300); from disk
    // 117-139 ms at every step up to 400.
    stat: {
      value: '~30 ms',
      label: 'for a paused agent to answer. Under 150 ms from disk.',
      source: 'Ignite Ember\u2019s tests on one bare-metal server running real igni agents: median first answer after waking.',
    },
    price: `${eurK(FLEET_PRICES[0])} a year for up to ${BANDS[0]} people`,
    mock: <FleetGrid />,
  },
  {
    id: 'legal',
    dept: 'Legal',
    icon: <LawIcon size={16} />,
    module: 'Factory',
    title: 'A contract-review model trained on your legal team\u2019s material',
    body: 'Your lawyers freeze an evaluation set and guide the factory as it builds a dataset from your legal material and tunes a model, inside your network. A model is accepted only if it beats the base model on that set.',
    outcome: 'An accepted model is yours, with no licence key and no expiry.',
    stat: {
      value: eurK(FACTORY_PER_YEAR),
      label: 'a year for the Factory, for as many domain models as you build.',
    },
    price: `${eurK(FACTORY_PER_YEAR)} a year; Autopilot from ${eurK(AUTOPILOT_PRICES[0])} a year`,
    mock: (
      <div className="lp-mock lp-mock-eval">
        <div className="lp-mock-bar">
          <LawIcon size={14} /> Contract review · acceptance run
        </div>
        <div className="lp-mock-body">
          <div className="lp-mock-eval-row">
            <span>Base model</span>
            <span className="lp-mock-eval-bar">
              <span style={{ width: '61%' }} />
            </span>
            <strong>61%</strong>
          </div>
          <div className="lp-mock-eval-row lp-mock-eval-row--ours">
            <span>Your model</span>
            <span className="lp-mock-eval-bar">
              <span style={{ width: '84%' }} />
            </span>
            <strong>84%</strong>
          </div>
          <div className="lp-mock-eval-meta">
            Your frozen evaluation set · signed off by your legal team
          </div>
          <div className="lp-mock-accepted">
            <CheckIcon size={14} /> Beats the base model · accepted
          </div>
        </div>
      </div>
    ),
  },
]

/** The product page a scenario's module has: "CodeIndex" → "codeindex". */
function moduleSlug(module: string): string {
  return module.toLowerCase()
}

/** One department's illustration, for that module's product page. */
export function ScenarioMock({ id }: { id: string }) {
  const s = SCENARIOS.find((x) => x.id === id)
  if (!s) return null
  return (
    <div className="lp-scn-visual">
      <span className="lp-illustrative">Illustration</span>
      {s.mock}
    </div>
  )
}

export function Scenarios() {
  const [active, setActive] = useState(SCENARIOS[0].id)
  const s = SCENARIOS.find((x) => x.id === active) ?? SCENARIOS[0]

  return (
    <div className="lp-scn">
      <div className="lp-scn-tabs" role="tablist" aria-label="Departments">
        {SCENARIOS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`lp-scn-tab-${x.id}`}
            aria-selected={x.id === active}
            aria-controls="lp-scn-panel"
            className={`lp-scn-tab${x.id === active ? ' lp-scn-tab--on' : ''}`}
            onClick={() => setActive(x.id)}
          >
            {x.icon}
            {x.dept}
          </button>
        ))}
      </div>
      <div
        className="lp-scn-panel"
        role="tabpanel"
        id="lp-scn-panel"
        aria-labelledby={`lp-scn-tab-${s.id}`}
      >
        <div className="lp-scn-visual">
          <span className="lp-illustrative">Illustration</span>
          {s.mock}
        </div>
        <div className="lp-scn-text">
          <span className="lp-scn-module">
            {s.module}
            {s.status && <em className="lp-pill lp-pill--build">{s.status}</em>}
          </span>
          <h4>{s.title}</h4>
          {s.stat && (
            <div className="lp-scn-stat">
              <strong>{s.stat.value}</strong>
              <span>{s.stat.label}</span>
            </div>
          )}
          <p>{s.body}</p>
          <p className="lp-scn-outcome">
            <CheckIcon size={16} /> {s.outcome}
          </p>
          <p className="lp-scn-price">{s.price}</p>
          <a className="lp-scn-more" href={`/${moduleSlug(s.module)}`}>
            More about {s.module} <ArrowRightIcon size={14} />
          </a>
          {s.stat?.source && <p className="lp-scn-source">{s.stat.source}</p>}
        </div>
      </div>
    </div>
  )
}

