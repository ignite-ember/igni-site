import { useMemo, useState, type ReactNode } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  ArrowRightIcon,
  MailIcon,
  AppsIcon,
  BookIcon,
  CheckIcon,
  CircleSlashIcon,
  CpuIcon,
  FileDirectoryIcon,
  KeyIcon,
  LockIcon,
  PackageIcon,
  PeopleIcon,
  PlugIcon,
  SearchIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShieldLockIcon,
  WorkflowIcon,
} from '@primer/octicons-react'
import { IgniLogo } from '../components/IgniLogo'
import { CALENDLY_URL, CONTACT_EMAIL, mailto, BANDS, CODEINDEX_PRICES, ARTIFACTS_PRICES, FLEET_PRICES, FACTORY_PER_YEAR, AUTOPILOT_PRICES, MODULE_FROM, eur, eurK, bandSpoken, fleetApps } from './site/siteData'
import { SiteFooter, SiteNav } from './site/SiteChrome'
import { SectionHead, StatRow } from './site/Sections'
import { BandName, BandShort } from './site/BandName'
import { Scenarios } from './site/Scenarios'
import './landing-shared.css'
import './LandingPage.css'
import claimsPlainLight from '../assets/igni-claims-plain-light.png'
import claimsPlainDark from '../assets/igni-claims-plain-dark.png'
import claimsPlainMobileLight from '../assets/igni-claims-plain-mobile-light.png'
import claimsPlainMobileDark from '../assets/igni-claims-plain-mobile-dark.png'
import claimsAppLight from '../assets/igni-claims-app-light.png'
import claimsAppDark from '../assets/igni-claims-app-dark.png'
import claimsAppMobileLight from '../assets/igni-claims-app-mobile-light.png'
import claimsAppMobileDark from '../assets/igni-claims-app-mobile-dark.png'
import claimsChatLight from '../assets/igni-claims-chat-light.png'
import claimsChatDark from '../assets/igni-claims-chat-dark.png'
import extensionZones from '../assets/extension-zones.json'

/* ── The landing page ──────────────────────────────────────────────
 *
 * Written for the person who signs, not the person who installs: the
 * engineering lead (does it make my teams faster), the CISO (where does
 * our data go) and the CTO or head of AI (do we own anything at the
 * end). The previous page sold a coding agent priced as a GPU bill; the
 * product is now an agentic platform for every department, with three
 * modules sold separately and a factory that builds the customer's own
 * models.
 *
 * Every commercial fact comes from Ignite Ember's product catalogue, which
 * wins where this page and an engineering doc disagree: the prices, the
 * buyer story and the pilot. Two rules hold everywhere below:
 *
 *  * Ignite Ember never hosts. The platform runs on the customer's
 *    hardware, owned or rented, and nothing on this page offers to run
 *    it for them.
 *  * Never present an estimate as a fact. Measured numbers say where
 *    they were measured; the department scenarios are marked as
 *    illustrations; anything not built yet says so in the same breath.
 */

/* ── Deal estimator ───────────────────────────────────────────────
 *
 * The price list as a decision a manager actually makes: which module,
 * for how many of the people who would use it, and whether to add the
 * Factory and Autopilot. Each module is a separate line on the quote because it
 * is a separate licence — nothing here discounts for taking both.
 *
 * Presets are the catalog's own worked examples, so the three buttons
 * show deals the business has already reasoned through rather than
 * numbers invented to look small.
 */
type Deal = {
  codeindex: number | null
  artifacts: number | null
  fleet: number | null
  factory: boolean
  autopilot: number | null
}

const PRESETS: { id: string; label: string; who: string; deal: Deal }[] = [
  {
    id: 'team',
    label: 'One team',
    who: '30 developers on CodeIndex',
    deal: { codeindex: 0, artifacts: null, fleet: null, factory: false, autopilot: null },
  },
  {
    id: 'department',
    label: 'One department',
    who: '60 developers on CodeIndex, 200 people on Artifacts',
    deal: { codeindex: 1, artifacts: 2, fleet: null, factory: false, autopilot: null },
  },
  {
    id: 'several',
    label: 'Several departments',
    who: '300 developers on CodeIndex, 1,000 people on Artifacts, and the Factory',
    deal: { codeindex: 3, artifacts: 4, fleet: null, factory: true, autopilot: null },
  },
]

function annualFor(deal: Deal): {
  codeindex: number
  artifacts: number
  fleet: number
  factory: number
  autopilot: number
  total: number
} {
  const codeindex = deal.codeindex === null ? 0 : CODEINDEX_PRICES[deal.codeindex]
  const artifacts = deal.artifacts === null ? 0 : ARTIFACTS_PRICES[deal.artifacts]
  const fleet = deal.fleet === null ? 0 : FLEET_PRICES[deal.fleet]
  const factory = deal.factory ? FACTORY_PER_YEAR : 0
  const autopilot = deal.autopilot === null ? 0 : AUTOPILOT_PRICES[deal.autopilot]
  return {
    codeindex,
    artifacts,
    fleet,
    factory,
    autopilot,
    total: codeindex + artifacts + fleet + factory + autopilot,
  }
}

