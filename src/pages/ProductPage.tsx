import type { ReactNode } from 'react'
import {
  ArrowRightIcon,
  MailIcon,
  BookIcon,
  CheckIcon,
  GitCompareIcon,
  SearchIcon,
  ServerIcon,
  WorkflowIcon,
} from '@primer/octicons-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  ARTIFACTS_PRICES,
  AUTOPILOT_PRICES,
  CALENDLY_URL,
  CONTACT_EMAIL,
  CODEINDEX_PRICES,
  COMPARE_AGENTCORE,
  FACTORY_PER_YEAR,
  FLEET_PRICES,
  PRODUCTS,
  SEAT_CEILINGS,
  SEAT_MINIMUM,
  UNLIMITED,
  eur,
  eurK,
  eurSeat,
  graduatedPrice,
  marginalRates,
  seatRange,
  mailto,
} from './site/siteData'
import { SiteFooter, SiteNav } from './site/SiteChrome'
import { ScenarioMock } from './site/Scenarios'
import { CodeIndexEval, FactoryEval } from './site/Evals'
import './landing-shared.css'
import './LandingPage.css'

/* ── A product page ───────────────────────────────────────────────
 *
 * One page per paid module, on the public site only. The landing page
 * says what igni is; these say what one module does, how it works, what
 * has been measured, what it needs, and what is not finished. The same
 * rules as the landing page: measured numbers say where they were
 * measured, illustrations say so, and anything not built yet says so on
 * the page. Facts come from the module's docs page.
 */

type Point = { title: string; desc: string }

type Product = {
  slug: string
  name: string
  icon: ReactNode
  tone: 'orange' | 'violet' | 'blue'
  /** One fact the reader needs before anything else, under the hero. */
  callout?: ReactNode
  status?: string
  title: string
  lead: string
  price: string
  licensed: string
  points: Point[]
  how: Point[]
  mock: string
  proofTitle: string
  proof: ReactNode
  needs: Point[]
  security: Point[]
  notYet: string[]
  prices:
    | { kind: 'bands'; unit: string; values: number[]; note?: string }
    | { kind: 'flat'; note: string }
  docs: { slug: string; title: string }[]
  /** Other pages on the site worth reading next, shown beside the docs. */
  related?: { href: string; title: string }[]
}