function BandPicker({
  id,
  label,
  value,
  prices,
  onChange,
  tone,
}: {
  id: string
  label: string
  value: number | null
  prices: number[]
  onChange: (v: number | null) => void
  /** The module's colour, as on its card: Fleet blue, Autopilot violet. */
  tone?: 'fleet' | 'factory'
}) {
  return (
    <div className={`lp-est-field${tone ? ` lp-est-field--${tone}` : ''}`}>
      <span className="lp-est-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="lp-est-seg" role="radiogroup" aria-labelledby={`${id}-label`}>
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          className={`lp-est-seg-btn${value === null ? ' lp-est-seg-btn--on' : ''}`}
          onClick={() => onChange(null)}
        >
          Not now
        </button>
        {BANDS.map((b, i) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={value === i}
            className={`lp-est-seg-btn${value === i ? ' lp-est-seg-btn--on' : ''}`}
            onClick={() => onChange(i)}
            aria-label={`${bandSpoken(i)}, ${eurK(prices[i])} a year`}
          >
            <span aria-hidden><BandShort i={i} /></span>
            <span className="lp-est-seg-unit">{eurK(prices[i])}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function DealEstimator() {
  const [deal, setDeal] = useState<Deal>(PRESETS[1].deal)
  const annual = useMemo(() => annualFor(deal), [deal])
  const activePreset = PRESETS.find(
    (p) =>
      p.deal.codeindex === deal.codeindex &&
      p.deal.artifacts === deal.artifacts &&
      p.deal.fleet === deal.fleet &&
      p.deal.factory === deal.factory &&
      p.deal.autopilot === deal.autopilot,
  )

  return (
    <div className="lp-est">
      <div className="lp-est-controls">
        <div className="lp-est-presets" role="group" aria-label="Example deals">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={activePreset?.id === p.id}
              className={`lp-est-preset${activePreset?.id === p.id ? ' lp-est-preset--on' : ''}`}
              onClick={() => setDeal(p.deal)}
            >
              <strong>{p.label}</strong>
              <span>{p.who}</span>
            </button>
          ))}
        </div>

        <BandPicker
          id="lp-est-codeindex"
          label="CodeIndex: developers who use it"
          value={deal.codeindex}
          prices={CODEINDEX_PRICES}
          onChange={(v) => setDeal((d) => ({ ...d, codeindex: v }))}
        />
        <BandPicker
          id="lp-est-artifacts"
          label="Artifacts: people who use it"
          value={deal.artifacts}
          prices={ARTIFACTS_PRICES}
          onChange={(v) => setDeal((d) => ({ ...d, artifacts: v }))}
        />
        <BandPicker
          id="lp-est-fleet"
          label="Fleet: people who use it (each band includes as many apps)"
          tone="fleet"
          value={deal.fleet}
          prices={FLEET_PRICES}
          onChange={(v) => setDeal((d) => ({ ...d, fleet: v }))}
        />

        <label className="lp-est-check lp-est-check--factory">
          <input
            type="checkbox"
            checked={deal.factory}
            onChange={(e) =>
              setDeal((d) => ({
                ...d,
                factory: e.target.checked,
                // Autopilot sits on top of the Factory.
                autopilot: e.target.checked ? d.autopilot : null,
              }))
            }
          />
          <span>
            Factory
            <em>{eur.format(FACTORY_PER_YEAR)} a year, for any number of domain models</em>
          </span>
        </label>
        <BandPicker
          id="lp-est-autopilot"
          label="Autopilot, on top of the Factory: people whose conversations it learns from"
          tone="factory"
          value={deal.autopilot}
          prices={AUTOPILOT_PRICES}
          onChange={(v) =>
            setDeal((d) => ({ ...d, autopilot: v, factory: v === null ? d.factory : true }))
          }
        />
        {/* Phones only: the quote is a screen below the choices, so the
            total stays pinned to the bottom of them while they change. */}
        <div className="lp-est-pin" aria-hidden>
          <span>Per year, list price</span>
          <strong>{eur.format(annual.total)}</strong>
        </div>
      </div>

      <div className="lp-est-quote" aria-live="polite">
        <span className="lp-est-quote-kicker">Estimate at list price, excl. VAT</span>
        <ul className="lp-est-lines">
          <li>
            <span>
              igni base platform
              <em>agents, models, sign-in, roles, audit trail</em>
            </span>
            <strong>{eur.format(0)}</strong>
          </li>
          {deal.codeindex !== null && (
            <li className="lp-est-line-codeindex">
              <span>
                CodeIndex
                <em><BandName i={deal.codeindex} unit="developers" /></em>
              </span>
              <strong>{eur.format(annual.codeindex)}</strong>
            </li>
          )}
          {deal.artifacts !== null && (
            <li className="lp-est-line-artifacts">
              <span>
                Artifacts
                <em><BandName i={deal.artifacts} /></em>
              </span>
              <strong>{eur.format(annual.artifacts)}</strong>
            </li>
          )}
          {deal.fleet !== null && (
            <li className="lp-est-line-fleet">
              <span>
                Fleet
                <em><BandName i={deal.fleet} />, {fleetApps(deal.fleet)}</em>
              </span>
              <strong>{eur.format(annual.fleet)}</strong>
            </li>
          )}
          {deal.factory && (
            <li className="lp-est-line-factory">
              <span>
                Factory
                <em>any number of domain models</em>
              </span>
              <strong>{eur.format(annual.factory)}</strong>
            </li>
          )}
          {deal.autopilot !== null && (
            <li className="lp-est-line-autopilot">
              <span>
                Autopilot
                <em><BandName i={deal.autopilot} /></em>
              </span>
              <strong>{eur.format(annual.autopilot)}</strong>
            </li>
          )}
        </ul>
        <div className="lp-est-total">
          <span>Per year</span>
          <strong className="lp-est-total-annual">{eur.format(annual.total)}</strong>
        </div>
        <p className="lp-est-fine">
          Third-line support from Ignite Ember is included. Your hardware is not, and
          neither are your integrator&rsquo;s services: installation, accreditation,
          identity and CI integration, and first- and second-line support. Your
          integrator sends the final quote.
        </p>
        <a
          href={CALENDLY_URL}
          className="landing-btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Scope a pilot
        </a>
      </div>
    </div>
  )
}

/* ── Static content ──────────────────────────────────────────────── */

const MODULES: {
  id: string
  icon: ReactNode
  name: string
  line: string
  licensed: string
  price: string
  status?: string
  tone?: 'factory' | 'fleet'
}[] = [
  {
    id: 'codeindex',
    icon: <SearchIcon size={22} />,
    name: 'CodeIndex',
    line: 'Answers and reviews from a map of your code',
    licensed: 'Licensed on the developers who use it.',
    price: `${eurK(CODEINDEX_PRICES[0])} a year for up to ${BANDS[0]} developers`,
  },
  {
    id: 'artifacts',
    icon: <BookIcon size={22} />,
    name: 'Artifacts',
    line: 'A document graph that rebuilds when a source changes',
    licensed: 'Licensed on the people who use it. Readers are free.',
    price: `${eurK(ARTIFACTS_PRICES[0])} a year for up to ${BANDS[0]} people`,
  },
  {
    id: 'fleet',
    icon: <ServerIcon size={22} />,
    name: 'Fleet',
    line: 'A cloud agent in an isolated VM for every person and app',
    licensed: 'Per person, with as many apps. Local agents are free.',
    price: `${eurK(FLEET_PRICES[0])} a year for up to ${BANDS[0]} people`,
    tone: 'fleet',
  },
  {
    id: 'factory',
    icon: <WorkflowIcon size={22} />,
    name: 'Factory',
    line: 'Domain models trained on your data, and yours to keep',
    licensed: `Autopilot, on top: from ${eurK(AUTOPILOT_PRICES[0])} a year for up to ${BANDS[0]} people.`,
    price: `${eurK(FACTORY_PER_YEAR)} a year for any number of models`,
    tone: 'factory',
  },
]

const SECURITY: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <CircleSlashIcon size={20} />,
    title: 'Works in an isolated network',
    desc: 'Runs on your servers with no route to the internet. In air-gap mode, igni connects nowhere on its own.',
  },
  {
    icon: <LockIcon size={20} />,
    title: 'No route in for Ignite Ember',
    desc: 'Ignite Ember hosts nothing and has no route into your network. Support works only from symptoms and configuration.',
  },
  {
    icon: <PackageIcon size={20} />,
    title: 'Updates on your schedule',
    desc: 'Each release ships as a signed bundle with a software bill of materials. You verify it and decide when to apply it.',
  },
  {
    icon: <KeyIcon size={20} />,
    title: 'Your sign-in and audit trail',
    desc: 'Sign-in through OIDC, SCIM provisioning, roles and an audit trail are in the free, open-source base. SAML sign-in is coming next.',
  },
]

// What survives if the customer stops paying, or Ignite Ember stops.
// Merged from the old Ownership section, which asked the same question.
const GUARANTEES: { title: string; desc: string }[] = [
  {
    title: 'Your models stay yours',
    desc: 'Models the factory delivers, with their dataset and evaluation set, need no licence key and do not expire.',
  },
  {
    title: 'A lapsed licence winds down',
    desc: 'The module runs for 90 days with warnings, then becomes read-only. The base and your models keep running.',
  },
  {
    title: 'Source escrow',
    desc: 'Each paid module\u2019s source goes into verified escrow, set up with your first order and released to you if Ignite Ember stops supporting it.',
  },
]

/* ── What an app adds, on the real app ────────────────────────────
 *
 * Three captures of the real web client against its fixture backend
 * (igni clients/web e2e/landing-shot-extensions.spec.ts), for an
 * illustrative Claims desk app: plain igni, the app's own page open
 * inside igni, and the app at work in a chat. The marks sit on boxes the
 * spec measured with locator.boundingBox(), read from the JSON the spec
 * writes beside the captures (assets/extension-zones.json, copied with
 * them), so a recapture cannot leave the marks behind.
 */
type ShotId = 'plain' | 'app' | 'chat'
type Mark = { n: number; x: number; y: number; w: number; h: number }

type Box = { x: number; y: number; width: number; height: number } | null

function mark(n: number, box: Box): Mark[] {
  return box ? [{ n, x: box.x, y: box.y, w: box.width, h: box.height }] : []
}

const APP_BOXES = extensionZones.app.zones
const CHAT_BOXES = extensionZones.chat.zones

const SHOTS: Record<
  ShotId,
  {
    label: string
    light: string
    dark: string
    mobileLight: string
    mobileDark: string
    alt: string
    marks: Mark[]
  }
> = {
  plain: {
    label: 'Plain igni',
    light: claimsPlainLight,
    dark: claimsPlainDark,
    mobileLight: claimsPlainMobileLight,
    mobileDark: claimsPlainMobileDark,
    alt: 'igni with no app installed: a claims handler attaches a photo of a water-damaged ceiling, and the agent reads the claim file, summarises the damage and cover, and lists three documents missing from the file.',
    marks: [],
  },
  app: {
    label: 'With the Claims desk app',
    light: claimsAppLight,
    dark: claimsAppDark,
    mobileLight: claimsAppMobileLight,
    mobileDark: claimsAppMobileDark,
    alt: 'igni with the Claims desk app: the app has its own entry in the sidebar with an unread count, and its own page open inside igni, a queue of open claims with statuses and assignees beside the detail of one claim with an agent summary and a draft reply.',
    marks: [...mark(1, APP_BOXES.sidebar_app_entry), ...mark(2, APP_BOXES.extension_page_frame)],
  },
  chat: {
    label: 'The app in a chat',
    light: claimsChatLight,
    dark: claimsChatDark,
    mobileLight: claimsChatLight,
    mobileDark: claimsChatDark,
    alt: 'A chat in igni with the Claims desk app: a message from the app about a new claim, the agent calling the app\u2019s claims tool, a card from the app with the claim, the amount over the single-reviewer limit and an Assign button, and the app\u2019s status chip showing four open claims.',
    marks: [
      ...mark(1, CHAT_BOXES.sidebar_app_entry),
      ...mark(3, CHAT_BOXES.extension_message),
      ...mark(4, CHAT_BOXES.json_render_card),
      ...mark(5, CHAT_BOXES.indicator_chip),
    ],
  },
}

const APP_ADDS: { n: number; title: string; desc: string }[] = [
  { n: 1, title: 'An entry in the sidebar', desc: 'With an unread count igni keeps for it.' },
  { n: 2, title: 'Whole pages of its own', desc: 'Any screen your developers build, here a claims queue and one claim\u2019s detail, inside igni and in its theme.' },
  { n: 3, title: 'Messages in a chat', desc: 'Labelled with the app\u2019s name. The agent reads them and answers.' },
  { n: 4, title: 'Cards in a chat', desc: 'Live, with buttons. The model never sees them.' },
  { n: 5, title: 'A status chip', desc: 'Beside igni\u2019s own status, and it opens the app.' },
]

const APP_ADDS_UNSEEN: { title: string; desc: string }[] = [
  { title: 'Tools and agents', desc: 'The agent can call the app\u2019s tools, as it calls claims_get_claim in the chat.' },
  { title: 'Commands and menu entries', desc: 'In the chat box\u2019s / menu.' },
  { title: 'The agent\u2019s instructions and settings', desc: 'A section added to the agent\u2019s prompt, and options an administrator sets.' },
]