const PRODUCT_LIST: Product[] = [
  {
    slug: 'codeindex',
    name: 'CodeIndex',
    icon: <SearchIcon size={20} />,
    tone: 'orange',
    title: 'Answers and reviews from a map of your code',
    lead: 'CodeIndex reads your repositories and gives igni’s agent a graph of them: every file and function, what calls what, and a summary, quality and security note for each. The agent queries the graph instead of searching text, so it answers more questions correctly and spends fewer tokens doing it.',
    price: `${eurSeat(marginalRates(CODEINDEX_PRICES)[0])} a developer a year, less at scale`,
    licensed: 'Licensed on the developers who use it.',
    points: [
      { title: 'Questions about the whole codebase', desc: 'Which files reach a dangerous sink, what swallows errors, what is depended on but untested. The agent answers from the graph, with file and line.' },
      { title: 'A review on every pull request', desc: 'It reviews pull and merge requests on GitHub and GitLab and posts its findings as comments. You switch it on per repository and choose which kinds of comment it posts.' },
      { title: 'Plans that name the files', desc: 'While the index covers your commit, a plan that names fewer than two files goes back to the agent to be made concrete.' },
    ],
    how: [
      { title: 'A push or a merge request', desc: 'GitHub or GitLab tells CodeIndex through a signed webhook. An admin can also start a run.' },
      { title: 'The service indexes it', desc: 'It parses the code with tree-sitter, writes summaries on your own GPUs, and stores one changeset per commit.' },
      { title: 'Each machine builds its index', desc: 'The extension downloads the changeset for your commit and builds a local graph and embeddings, with no internet access.' },
      { title: 'The agent queries it', desc: 'Read-only queries against the local graph, through a specialist agent that writes them.' },
    ],
    mock: 'engineering',
    proofTitle: 'Measured against text search',
    proof: <CodeIndexEval />,
    needs: [
      { title: 'igni server', desc: 'CodeIndex registers with it and ships its extension through it.' },
      { title: 'A GPU pool for indexing', desc: 'Summaries are written by models on your own inference nodes, in a pool of their own.' },
      { title: 'GitHub or GitLab', desc: 'Self-hosted or cloud, able to reach CodeIndex with webhooks.' },
      { title: 'PostgreSQL, Redis and an object store', desc: 'For the service, its queue and the changesets.' },
    ],
    security: [
      { title: 'Indexed on your hardware', desc: 'Parsing, summaries and embeddings all run inside your network. Nothing is sent to a model API.' },
      { title: 'A copy on each developer’s machine', desc: 'Each machine holds a local graph of the code it has checked out, including the security notes. Treat it like the source itself.' },
      { title: 'Read-only queries', desc: 'The agent’s queries are checked, and anything that writes is refused. Results are capped at 500 rows.' },
    ],
    notYet: [
      'There is no Helm chart for CodeIndex yet. Your integrator deploys it from the image.',
      'When you move to a new commit, the local index holds only what that commit changed until the rest is carried over.',
      'Indexing every branch from the start is built for GitHub; on GitLab it indexes the default branch.',
      'The local index has not yet been run on Windows.',
    ],
    prices: { kind: 'bands', unit: 'developers', values: CODEINDEX_PRICES },
    docs: [{ slug: 'codeindex', title: 'CodeIndex: a queryable graph of your code' }],
  },
  {
    slug: 'artifacts',
    name: 'Artifacts',
    icon: <BookIcon size={20} />,
    tone: 'orange',
    title: 'Documents that know what they were built on',
    lead: 'Artifacts keeps the documents igni’s agent writes — design notes, decision records, policies — with their versions, comments and drafts. It records which version of which source each one was built on, so when a source changes you can see every document that now stands on an old version.',
    price: `${eurSeat(marginalRates(ARTIFACTS_PRICES)[0])} a person a year, less at scale`,
    licensed: 'Licensed on the people who change documents. Readers are free.',
    points: [
      { title: 'Shared, versioned documents', desc: 'Every version, comment and draft is kept. A document starts private, and its owner chooses who may open it.' },
      { title: 'Lineage pinned to a version', desc: 'Not “built on the auth design” but “built on version 3 of it, which is now at version 7”. That is what makes it actionable.' },
      { title: 'A queue of what has gone stale', desc: 'When a source moves on, every document built on it joins its owner’s queue, furthest behind first.' },
    ],
    how: [
      { title: 'The agent writes a draft', desc: 'A specialist agent, the archivist, writes it. Publishing is a separate act, and it publishes only when someone asks.' },
      { title: 'Lineage is captured as it works', desc: 'Every search records the exact versions it read, and those become candidate links that a person confirms or dismisses.' },
      { title: 'A source changes', desc: 'Each confirmed link to an older version goes stale, and the document joins its owner’s queue.' },
      { title: 'A person brings it up to date', desc: 'Ask the archivist to redraft it. Only a person can confirm it is current: that is never done automatically.' },
    ],
    mock: 'risk',
    proofTitle: 'What has been measured',
    proof: (
      <div className="lp-prod-proof-note">
        <p>
          We have not published a measurement for Artifacts yet. What it guarantees is
          behaviour you can check in your evaluation:
        </p>
        <ul>
          <li>Access is decided before anything is ranked, so search never shows a document you may not open.</li>
          <li>A link whose far end you cannot open is counted, not hidden: &ldquo;built on 3 documents, 1 you cannot see&rdquo;.</li>
          <li>The agent&rsquo;s queries run read-only in the service, for at most 10 seconds and 200 rows.</li>
        </ul>
      </div>
    ),
    needs: [
      { title: 'The documents service', desc: 'A deployment of its own beside igni server, on its own hostname.' },
      { title: 'PostgreSQL and Redis', desc: 'Each organisation gets its own database for documents and its own Redis database for drafts.' },
      { title: 'Optional: Neo4j and an embedder', desc: 'Each organisation’s own graph turns on passage search. Without them, documents still publish, open and sync.' },
    ],
    security: [
      { title: 'It holds no passwords', desc: 'It checks the tokens igni server signs and never issues its own. No secret is shared between the two services.' },
      { title: 'One database per organisation', desc: 'Organisations’ documents are kept apart in separate databases, not only separate rows.' },
      { title: 'Readers see only what they may', desc: 'Every route checks access, and a document you may not open looks the same as one that does not exist.' },
    ],
    notYet: [
      'There is no Helm chart for the documents service yet. Your integrator deploys it.',
      'Its databases are not covered by the server’s built-in backup yet.',
      'Deleting a document is permanent; there is no trash.',
      'No measured figure is published yet.',
    ],
    prices: { kind: 'bands', unit: 'people', values: ARTIFACTS_PRICES },
    docs: [
      { slug: 'artifacts', title: 'Artifacts: shared documents and lineage' },
      { slug: 'running-the-documents-service', title: 'Running the documents service' },
    ],
  },
  {
    slug: 'fleet',
    name: 'Fleet',
    icon: <ServerIcon size={20} />,
    tone: 'blue',
    status: 'In build',
    title: 'A cloud agent for every person and every app, each in its own VM',
    lead: 'Fleet runs a cloud agent for each person, each app and each end user of an app, in an isolated microVM on your servers. It keeps working when a laptop is closed, and your systems can reach it. An idle agent is paused, then suspended to disk, and woken when a person, a command, a service or its own schedule needs it.',
    callout: (
      <>
        <strong>Do you need Fleet to use agents? No.</strong> Every person gets a free
        agent in the igni app and CLI, running on their own machine, in the
        Apache-2.0 base. Fleet is for agents that run in the cloud on your servers:
        always on, isolated per person or app, and reachable by your systems.
      </>
    ),
    price: `${eurSeat(marginalRates(FLEET_PRICES)[0])} a person a year, less at scale`,
    licensed: 'Licensed on the people who use it, with as many app agents included.',
    points: [
      { title: 'One cloud VM per person or app', desc: 'Each agent works in its own Firecracker microVM, with its own workspace. The VM is the boundary between people.' },
      { title: 'Idle agents cost nothing', desc: 'After 10 seconds idle a VM is paused; under memory pressure it is suspended to disk and its memory freed.' },
      { title: 'Reachable by your systems', desc: 'Your services send an agent messages, files and events, and an app’s agent can serve each of its end users separately.' },
    ],
    how: [
      { title: 'Something needs the agent', desc: 'A person connects, a service sends an event, a command arrives, or a task the agent scheduled comes due.' },
      { title: 'The gateway wakes it', desc: 'It checks who is asking and the licence, and wakes the VM on its node, or restores it from disk.' },
      { title: 'The agent works', desc: 'The same igni backend as the desktop app, in the agent’s own workspace, using your models.' },
      { title: 'It goes back to sleep', desc: 'Paused when idle, suspended under memory pressure or after a day, offloaded after seven days.' },
    ],
    mock: 'operations',
    proofTitle: 'Measured wake times',
    proof: (
      <div className="lp-prod-proof-note">
        <p>
          The real igni image doing real work through the gateway, on one bare-metal
          server (Google Cloud c3-highcpu-192-metal) running 50 agents with their volumes
          on shared storage, time to the first answer, 40 runs of each.
        </p>
        <div className="lp-table-wrap">
          <table className="lp-table">
            <thead>
              <tr>
                <th>Starting from</th>
                <th>Typical (p50)</th>
                <th>Slow (p95)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Paused</td><td>29 ms</td><td>73 ms</td></tr>
              <tr><td>Suspended to disk</td><td>155 ms</td><td>194 ms</td></tr>
              <tr><td>Cold</td><td>137 ms</td><td>188 ms</td></tr>
            </tbody>
          </table>
        </div>
        <p>Measure on your own hardware before you size a cluster.</p>
      </div>
    ),
    needs: [
      { title: 'Linux hosts with KVM', desc: 'x86_64, bare metal with local NVMe recommended. Arm is not supported yet.' },
      { title: 'Encrypted storage', desc: 'ext4 with encryption for VM state, and shared storage for volumes so a VM can move between hosts.' },
      { title: 'A key service', desc: 'Vault or OpenBao, which holds the keys that encrypt every VM.' },
      { title: 'PostgreSQL', desc: 'For the gateway.' },
    ],
    security: [
      { title: 'The VM is the boundary', desc: 'Each person’s or app’s agent runs in its own microVM under Firecracker’s jailer and its seccomp policy.' },
      { title: 'Encrypted at rest', desc: 'Volumes and suspended memory are encrypted per VM.' },
      { title: 'No network inside the guest agent', desc: 'The agent inside each VM talks to its host only over vsock.' },
    ],
    notYet: [
      'There are no deployment manifests yet, and Fleet is not in the offline update bundle.',
      'The desktop app and the CLI do not connect to Fleet yet; services and commands reach its agents.',
      'Hosts are registered by an operator rather than registering themselves.',
      'The organisation’s quota of awake time is recorded, not enforced.',
    ],
    prices: { kind: 'bands', unit: 'people', values: FLEET_PRICES, note: 'Fleet includes as many app agents as people licensed, at a time. An app\u2019s end users count as apps. Remove one and its place is free for a new one; past the cap, a new one is refused until you do or licence more people. Above 1,000 people there is no app cap.' },
    docs: [{ slug: 'fleet', title: 'Fleet: an agent in a microVM for every person and app' }],
    related: [{ href: COMPARE_AGENTCORE, title: 'igni + Fleet vs AWS Bedrock AgentCore' }],
  },
  {
    slug: 'factory',
    name: 'Factory',
    icon: <WorkflowIcon size={20} />,
    tone: 'violet',
    status: 'In build',
    title: 'A model for your domain, accepted only if it passes your test',
    lead: 'The Factory turns your own data into a model for one area of work, such as engineering, legal or risk. Your expert guides it as it builds and scores a dataset, fine-tunes an open-weight base model, and evaluates the result against a test you froze before tuning began. It runs inside your network and makes no external calls.',
    price: `${eurK(FACTORY_PER_YEAR)} a year for any number of models`,
    licensed: `Autopilot, on top: ${eurSeat(marginalRates(AUTOPILOT_PRICES)[0])} a person a year, less at scale.`,
    points: [
      { title: 'Your test decides', desc: 'You freeze an evaluation set before anything is built. A model is accepted only if it passes it.' },
      { title: 'Yours to keep', desc: 'The weights, the dataset and the evaluation set. A model has no licence key and no expiry, and keeps running if you stop paying.' },
      { title: 'Autopilot, on top', desc: 'It learns from your users’ conversations inside your network and ships a new version only if it beats the one in production on your test.' },
    ],
    how: [
      { title: 'Your data', desc: 'It stays inside your network throughout.' },
      { title: 'Your test', desc: 'You freeze an evaluation set before tuning starts.' },
      { title: 'Tuning', desc: 'Your expert guides the Factory as it builds and scores a dataset, then fine-tunes the model.' },
      { title: 'Yours', desc: 'Weights, dataset and evaluation set. No licence key, no expiry.' },
    ],
    mock: 'legal',
    proofTitle: 'Measured on our own model',
    proof: <FactoryEval />,
    needs: [
      { title: 'GPUs', desc: 'On servers you own or dedicated GPUs you rent, for tuning and for evaluation.' },
      { title: 'An open-weight base model', desc: 'You choose it. igni 1.0 is tuned from Qwen; another base can be used where your policy requires.' },
      { title: 'Your expert, and your test', desc: 'Someone who knows the work to guide the dataset, and an evaluation set they freeze first.' },
    ],
    security: [
      { title: 'No external calls', desc: 'Generating data, judging it and tuning all use models on your own hardware. Nothing is sent to a hosted model.' },
      { title: 'Your data stays where it is', desc: 'The dataset is built from your data inside your network and stays there.' },
      { title: 'No kill switch in the model', desc: 'A model the Factory delivers carries no licence check, so it keeps running whatever happens to the licence.' },
    ],
    notYet: [
      'The Factory you run in your own network is being packaged. igni 1.0 4B was built with its pipeline at Ignite Ember.',
      'Autopilot is in build.',
    ],
    prices: { kind: 'flat', note: `${eur.format(FACTORY_PER_YEAR)} a year for any number of models. Autopilot is priced like Fleet, from ${eurSeat(marginalRates(AUTOPILOT_PRICES)[0])} a person a year and graduated by headcount, and is sold only with the Factory.` },
    docs: [{ slug: 'models-and-the-factory', title: 'Models and the Factory' }],
  },
]

function PriceBlock({ p }: { p: Product }) {
  if (p.prices.kind === 'flat') {
    return <p className="lp-prod-flat">{p.prices.note}</p>
  }
  const { unit, values, note } = p.prices
  const perUnit = unit === 'developers' ? 'a developer' : 'a person'
  return (
    <div className="lp-table-wrap lp-prod-table">
      <table className="lp-table lp-ratecard">
        <thead>
          <tr>
            <th>Team size</th>
            <th>Rate, {perUnit} a year</th>
            <th>At the top of the band</th>
          </tr>
        </thead>
        <tbody>
          {SEAT_CEILINGS.map((_, i) => (
            <tr key={i}>
              <td>{seatRange(i)}</td>
              <td>{eurSeat(marginalRates(values)[i])}</td>
              <td>{eur.format(values[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lp-note">
        Graduated: each band&rsquo;s rate applies only to the people in it, so the fee is
        the sum across the bands your team spans — adding people never reprices those
        below them. It starts at a {SEAT_MINIMUM}-seat minimum (a smaller team is billed
        as {SEAT_MINIMUM}), so the smallest licence is{' '}
        {eur.format(graduatedPrice(values, SEAT_MINIMUM))} a year. The per-seat rate keeps
        falling as the team grows, reaching the ceiling of {eur.format(values[UNLIMITED])} a
        year at 3,000 people; above 3,000 the licence is a flat fee.{note ? ` ${note}` : ''}
      </p>
    </div>
  )
}

export function ProductPage({ slug }: { slug: string }) {
  const p = PRODUCT_LIST.find((x) => x.slug === slug) ?? PRODUCT_LIST[0]
  useDocumentTitle(`${p.name}: ${p.title}`, p.lead)

  return (
    <main className={`landing landing--main lp lp-prod lp-prod--${p.tone}`}>
      <SiteNav />

      <section className="landing-hero lp-prod-hero">
        <span className="lp-prod-kicker">
          {p.icon} {p.name}
          {p.status && <em className="lp-pill lp-pill--build">{p.status}</em>}
        </span>
        <h2>{p.title}</h2>
        <p className="landing-hero-sub">{p.lead}</p>
        <div className="lp-hero-cta">
          <a href={CALENDLY_URL} className="landing-btn-primary" target="_blank" rel="noopener noreferrer">
            Schedule a call
          </a>
          <a href={mailto(`igni ${p.name}`)} className="landing-btn-secondary" title={CONTACT_EMAIL}>
            <MailIcon size={16} /> Email us
          </a>
          <a href={`/docs/${p.docs[0].slug}`} className="landing-btn-secondary">
            Read the docs
          </a>
        </div>
        <p className="lp-hero-note">
          {p.price}. {p.licensed}
        </p>
        {p.callout && <p className="lp-prod-callout">{p.callout}</p>}
      </section>

      <section className="landing-section lp-center">
        <div className="lp-prod-points">
          {p.points.map((x) => (
            <div key={x.title} className="lp-sec-card">
              <h4>{x.title}</h4>
              <p>{x.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section lp-center">
        <span className="landing-section-label">How it works</span>
        <div className="lp-prod-how">
          <ol className="lp-prod-steps">
            {p.how.map((x, i) => (
              <li key={x.title}>
                <span className="lp-step-n">{i + 1}</span>
                <div>
                  <h4>{x.title}</h4>
                  <p>{x.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <ScenarioMock id={p.mock} />
        </div>
      </section>

      <section className="landing-section lp-center">
        <span className="landing-section-label">Proof</span>
        <h3 className="lp-h3-tight">{p.proofTitle}</h3>
        {p.proof}
      </section>

      <section className="landing-section lp-center">
        <span className="landing-section-label">Running it</span>
        <div className="lp-prod-cols">
          <div>
            <h4 className="lp-prod-colhead">What it needs</h4>
            <ul className="lp-prod-list">
              {p.needs.map((x) => (
                <li key={x.title}>
                  <strong>{x.title}.</strong> {x.desc}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="lp-prod-colhead">Security</h4>
            <ul className="lp-prod-list">
              {p.security.map((x) => (
                <li key={x.title}>
                  <strong>{x.title}.</strong> {x.desc}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="lp-prod-notyet">
          <h4>Not finished yet</h4>
          <ul>
            {p.notYet.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-section lp-center">
        <span className="landing-section-label">Price</span>
        <h3 className="lp-h3-tight">{p.price}</h3>
        <PriceBlock p={p} />
        <p className="lp-note">
          List prices in EUR per year, excluding VAT. Your integrator quotes the final
          price. No licence fee is due until a pilot meets the criteria you agree.{' '}
          <a href="/#pricing">Estimate a deal</a> or read <a href="/#start">how you buy</a>.
        </p>
        <div className="lp-prod-docs">
          {p.docs.map((d) => (
            <a key={d.slug} href={`/docs/${d.slug}`}>
              <CheckIcon size={14} /> {d.title}
            </a>
          ))}
          {p.related?.map((r) => (
            <a key={r.href} href={r.href}>
              <GitCompareIcon size={14} /> {r.title}
            </a>
          ))}
        </div>
      </section>

      <section className="landing-section lp-center">
        <span className="landing-section-label">The other modules</span>
        <div className="lp-prod-others">
          {PRODUCTS.filter((x) => x.slug !== p.slug).map((x) => (
            <a key={x.slug} href={`/${x.slug}`} className="lp-prod-other">
              <strong>{x.name}</strong>
              <span>{x.line}</span>
              <ArrowRightIcon size={14} />
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