function AppZones() {
  const [shot, setShot] = useState<ShotId>('app')
  const current = SHOTS[shot]
  const shown = new Set(current.marks.map((m) => m.n))
  return (
    <div className="lp-zones">
      <div className="lp-zones-switch" role="group" aria-label="Show igni">
        {(Object.keys(SHOTS) as ShotId[]).map((id) => (
          <button key={id} type="button" aria-pressed={shot === id} onClick={() => setShot(id)}>
            {SHOTS[id].label}
          </button>
        ))}
      </div>
      <div className="lp-zones-shot">
        <picture>
          <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcSet={current.mobileDark} />
          <source media="(max-width: 600px)" srcSet={current.mobileLight} />
          <source media="(prefers-color-scheme: dark)" srcSet={current.dark} />
          <img className="lp-zones-img" src={current.light} width={1920} height={1080} alt={current.alt} />
        </picture>
        <div className="lp-zones-layer" aria-hidden>
          {current.marks.map((m) => (
            <span
              key={m.n}
              className="lp-mark"
              style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%` }}
            >
              <span className="lp-zone-n">{m.n}</span>
            </span>
          ))}
        </div>
      </div>
      <p className="lp-zones-caption">
        Real igni screens with sample data. The Claims desk is an example app.
      </p>
      <div className="lp-zones-legend">
        <ol>
          {APP_ADDS.map((z) => (
            <li key={z.n} className={shown.has(z.n) ? 'lp-zones-on' : undefined}>
              <span className="lp-zone-n">{z.n}</span>
              <div>
                <strong>{z.title}</strong>
                <p>{z.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="lp-zones-unseen">
          <span>Also, out of sight:</span>{' '}
          {APP_ADDS_UNSEEN.map((u, i) => (
            <span key={u.title}>
              <strong>{u.title}.</strong> {u.desc}
              {i < APP_ADDS_UNSEEN.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}

/*
 * Extensions, from the igni extensibility docs and the extension-starter
 * walkthrough: a service the organisation runs,
 * plus an extension that every igni installs once an administrator has
 * approved exactly what it adds. CodeIndex and Artifacts attach through
 * the same contract. "Remote" means inside the customer's network; igni
 * hosts nothing.
 */
// Real SDK calls, from igni's extension package and the host object model,
// cloud and service-identity docs. The claims-desk names are the example;
// every method and field is igni's own.
//
// Which chat: `ext.host.chat` is the current session of the igni the
// extension runs in, so the person's open chat. A service event names its
// producer (a person or an app) and goes to that producer's main session:
// it starts a run, or is queued for the run already going.
const WIRE_HOST_CODE = `ext = IgniExtension("acme.claims")

@ext.on(ext.host.chat.run_completed)
async def check(run: Run) -> None:
    if run.changed_files:
        await ext.host.chat.post("Both claims need a second reviewer.")`

const WIRE_DIRECT_CODE = `agent = igni.host(org_id).agent(Producer.person("marieke"))

await agent.send_message(
    "New claim CL-20431. Assess the damage in the photo.",
    attachments=[Attachment.from_path("damage.jpg")],
    thread="claim:CL-20431",
    title="Claim CL-20431",
)`

const WIRE_EVENT_SEND = `await agent.send_event("claim.created", {"id": "CL-20431"})`

const WIRE_EVENT_CODE = `@ext.on_service_event("claim.created")
async def new_claim(event: ServiceEvent) -> None:
    claim = await claims.get(event.payload["id"])
    if claim.amount < 1_000:
        return  # small claims are settled without an agent

    chat = await ext.host.sessions.create(title=f"Claim {claim.id}")
    await ext.host.sessions.chat(chat.session_id).post(
        f"Claim {claim.id} needs a first reply. Use the claims tools."
    )`

/* A small, fixed highlighter for the snippets above: comments, strings,
 * decorators, keywords, JSON keys and the HTTP verb. Enough for four
 * known snippets; not a general tokenizer. */
const CODE_TOKEN =
  /(#.*$)|(@[\w.]+)|(f?"(?:[^"\\]|\\.)*")|\b(async|await|def|if|return|None)\b|^(POST|GET)\b/gm

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of code.matchAll(CODE_TOKEN)) {
    const i = m.index ?? 0
    if (i > last) out.push(code.slice(last, i))
    const kind = m[1] ? 'com' : m[2] ? 'dec' : m[3] ? (code[i + m[0].length] === ':' ? 'key' : 'str') : 'kw'
    out.push(
      <span key={i} className={`lp-tok-${kind}`}>
        {m[0]}
      </span>,
    )
    last = i + m[0].length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

function CodeWindow({ file, lang, code }: { file: string; lang: string; code: string }) {
  return (
    <figure className="lp-code" aria-label={`${file}, ${lang}`}>
      <figcaption className="lp-code-bar">
        <span className="lp-code-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="lp-code-file">{file}</span>
        <span className="lp-code-lang">{lang}</span>
      </figcaption>
      <pre>
        <code>
          {code.split('\n').map((line, n) => (
            <span key={n} className="lp-code-line">
              <span className="lp-code-n" aria-hidden>
                {n + 1}
              </span>
              <span>{highlight(line)}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}

const EXTENSION_STEPS: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <PlugIcon size={18} />,
    title: 'Build',
    desc: 'Written with the igni SDKs. An app can add a sidebar page, tools, agents, slash commands and settings.',
  },
  {
    icon: <ShieldCheckIcon size={18} />,
    title: 'Approve',
    desc: 'An administrator sees what the app adds and the folders it may write to, checks its signing key thumbprint and approves it.',
  },
  {
    icon: <PeopleIcon size={18} />,
    title: 'Installed',
    desc: 'Every signed-in igni in the organisation installs it. Nobody installs anything by hand.',
  },
]

// Six questions. Cost and "does anything leave" are answered in their
// own sections; repeating them here made the FAQ the longest section.
// The base-model question is the objection a security reviewer raised:
// where the open-weight base model comes from, and who can vouch for it.
const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: 'We already use a cloud AI assistant. Why add igni?',
    a: 'Copilot, Cursor, Claude Code and Amazon Q run in their vendors\u2019 clouds, so an air-gapped network cannot use them. Where cloud is allowed, the bill grows with use: Uber spent its full-year AI budget in four months, at $500\u20132,000 per engineer a month (Fortune, 26 May 2026), and a rented model adds to the ICT concentration risk DORA asks you to assess. igni runs inside your network, with no outbound connections in air-gap mode, for a flat annual fee.',
  },
  {
    q: 'Is it production-ready? You are an early-stage company.',
    a: 'Ignite Ember is an early-stage Dutch company. The platform, CodeIndex, Artifacts, Fleet and the factory pipeline are built, and SAML sign-in is coming next. igni is software you run, not a service we host, so like PostgreSQL there is no service to certify: it runs inside your own certified estate, and it is assessed as a product under the EU Cyber Resilience Act. The annual order lapses if the pilot fails its criteria, production accreditation is refused, or a serious security finding in igni is not fixed.',
  },
  {
    q: 'igni\u2019s models are built on a Chinese base model. Can we use them?',
    a: 'igni 1.0 is tuned from Qwen, Alibaba\u2019s open-weight models, released under Apache-2.0. The weights run entirely inside your network, make no outbound connections, and you can inspect them. Because igni works on open-weight models, the base can be matched to your policy: where a Chinese base is not acceptable, a European or other open-weight model can be used instead, and the factory can tune it on your data. Ignite Ember has not yet released a tuned model on a European base.',
  },
  {
    q: 'Do we have to buy Fleet to use agents?',
    a: 'No. Every person gets an agent in the igni app and CLI, running on their own machine, free under Apache-2.0. Fleet is for cloud agents: one per person or app, each in an isolated VM on your servers, always on and reachable by your systems. Add it when agents need to keep working with the laptop closed, or when your apps need agents of their own.',
  },
  {
    q: 'What if Ignite Ember stops supporting igni?',
    a: 'The base is Apache-2.0. Models built by the factory carry no key and no expiry. The paid modules\u2019 source goes into verified escrow with your first order and is released to you if support stops. The security pack includes an exit-test runbook.',
  },
  {
    q: 'What hardware do we need?',
    a: 'igni 1.0 comes in two sizes. The 4B runs on a laptop or a small GPU. The 27B serves a department from one data-centre GPU, on servers you own or on dedicated GPUs you rent, and Ignite Ember\u2019s sizing model estimates about 200 heavy users per GPU for it. The load test in your pilot replaces that estimate with a measurement.',
  },
]

/* ── Component ───────────────────────────────────────────────────── */

export function LandingPage() {
  useDocumentTitle(
    'AI agents that run inside your network',
    'igni is AI agent software that runs inside your network, air-gapped or on dedicated GPUs you rent. Ignite Ember hosts nothing and has no route into your network. The base is free under Apache-2.0, and paid modules are sold separately from €8k a year with nothing metered.',
  )
  return (
    <main className="landing landing--main lp">
      <SiteNav home />

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="landing-hero lp-hero">
        <h2>
          AI agents that run{' '}
          <span className="landing-hero-gradient">inside your network</span>
        </h2>
        <p className="landing-hero-sub">
          igni is the AI platform regulated organisations can actually run: agents for
          every team and models trained on your own data, while no AI vendor sees or
          holds your code, data or models, Ignite Ember included.
        </p>

        <div className="lp-hero-cta">
          <a
            href={CALENDLY_URL}
            className="landing-btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Schedule a call
          </a>
          <a href={mailto('igni')} className="landing-btn-secondary" title={CONTACT_EMAIL}>
            <MailIcon size={16} /> Email us
          </a>
        </div>
        <p className="lp-hero-note">
          The base is free under Apache-2.0. Paid modules start at{' '}
          {eurK(MODULE_FROM)} a year, and each can be evaluated free for 30 days, or 60
          with your integrator.
        </p>

        {/* ── The boundary, drawn ─────────────────────────────
         *
         * The first visual proves the headline: everything inside the
         * customer's network, Ignite Ember outside it with no route in.
         * It replaced a screenshot of the desktop app patching Python,
         * which five reviewers (manager, CISO, bank CTO, SI, designer)
         * agreed read as "another coding assistant" under a line that
         * promises agents for every team.
         */}
        <div id="platform" className="lp-hero-diagram">
        {/* The architecture as a buyer reads it: what is free, what is
            licensed, what is built by the customer, and what sits
            outside the boundary, which is only Ignite Ember and the
            signed updates the customer chooses to import. */}
        <div className="lp-arch" role="img" aria-label="Diagram of igni inside your network, which needs no route out. Your people and apps use a free Apache-2.0 base of agents, models and MCP plugins. CodeIndex, Artifacts and Fleet are separate annual licences. The Factory builds domain models from your data with your experts, and Autopilot improves them from your users' conversations; both are annual licences. Your extensions are built by your developers or your integrator and approved by your admin. Everything runs on GPUs you own or dedicated GPUs you rent, and igni starts on one GPU. Ignite Ember sits outside with no route in and publishes signed updates with an SBOM, which you import on your own schedule.">
          <div className="lp-arch-net">
            <span className="lp-arch-net-label">
              <ShieldLockIcon size={14} /> Your network · no route out needed
            </span>

            <div className="lp-arch-users">
              {['Engineering', 'Risk', 'Legal', 'Operations'].map((d) => (
                <span key={d} className="lp-chip">
                  <PeopleIcon size={12} /> {d}
                </span>
              ))}
              <span className="lp-chip lp-chip--app">
                <AppsIcon size={12} /> Your apps and pipelines
              </span>
            </div>

            {/* Extensions (CodeIndex, Artifacts, your own) run in the igni
                app; Fleet and the Factory run as services on your servers.
                One grid, so each bar sits under the two it describes. */}
            <div className="lp-arch-row lp-arch-modules">
              <div className="lp-arch-box lp-arch-box--paid lp-arch-at-ci">
                <SearchIcon size={16} />
                <strong>CodeIndex</strong>
                <span>Maps every repository and reviews every PR</span>
              </div>
              <div className="lp-arch-box lp-arch-box--paid lp-arch-at-ar">
                <BookIcon size={16} />
                <strong>Artifacts</strong>
                <span>A document graph that rebuilds when a source changes</span>
              </div>
              <div className="lp-arch-box lp-arch-box--fleet lp-arch-at-fl">
                <ServerIcon size={16} />
                <strong>Fleet</strong>
                <span>A cloud agent in an isolated VM for each person and app</span>
              </div>
              <div className="lp-arch-box lp-arch-box--factory lp-arch-at-fa">
                <WorkflowIcon size={16} />
                <strong>Factory</strong>
                <span>Domain models from your data, improved by Autopilot</span>
              </div>
              <div className="lp-arch-box lp-arch-box--ext lp-arch-at-ext">
                <PlugIcon size={16} />
                <strong>Your extensions</strong>
                <span>Apps built with the igni SDKs, approved by your admin</span>
              </div>
              <div className="lp-arch-box lp-arch-box--ext lp-arch-box--cloud lp-arch-at-cloud">
                <ServerIcon size={16} />
                <strong>On your servers</strong>
                <span>Run as services in your cloud, not in the app</span>
              </div>
            </div>

            <div className="lp-arch-box lp-arch-box--base">
              <div className="lp-arch-base-head">
                <CpuIcon size={16} />
                <strong>igni base</strong>
                <em className="lp-pill lp-pill--free">Free · Apache-2.0</em>
              </div>
              <div className="lp-arch-base-items">
                <span>Agents and orchestration</span>
                <span>Models 4B · 27B</span>
                <span>MCP plugins into your systems</span>
                <span>OIDC sign-in, SCIM, roles, audit trail</span>
                <span>Desktop app and CLI</span>
              </div>
            </div>

            <div className="lp-arch-hw">
              <ServerIcon size={14} /> GPUs you own, or dedicated GPUs you rent. igni starts on one GPU.
            </div>
          </div>

          <div className="lp-arch-outside">
            <div className="lp-arch-link">
              <span className="lp-arch-link-line" />
            </div>
            <div className="lp-arch-vendor">
              <strong>Ignite Ember</strong>
              <span>No route into your network</span>
              <span className="lp-arch-vendor-updates">
                <PackageIcon size={12} /> Signed updates with an SBOM, imported on your schedule
              </span>
            </div>
          </div>
        </div>

        <div className="lp-legend">
          <span><i className="lp-legend-swatch lp-legend-swatch--free" /> Free</span>
          <span><i className="lp-legend-swatch lp-legend-swatch--paid" /> Modules, annual licence each</span>
          <span><i className="lp-legend-swatch lp-legend-swatch--fleet" /> Fleet, the agent runtime, annual licence</span>
          <span><i className="lp-legend-swatch lp-legend-swatch--factory" /> Factory and Autopilot, annual licences</span>
          <span><i className="lp-legend-swatch lp-legend-swatch--ext" /> Built by you or your integrator</span>
        </div>
        </div>
      </section>

      {/* ── What it promises ──────────────────────────────
       *
       * The four things that hold for every team: where it runs, what
       * leaves, who owns the result, and who it is for. Prices and the
       * CodeIndex evaluation have their own sections.
       */}
      <StatRow
        stats={[
          { value: 'Your network', label: 'Air-gapped, or on dedicated GPUs you rent.' },
          { value: '0', label: 'Outbound connections of its own in air-gap mode.' },
          { value: 'Yours', label: 'Models built from your data have no licence key and no expiry.' },
          { value: 'Every team', label: 'One installation serves every person and every app.' },
        ]}
      />

      {/* ── In practice ─────────────────────────────────── */}
      <section id="in-practice" className="landing-section lp-center">
        <SectionHead label="In practice" title="One installation, four departments">
          Start with one engineering team. Add risk, operations and legal to the same
          installation later. The data, the agents and the results stay on your
          servers.
        </SectionHead>
        <Scenarios />
      </section>

      {/* ── Security & continuity ───────────────────────── */}
      <div className="lp-band">
      <section id="security" className="landing-section lp-center">
        <SectionHead label="Security & continuity" title="Built for isolated networks, and for your exit plan">
          Before the first workshop, your security team receives a pack to check all of
          this: the egress test, the SBOM, a network diagram, an exit-test runbook and
          our compliance self-assessment. No DPA is needed, because Ignite Ember never
          processes your data.
        </SectionHead>
        <div className="lp-sec-grid">
          {SECURITY.map((s) => (
            <div key={s.title} className="lp-sec-card">
              <div className="landing-codeindex-capability-icon">{s.icon}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
        {/* Said here, not only in the FAQ: a CISO looks for it in this
            section, and its absence reads as something hidden. */}
        <p className="lp-note">
          igni hosts nothing, so like PostgreSQL there is no service to certify: it runs
          inside your own certified estate. It is assessed as a product under the EU Cyber
          Resilience Act: SBOMs and vulnerability scanning today, signed images and build
          provenance in build, and ISO 27001 for the build and release process planned.
        </p>
        <div className="lp-hero-cta">
          <a href={mailto('Request: igni security pack')} className="landing-btn-secondary" title={CONTACT_EMAIL}>
            <MailIcon size={16} /> Request the security pack
          </a>
        </div>
        <h4 className="lp-subhead">
          If you stop paying, or Ignite Ember stops
          <span>These terms support a DORA exit plan.</span>
        </h4>
        <div className="lp-guarantees">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="lp-guarantee">
              <CheckIcon size={16} />
              <div>
                <strong>{g.title}</strong>
                <p>{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>

      {/* ── The app and its extensions ─────────────────── */}
      {/* One section, not two. The app had a section of its own with a
          coding screenshot, which made the page read as a developer tool
          again; the claims screens below show the same app, first on its
          own and then with an app built into it. */}
      <section id="extensions" className="landing-section lp-center">
        <SectionHead label="The app" title="Where your people work, with your own apps inside it">
          Everyone works in the igni desktop app, and developers can also use a CLI.
          Your developers or your integrator can build apps into it, such as a claims
          desk. Each app runs on your servers, and an administrator approves it before
          anyone receives it.
        </SectionHead>

        <AppZones />

        <div className="lp-ext">
          {/* The approval as an administrator sees it. Illustration: the
              app and the thumbprint are made up. */}
          <div className="lp-ext-visual">
            <span className="lp-illustrative">Illustration</span>
            <div className="lp-mock lp-ext-approve">
              <div className="lp-mock-bar">
                <ShieldCheckIcon size={14} /> Portal · Services · Claims desk
              </div>
              <div className="lp-mock-body">
                <span className="lp-ext-approve-title">This app would add:</span>
                <ul>
                  <li>A page in the sidebar</li>
                  <li>4 tools and 1 agent</li>
                  <li>Write access to <code>claims/</code></li>
                </ul>
                <span className="lp-ext-thumb">Signing key thumbprint 3f:a9:…:c2</span>
                <span className="lp-ext-approve-btn">
                  <CheckIcon size={12} /> Approve for the organisation
                </span>
              </div>
            </div>
          </div>

          <div className="lp-ext-text">
            <ol className="lp-ext-steps">
              {EXTENSION_STEPS.map((x, i) => (
                <li key={x.title}>
                  <span className="lp-ext-step-icon">{x.icon}</span>
                  <div>
                    <strong>
                      {i + 1}. {x.title}
                    </strong>
                    <p>{x.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* How an app talks to igni, from the igni extensibility, host
            object model and cloud docs and the service / extension SDK
            READMEs. Three lanes, each explicit: the
            extension acting in the app through the host API; the service
            talking to igni directly (igni posts exactly what it sends); and the
            service handing an event to the extension, which acts through the
            host API (igni posts nothing on its own). */}
        <div className="lp-wire">
          <h4>How an app talks to igni</h4>
          <div className="lp-wire-lane">
            <div className="lp-wire-node">
              <strong>Your app&rsquo;s extension</strong>
              <span>its page and its process</span>
            </div>
            <div className="lp-wire-link">
              <span>Host API</span>
              <code>ext.host</code>
            </div>
            <div className="lp-wire-node lp-wire-node--igni">
              <strong>igni app</strong>
              <span>on the person&rsquo;s machine</span>
            </div>
            <p>
              The app sees what happens in igni, such as a session opening or an agent
              finishing a run, and can act on it: open a page, show a card or post a
              message under its own name. It reaches only the parts an administrator
              granted.
            </p>
            <div className="lp-wire-demo">
              <CodeWindow file="claims_extension.py" lang="Python · igni-extension" code={WIRE_HOST_CODE} />
              <div className="lp-wire-result">
                <span className="lp-wire-result-label">What the person sees · illustration</span>
                <div className="lp-mock lp-wire-chat">
                  <div className="lp-mock-bar">
                    <IgniLogo size={14} /> Marieke&rsquo;s chat, open in igni
                  </div>
                  <div className="lp-mock-body">
                    <p className="lp-wire-msg">
                      Updated CL-20418 and CL-20421 with the water-damage assessment.
                    </p>
                    <span className="lp-wire-meta">
                      <CheckIcon size={12} /> Run finished · 2 files changed
                    </span>
                    <div className="lp-wire-ext-msg">
                      <span className="lp-wire-badge">
                        <FileDirectoryIcon size={12} /> Claims desk
                      </span>
                      <p>Both claims need a second reviewer.</p>
                    </div>
                    <p className="lp-wire-msg">I have asked Jeroen to review both claims.</p>
                  </div>
                </div>
                <p className="lp-wire-note">
                  <strong>Which chat?</strong> No chat ID is needed: the extension runs in the
                  person&rsquo;s igni, so <code>ext.host.chat</code> is the chat they have
                  open. The message is labelled with the app&rsquo;s name, and the agent
                  answers it.
                </p>
              </div>
            </div>
          </div>
          <div className="lp-wire-lane">
            <div className="lp-wire-node">
              <strong>Your app&rsquo;s service</strong>
              <span>on your servers</span>
            </div>
            <div className="lp-wire-link">
              <span>igni SDK</span>
              <code>send_message</code>
            </div>
            <div className="lp-wire-node lp-wire-node--fleet">
              <strong>The person&rsquo;s agent</strong>
              <span>in Fleet, or on their desktop</span>
            </div>
            <p>
              The service talks to igni directly. It sends a message with files, opens a
              chat or queues work for a person&rsquo;s or an app&rsquo;s agent, and igni
              posts exactly what it sent, whether or not anybody is watching. No extension
              code runs.
            </p>
            <div className="lp-wire-demo">
              <CodeWindow file="claims_service.py" lang="Python · igni-service" code={WIRE_DIRECT_CODE} />
              <div className="lp-wire-result">
                <span className="lp-wire-result-label">What the person sees · illustration</span>
                <div className="lp-mock lp-wire-chat">
                  <div className="lp-mock-bar">
                    <IgniLogo size={14} /> Claim CL-20431 · new chat
                  </div>
                  <div className="lp-mock-body">
                    <div className="lp-wire-ext-msg">
                      <span className="lp-wire-badge">
                        <FileDirectoryIcon size={12} /> Claims desk
                      </span>
                      <p>New claim CL-20431. Assess the damage in the photo.</p>
                      <span className="lp-wire-file">damage.jpg</span>
                    </div>
                    <p className="lp-wire-msg">
                      The photo shows water damage to the kitchen floor. I have drafted an
                      assessment for your review.
                    </p>
                  </div>
                </div>
                <p className="lp-wire-note">
                  <strong>Which chat?</strong> The thread decides. The first message for{' '}
                  <code>claim:CL-20431</code> opens a chat with that title, and later ones go
                  back to it. Without a thread, messages go to the app&rsquo;s own chat. Your
                  extension can see these messages but cannot change them.
                </p>
              </div>
            </div>
          </div>
          <div className="lp-wire-lane">
            <div className="lp-wire-node">
              <strong>Your app&rsquo;s service</strong>
              <span>on your servers</span>
            </div>
            <div className="lp-wire-link">
              <span>igni SDK</span>
              <code>send_event</code>
            </div>
            <div className="lp-wire-node lp-wire-node--igni">
              <strong>Your app&rsquo;s extension</strong>
              <span>inside the person&rsquo;s igni</span>
            </div>
            <p>
              The service hands an event to your extension, and the extension decides what
              to do with it through the host API, like any other extension code. igni posts
              nothing on its own.
            </p>
            <div className="lp-wire-demo">
              <div className="lp-wire-codes">
                <CodeWindow file="claims_service.py" lang="Python · igni-service" code={WIRE_EVENT_SEND} />
                <CodeWindow file="claims_extension.py" lang="Python · igni-extension" code={WIRE_EVENT_CODE} />
              </div>
              <div className="lp-wire-result">
                <span className="lp-wire-result-label">What happens · illustration</span>
                <div className="lp-mock lp-wire-chat">
                  <div className="lp-mock-bar">
                    <ServerIcon size={14} /> Fleet · Marieke&rsquo;s agent
                  </div>
                  <div className="lp-mock-body">
                    <ol className="lp-wire-steps">
                      <li>
                        <span className="lp-wire-badge">claim.created</span> CL-20431 reaches
                        the extension; nobody has igni open
                      </li>
                      <li>The extension opens the chat &ldquo;Claim CL-20431&rdquo;</li>
                      <li>It posts the task, and the agent starts</li>
                      <li>
                        <CheckIcon size={12} /> Draft ready for Marieke to review
                      </li>
                    </ol>
                  </div>
                </div>
                <p className="lp-wire-note">
                  <strong>If nothing handles it,</strong> nothing is posted, and the service
                  sees the event marked <code>not_handled</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="landing-section lp-center">
        <SectionHead label="Pricing" title="A flat annual fee per module. Nothing is metered.">
          The igni base is free. Each paid module has a fixed yearly fee, set by how many
          people use it, up to an unlimited tier above 1,000. People who only read its
          output are not counted, and neither are agents or tokens. Fleet includes as
          many apps as people.
        </SectionHead>

        {/* What each module is, before the calculator asks which ones. */}
        <div id="modules" className="lp-modules-in-pricing">
        <div className="lp-modules">
            {MODULES.map((m) => (
              <article
                key={m.id}
                className={`lp-module${m.status ? ' lp-module--build' : ''}${m.tone ? ` lp-module--${m.tone}` : ''}`}
              >
                <h4>
                  <span className="lp-module-icon">{m.icon}</span>
                  {m.name}
                  {m.status && <em className="lp-pill lp-pill--build">{m.status}</em>}
                </h4>
                <p className="lp-module-line">{m.line}</p>
                <div className="lp-module-foot">
                  <strong>{m.price}</strong>
                  <span>{m.licensed}</span>
                  <a className="lp-module-more" href={`/${m.id}`}>
                    More about {m.name} <ArrowRightIcon size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>

        <DealEstimator />

        <details className="lp-pricelist">
          <summary>See the full price list</summary>
        <div className="lp-table-wrap">
          <table className="lp-table">
            <thead>
              <tr>
                <th>People</th>
                <th>CodeIndex</th>
                <th>Artifacts</th>
                <th>Fleet</th>
                <th>Autopilot</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b, i) => (
                <tr key={b}>
                  <td><BandName i={i} /></td>
                  <td>{eur.format(CODEINDEX_PRICES[i])}</td>
                  <td>{eur.format(ARTIFACTS_PRICES[i])}</td>
                  <td>{eur.format(FLEET_PRICES[i])}</td>
                  <td>{eur.format(AUTOPILOT_PRICES[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </details>
        <p className="lp-note">
          List prices in EUR per year, excluding VAT. Multi-year, multi-module and
          group-wide agreements are quoted. Your integrator quotes the final price. No
          licence fee is due until a pilot meets the criteria you agree, as set out
          below.
        </p>
      </section>

      {/* ── How you buy ──────────────────────────────── */}
      {/* After Pricing, so the reader has seen the fee before reading how
          it is waived during a pilot. A four-role review (CIO, procurement,
          integrator, editor, 2026-10-30) moved it here from before Pricing,
          where it followed SDK code with a promise about a fee not yet
          shown. The who-does-what cards moved to For integrators. */}
      <section id="start" className="landing-section lp-center">
        <SectionHead label="How you buy" title="From first install to annual licence">
          Try it free, pilot it in production with no licence fee, and pay only once
          the pilot meets criteria you agreed in writing. Every clock starts when the
          software runs, not when the paperwork is done.
        </SectionHead>

        <ol className="lp-path">
          <li className="lp-path-step">
            <span className="lp-path-when">Today</span>
            <h4>Try it</h4>
            <strong className="lp-path-price">Free</strong>
            <p>The Apache-2.0 base with no contract, and every paid module on evaluation.</p>
            <ul className="lp-path-terms">
              <li>
                <strong>How long:</strong> 30 days from a module&rsquo;s first run, or 60
                with your integrator.
              </li>
              <li>
                <strong>Who:</strong> up to 25 users, outside production.
              </li>
              <li>
                <strong>If procurement is slow:</strong> a bridge of up to 60 days while
                your order moves.
              </li>
              <li>
                <strong>What you sign:</strong> nothing.
              </li>
            </ul>
          </li>
          <li className="lp-path-step lp-path-step--accent">
            <span className="lp-path-when">Up to 90 days from go-live</span>
            <h4>Pilot it</h4>
            <strong className="lp-path-price">No licence fee</strong>
            <p>One department works in production, on your data.</p>
            <ul className="lp-path-terms">
              <li>
                <strong>When it is judged:</strong> by day 60, which leaves time to
                object and switch over. The criteria count as met unless you object in
                writing within 10 business days.
              </li>
              <li>
                <strong>What you sign:</strong> written success criteria and the annual
                order, both at the start.
              </li>
              <li>
                <strong>What you pay:</strong> no licence fee during the pilot. Your
                integrator bills its work separately.
              </li>
              <li>
                <strong>How you exit:</strong> the order lapses and you owe nothing for
                the licence if the criteria are not met, production accreditation is
                refused, or a serious security finding in igni is not fixed.
              </li>
            </ul>
          </li>
          <li className="lp-path-step">
            <span className="lp-path-when">After the pilot</span>
            <h4>Run it</h4>
            <strong className="lp-path-price">Annual licence</strong>
            <p>The modules your pilot proved, for the whole department.</p>
            <ul className="lp-path-terms">
              <li>
                <strong>When it starts:</strong> the licence year and the first invoice
                start when the criteria are met.
              </li>
              <li>
                <strong>What you sign:</strong> nothing new. The annual order you signed
                at the start takes effect.
              </li>
              <li>
                <strong>Growing:</strong> add teams, modules and domain models when you
                need them, at the bands in the price list above.
              </li>
            </ul>
          </li>
        </ol>
      </section>

      {/* ── Objections ──────────────────────────────────── */}
      <section className="landing-section lp-center">
        <SectionHead label="The obvious questions" title="What your committee will ask">
          Where something is still on its way, this page says so.
        </SectionHead>
        <div className="alt-faq">
          {OBJECTIONS.map((o, i) => (
            <details key={o.q} className="alt-faq-item" open={i === 0}>
              <summary>{o.q}</summary>
              <p>{o.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Partners ────────────────────────────────────── */}
      {/* One line. The partner terms are not shown here: this page is forwarded to clients, and an SI reviewer
          pointed out that publishing the reseller margin next to the list
          price hands the client's procurement a lever against the
          integrator. */}
      <section id="partners" className="landing-section lp-partners">
        <div className="lp-partners-band">
          <div className="lp-partners-text">
            <span className="landing-section-label">For integrators</span>
            <h3>Deliver igni to your clients</h3>
            <p>
              You install igni, take it through your client&rsquo;s accreditation, connect
              identity and CI, and provide first- and second-line support. It runs on
              your client&rsquo;s servers, with no service hosted by Ignite Ember.
            </p>
            <p>
              Ignite Ember supplies the software, the models and signed update bundles,
              and handles third-line support.
            </p>
          </div>
          <div className="lp-partners-gets">
            <span className="lp-partners-gets-label">What you get</span>
            <ul>
              <li>
                <CheckIcon size={16} />
                <span>
                  <strong>60-day evaluations</strong> for your clients, instead of 30.
                </span>
              </li>
              <li>
                <CheckIcon size={16} />
                <span>
                  <strong>A free internal licence</strong> for up to 50 of your people, for
                  demos, testing and learning igni.
                </span>
              </li>
              <li>
                <CheckIcon size={16} />
                <span>
                  <strong>A one-day knowledge transfer</strong> that gets your team ready to
                  install and support igni.
                </span>
              </li>
            </ul>
            <div className="lp-partners-actions">
              <a
                href={CALENDLY_URL}
                className="landing-btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Talk to us about partnering
              </a>
              <a href={mailto('igni partnership')} className="landing-btn-secondary" title={CONTACT_EMAIL}>
                <MailIcon size={16} /> Email us
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter home />
    </main>
  )
}
