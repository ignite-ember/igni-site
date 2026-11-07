import type { ReactNode } from 'react'
import { GitCompareIcon, MailIcon } from '@primer/octicons-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  AUTOPILOT_PRICES,
  CALENDLY_URL,
  CONTACT_EMAIL,
  FACTORY_EVAL,
  FACTORY_PER_YEAR,
  FLEET_PRICES,
  eurK,
  mailto,
} from './site/siteData'
import { SiteFooter, SiteNav } from './site/SiteChrome'
import { Section as SiteSection, StatRow } from './site/Sections'
import {
  AC_RUNTIME,
  AWS_CHECKED,
  BAND_200,
  HEADROOM,
  PAUSED_GB,
  SERVER,
  SERVER_EUR,
  EUR_PER_GBP,
  USAGE_CHECKED,
  USD_PER_EUR,
  WORKED,
  WORKED_BASE,
  WRITTEN,
  agentCoreYear,
  countFull,
  COVERAGE,
  duration,
  eurShort,
  eurRangeShort,
  fleetYear,
  USAGE,
} from './compare/agentcoreData'
import {
  Architecture,
  Breakdown,
  CostBars,
  Coverage,
  ErasureSteps,
  ExtensionFlow,
  Figure,
  GpuCapacity,
  RTable,
  UsageCalculator,
  UsageChart,
  VsCard,
  Disclosure,
  Dot,
  ShotTabs,
  WakeChart,
  WeekTimeline,
  WorkspaceBars,
} from './compare/AgentCoreFigures'
import claimsPlainLight from '../assets/igni-claims-plain-light.png'
import claimsPlainDark from '../assets/igni-claims-plain-dark.png'
import claimsAppLight from '../assets/igni-claims-app-light.png'
import claimsAppDark from '../assets/igni-claims-app-dark.png'
import claimsChatLight from '../assets/igni-claims-chat-light.png'
import claimsChatDark from '../assets/igni-claims-chat-dark.png'
import './landing-shared.css'
import './LandingPage.css'
import './AgentCorePage.css'

/* ── igni + Fleet against AWS Bedrock AgentCore ───────────────────
 *
 * A comparison for organisations deciding whether their agent platform
 * lives in AWS or in-house. Ported from the comparison written on
 * 2 November 2026; its AWS facts and list prices were checked against
 * AWS's documentation on 1–2 November 2026, and that date is on the
 * page. Keep it there: an AWS price without the day it was read is a
 * claim nobody can check.
 *
 * The same rules as the product pages, and one more. Measured numbers
 * say where they were measured; modelled ones say they are modelled.
 * And the page keeps what counts against igni — where AgentCore is
 * ahead, no certificate held, the assumptions, and that the cost
 * figures are estimates rather than a quote. A comparison that hides
 * those is the first thing a buyer's architect takes apart.
 *
 * AgentCore is named in text only: no AWS logo, mark or colours.
 */

const FLEET_200 = FLEET_PRICES[BAND_200]
const AUTOPILOT_200 = AUTOPILOT_PRICES[BAND_200]
/** "24k", as the cost tables print a figure. */
const k = (n: number) => `${Math.round(n / 1000)}k`

const TOC: { id: string; label: string }[] = [
  { id: 'model', label: 'How they differ' },
  { id: 'features', label: 'Feature by feature' },
  { id: 'extensions', label: 'Extensions & UI' },
  { id: 'models', label: 'Models & GPUs' },
  { id: 'cost', label: 'Cost for 200 people' },
  { id: 'cost-usage', label: 'Cost by usage' },
  { id: 'speed', label: 'Speed' },
  { id: 'security', label: 'Security & data' },
  { id: 'erasure', label: 'What erasure covers' },
  { id: 'aws-wins', label: 'Where AgentCore is ahead' },
  { id: 'choose', label: 'Which to choose' },
  { id: 'sources', label: 'Assumptions & sources' },
]

/** A landing-page section whose content reads left-aligned in one column. */
function Section({ id, label, title, sub, band, children }: { id: string; label: string; title: string; sub?: ReactNode; band?: boolean; children: ReactNode }) {
  return (
    <SiteSection id={id} label={label} title={title} desc={sub} band={band} className="cmp-section">
      <div className="cmp-wrap">{children}</div>
    </SiteSection>
  )
}

function Pill({ tone, children }: { tone: 'good' | 'warn'; children: ReactNode }) {
  return <span className={`lp-pill ${tone === 'good' ? 'lp-pill--free' : 'lp-pill--build'}`}>{children}</span>
}

/** A detail cell that opens with a status pill. */
/**
 * A detail cell that opens with its status, in the at-a-glance table's
 * own dots: filled orange for has it, half for via open source.
 */
function Rated({ tone, pill, children }: { tone: 'good' | 'warn'; pill: string; children: ReactNode }) {
  return (
    <>
      <span className="cmp-cov-igni cmp-rated-status">
        <Dot has={tone === 'good' ? 'full' : 'half'} note={pill} />
      </span>
      <span className="cmp-rated">{children}</span>
    </>
  )
}

const DESCRIPTION =
  'How igni with Fleet compares with AWS Bedrock AgentCore: where each runs, what persists, feature by feature, models and GPUs, cost for 200 people and by usage, speed, security and erasure. AWS facts checked 1–2 November 2026.'

export function AgentCorePage() {
  useDocumentTitle('igni + Fleet vs AWS Bedrock AgentCore', DESCRIPTION)

  return (
    <main className="landing landing--main lp lp-prod lp-prod--orange lp-cmp">
      <SiteNav />

      <section className="landing-hero lp-prod-hero cmp-hero">
        <span className="lp-prod-kicker">
          <GitCompareIcon size={20} /> Comparison
        </span>
        <h2>
          igni + Fleet{' '}
          <span className="landing-hero-gradient">vs AWS Bedrock AgentCore</span>
        </h2>
        <p className="landing-hero-sub">
          For organisations deciding whether their AI agent platform lives in AWS or
          in-house. AgentCore is AWS&rsquo;s managed agent runtime, billed by use. igni is
          the whole stack — models, harness, server, and Fleet as the runtime — on your own
          servers, for a fixed licence.
        </p>
        <div className="lp-hero-cta">
          <a href={CALENDLY_URL} className="landing-btn-primary" target="_blank" rel="noopener noreferrer">
            Schedule a call
          </a>
          <a href={mailto('igni + Fleet vs AgentCore')} className="landing-btn-secondary" title={CONTACT_EMAIL}>
            <MailIcon size={16} /> Email us
          </a>
          <a href="/fleet" className="landing-btn-secondary">
            About Fleet
          </a>
        </div>
        <p className="lp-hero-note">
          Checked against AWS documentation, <span className="cmp-nowrap">{AWS_CHECKED}</span>.
        </p>
        <p className="lp-prod-callout">
          <strong>Short version.</strong> igni + Fleet runs agents, models, keys and audit
          inside your network, for a fixed licence that does not move with usage, and gives
          each person a 10–50 GiB encrypted workspace that survives redeploys until you erase
          it. With an open-weight model, igni&rsquo;s licence, servers and one GH200 come to
          roughly half of AgentCore&rsquo;s bill for 200 people. Against Claude Sonnet, igni
          is about an eighth. AgentCore is ahead on certifications, managed high
          availability, 24/7 support and breadth of services.
        </p>
      </section>

      <StatRow
        stats={[
          { value: '10–50 GiB', label: 'Workspace kept per person on Fleet, against 1 GB of AgentCore session storage (preview).' },
          { value: 'Until erased', label: 'How long Fleet keeps files, against 14 days on AgentCore, which also wipes them on every agent update.' },
          { value: '≈50%', label: 'Usage above which igni is cheaper than AgentCore with an open-weight model (Qwen3 32B on Bedrock).' },
          { value: '~30 ms', label: 'Fleet back from a pause (p50; under 45 ms after a long idle), against ~2 s for AgentCore’s cold start once its idle timeout has ended the session (P75, AWS).' },
        ]}
      />

      <nav className="lp-scn-tabs cmp-toc" aria-label="On this page">
        {TOC.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="lp-scn-tab">{t.label}</a>
        ))}
      </nav>

        {/* ── How the two differ ─────────────────────────── */}
        <Section
          id="model"
          label="The model"
          title="How the two differ"
          sub="Both put each agent in its own Firecracker microVM. They differ in what the VM belongs to, where it runs and how it is paid for."
        >
          <Figure
            title="Where each piece runs"
            caption="AgentCore’s session VMs are thrown away and everything lasting lives in separate AWS services. Fleet’s VMs belong to a person or app and keep their own disk, all inside your network."
          >
            <Architecture />
          </Figure>
          <div className="cmp-grid cmp-grid--3">
            <VsCard
              label="What a VM belongs to"
              aws="A session. The VM lasts up to 8 hours (ends after 15 minutes idle by default); resuming starts a new VM. Optional session storage keeps files across resumes until 14 days idle or a redeploy."
              igni="A person, an app, or an app’s end-user space. The VM suspends when idle and keeps its own encrypted disk through redeploys until you erase it."
            />
            <VsCard
              label="Where it runs"
              aws="Only the AWS regions where AWS offers it, including Frankfurt and Ireland; many AWS regions do not have it. Private networking through VPC and PrivateLink. Not listed for the AWS European Sovereign Cloud."
              igni={<>Self-hosted: your own servers, in your own data centre, in your own country — or a private cloud you choose. It does not depend on where a provider offers its service. With <code>air_gapped = true</code>, nothing on the host or in the VMs reaches outside your network.</>}
            />
            <VsCard
              label="How you pay"
              aws="Metered: vCPU-hours, GB-hours, calls, records, retrievals, and model tokens. Moves every month."
              igni={`A fixed annual licence, graduated per person (${eurK(FLEET_200)} at 200 people, less below). The hardware is yours, and tokens cost nothing extra.`}
            />
          </div>

          <Figure
            title="A week of one person’s agent"
            caption="Working 9–17 each day. On Wednesday the agent is updated. AgentCore starts a new VM every session and its session storage is wiped by the update; Fleet’s VM suspends overnight and its workspace carries on."
          >
            <WeekTimeline />
            <WorkspaceBars />
          </Figure>
          <div className="cmp-grid cmp-grid--2">
            <VsCard
              label="What that means for the agent"
              aws="Files survive through opt-in session storage, which is reset by every agent update and after 14 idle days; beyond that the agent rebuilds its workspace. The throwaway VM gives a smaller blast radius by default: anything bad that gets in is gone at the next reset."
              igni="The whole workspace — files, tools, caches — is still there through redeploys until you erase it. Anything that gets in stays until reset, so Fleet limits it: the OS is a read-only base patched centrally and picked up at the next fresh start, every command is audited, and any person or app resets to a clean base in one call."
            />
            <VsCard
              label="And when you want it gone"
              aws="Discards the VM by default. Memory, S3, CloudWatch and session storage are deleted service by service, by you."
              igni="Keeps by default and erases on command: discard an app (a new one starts at once while the old data is erased in the background), erase a removed person’s VM, or erase idle apps and spaces after a set time. Erasure destroys the keys and the data, is audited, and resumes after a crash (so far tested against simulated nodes, not yet on a real Fleet host)."
            />
          </div>
        </Section>

        {/* ── Feature by feature ─────────────────────────── */}
        <Section
          id="features"
          band
          label="Features"
          title="Feature by feature"
          sub="AgentCore’s services, and what igni has in their place. On the igni side this is the free harness and server plus paid modules (Fleet, CodeIndex, Artifacts, the Factory)."
        >
          <Figure
            title="At a glance"
            caption={`Filled: has it. Half: partial or in build. Ring: not offered. AgentCore has ${countFull('aws')} of ${COVERAGE.length} in full; igni has ${countFull('igni')}, including what an organisation that keeps everything in-house needs. The detail for each is behind the button below.`}
          >
            <Coverage />
          </Figure>

          <Disclosure id="feature-detail" show="Show the detail for each capability" hide="Hide the detail">
            <RTable
              className="cmp-compare"
              head={['Capability', 'AWS AgentCore', 'igni + Fleet']}
              rows={[
                ['Agent runtime', 'Runtime: one microVM per session, up to 8 h, any framework. Runtime Instances: a dedicated EC2 instance per session for up to 14 days, with EBS, at the EC2 price + 12%. Managed harness (GA June 2026).', <Rated tone="good" pill="Has it">Fleet: one microVM per person or app, suspends when idle and resumes in ~30 ms, persistent encrypted volume; gateway, node agent, PostgreSQL job queue, audited erasure, egress rules.</Rated>],
                ['Persistence', 'Session storage (preview): per session, up to 1 GB, kept 14 days idle, wiped on every agent redeploy. Or shared EFS / S3 Files mounts (not per user), or Instances with EBS kept until the session is deleted.', <Rated tone="good" pill="Bigger, longer, per person">Per person/app volume (10 GiB default, up to 50 GiB), dm-crypt encrypted, survives redeploys and idle time, offloaded to your own object store when cold; erased only by policy or command.</Rated>],
                ['Memory', 'Memory: short-term events and long-term extracted records with semantic retrieval; billed per GB and per 1,000 records.', <Rated tone="good" pill="Has it">User memory and profiles, entity memory and session context carried across conversations (Agno&rsquo;s learning machine), conversation history in SQLite or PostgreSQL with automatic compaction — plus the agent&rsquo;s own persistent disk. Artifacts and CodeIndex (paid) add versioned documents and code retrieval.</Rated>],
                ['MCP tools', 'Gateway: connects agents to MCP servers, with tool search across them; billed per call.', <Rated tone="good" pill="Has it">Any MCP server, over stdio or SSE/HTTP, with per-tool approvals and filters; extensions add tools of their own. No search across tools when a deployment has hundreds of them.</Rated>],
                ['REST APIs as MCP tools', 'Gateway turns REST APIs (OpenAPI) and Lambda functions into MCP tools, as a managed service.', <Rated tone="warn" pill="Via open source">Not built into igni. Open-source converters do it inside your network — e.g. FastMCP&rsquo;s OpenAPI import (Apache-2.0) generates an MCP server from an OpenAPI spec — and igni connects to the result like any MCP server.</Rated>],
                ['Identity', 'Identity: inbound auth (IAM, OIDC) and an outbound OAuth / API-key vault for agents.', <Rated tone="good" pill="Has it">Inbound OIDC sign-in (Entra ID, Okta, Keycloak…), SCIM provisioning, organisations and roles. Outbound credentials come from your own vault (Vault, CyberArk, 1Password via a command) rather than a vault igni runs. SAML not yet built.</Rated>],
                ['Policy & network', 'Policy: Cedar (GA), checked on tool calls through Gateway. VPC, security groups, PrivateLink.', <Rated tone="good" pill="Has it">A permission check on every tool call, with hooks; group policy packs pushed to every user; guardrails for PII, prompt injection and moderation; roles, app caps and egress rules; VM egress internal-only with <code>air_gapped = true</code>.</Rated>],
                ['Audit & observability', 'Observability: OpenTelemetry traces and metrics into CloudWatch.', <Rated tone="good" pill="Has it">Audit trail in the server (including every erasure) and a log of every tool run. OpenTelemetry traces and metrics (agent, model and tool spans; tokens and tool calls) to your own collector, with prompt content stripped unless enabled.</Rated>],
                ['Code execution', 'Code Interpreter: a separate managed sandbox, billed per vCPU-hour.', <Rated tone="good" pill="Built in">The agent&rsquo;s own VM runs code; no separate service or bill.</Rated>],
                ['Web browser', 'Browser: a managed headless browser for agents.', <Rated tone="warn" pill="Via open source">No managed browser, but any VM can have one: headless Chromium with Playwright, driven through an open-source MCP server such as Microsoft&rsquo;s Playwright MCP, measured in a Fleet VM at ~1 GB at peak. See <a href="#vm-profiles">The agent&rsquo;s VM is extensible</a>.</Rated>],
                ['Web search', 'Web Search: Amazon’s own web index and knowledge graph, through Gateway as an MCP tool; snippets, URLs, titles and dates; domain and date filters. $7 per 1,000 queries. us-east-1, Ireland and Tokyo.', <Rated tone="good" pill="Has it">A built-in web search tool (DuckDuckGo-based, free, no key); every search asks the person first, and it is off when air-gapped. <b>Recommended for daily use: Brave Search API</b> through MCP, at $5 per 1,000 searches, under a contract with Brave. Other search APIs plug in the same way. At the 10 searches a person a day assumed below: ~€2.4k a year on Brave, against ~€3.4k on AgentCore.</Rated>],
                ['Changeable VM profiles', 'One container image per agent runtime. Changing what is in it means a new version and a redeploy, which wipes session storage; there is no per-group or per-app variant.', <Rated tone="good" pill="Has it">Profiles per organisation, group or app, changed by an admin at any time. Timeouts and normal memory apply at once. Packages, CPUs and memory ceiling are rolled out in the background: sleeping VMs are re-prepared in batches beside their old snapshot, awake ones switch at their next sleep. Nobody is interrupted and every workspace keeps its files.</Rated>],
                ['Evaluations', 'Evaluations: LLM-judge scoring of agent output, plus A/B tests and prompt recommendations.', <Rated tone="good" pill="Has it">Agent evaluations: accuracy scored by an LLM judge, reliability (were the right tools called), and performance, defined in YAML per agent. The Factory (paid) evaluates and tunes models; Autopilot improves them from real use.</Rated>],
                ['Models', 'Any model: Bedrock (Claude, Llama, MiniMax…) or an external API; tokens billed separately.', <Rated tone="good" pill="Any model">igni&rsquo;s own 4B and 27B on your GPUs; any open-weight model you serve; and, where your policy allows, OpenAI-compatible APIs, Anthropic&rsquo;s Claude and Google Gemini. One GH200 serves ~200 people working with it, ~60 generating at the same moment. See <a href="#models">Models and GPU capacity</a>.</Rated>],
                ['Coding assistant', 'AgentCore harness: managed agent loop with shell, files and memory; no desktop or IDE client.', <Rated tone="good" pill="Included, on-prem">Desktop app and CLI (free); CodeIndex for code search, analysis and PR review (paid).</Rated>],
                ['User interface', 'For builders only: a console playground to chat with and test an agent, and observability dashboards. No end-user app; the front end your people use is yours to build.', <Rated tone="good" pill="Included">Desktop app and web client people work in every day, the CLI, and the server&rsquo;s admin portal (organisations, roles, services, erasures). See <a href="#extensions">Extensions and the UI</a>.</Rated>],
                ['Extensions', 'Add tools through Gateway (MCP). No way for an integration to add pages, commands or settings to a user-facing app.', <Rated tone="good" pill="Has it">A signed extension adds tools, prompts, pages, commands, settings and status to the igni app, and its service can talk to the agent. See below.</Rated>],
                ['Source & lock-in', 'Closed managed service. Agent code is portable; code using Memory, Gateway and Identity APIs must be rewritten to leave.', <Rated tone="good" pill="Open core">Harness, server and models are Apache-2.0 and public. Fleet, CodeIndex and Artifacts are closed source, licensed with an offline key.</Rated>],
              ]}
            />
          </Disclosure>

          <h4 className="lp-subhead" id="vm-profiles">The agent&rsquo;s VM is extensible</h4>
          <p className="landing-section-desc lp-desc cmp-desc">What the agent&rsquo;s environment contains, who decides, and what happens when it changes.</p>
          <div className="cmp-grid cmp-grid--3">
            <VsCard
              label="What the agent’s environment contains"
              aws="Your agent’s container image, one per agent runtime, plus AWS’s managed tools beside it (Browser, Code Interpreter), each billed separately."
              igni={<>A VM profile: packages (<code>apt</code>, <code>pip</code>, <code>npm</code>) and a setup script, plus memory, CPUs and disk. Anything that runs on Linux can go in — a browser, CLIs, language runtimes, database clients, your own internal tools — at no extra charge.</>}
            />
            <VsCard
              label="Who gets what"
              aws="Everyone using an agent runtime gets the same image; a different set of tools means a separate runtime."
              igni="A profile for the whole organisation, a group or one app. Apps and extensions can request one through the SDK; an org admin approves what runs."
            />
            <VsCard
              label="When it changes"
              aws="A new image version and a redeploy, which wipes session storage."
              igni="Nothing is rebooted at once. Timeouts and normal memory apply immediately; new packages, CPUs or memory ceiling roll out in the background — sleeping VMs are prepared beside their old snapshot, awake ones switch at their next sleep. Programs restart on the new layer; workspace files stay."
            />
          </div>
          <div className="cmp-grid cmp-grid--1 cmp-gap">
            <VsCard
              label="Example: a browser"
              aws="AgentCore Browser: a managed headless browser in AWS, billed per vCPU-hour and GB-hour, with recording, live view and Web Bot Auth."
              igni="Headless Chromium with Playwright in the VM, measured at ~1 GB of memory at peak and 4.8 s to load four real pages warm, driven through an open-source MCP server such as Microsoft’s Playwright MCP. Air-gapped, Chromium comes from your own package mirror."
            />
          </div>
          <RTable
            className="cmp-gap"
            head={['Browser', 'AgentCore Browser', 'Your own browser in a Fleet VM']}
            rows={[
              ['Price', '$0.0895 per vCPU-hour + $0.00945 per GB-hour while a session runs. For 200 people browsing 1 h a working day (2 vCPU busy 30%, 4 GB): ~$400 a month, ~€4.4k a year.', 'No extra charge: it runs in the VM the person already has, on the servers already counted.'],
              ['Proxies', 'AWS supplies none — residential or otherwise. You bring your own HTTP/HTTPS proxy; its credentials sit in AWS Secrets Manager.', 'The same: Chromium uses whatever proxy you configure, and Fleet’s egress rules decide what it may reach. Air-gapped, it reaches only internal sites.'],
              ['Recording and live view', 'Session recording and replay to S3; a live view where a person can take over (e.g. to solve a CAPTCHA); Web Bot Auth to identify the agent to sites.', 'Playwright’s own traces and video recording (open source). No live take-over view and no Web Bot Auth.'],
              ['Where it runs', 'In AWS', 'Inside your network, in the person’s or app’s own VM'],
            ]}
          />
          <p className="cmp-note">
            AgentCore&rsquo;s $7 per 1,000 queries is its separate Web Search tool, not the
            browser; the browser has no per-request charge. The heavy-use bill below includes
            Web Search but not Browser.
          </p>
        </Section>

        {/* ── Extensions and the UI ──────────────────────── */}
        <Section
          id="extensions"
          label="Extensions"
          title="Extensions and the UI"
          sub="AgentCore is a back end: you build the agent and the app your people use. igni ships the app, and lets your own systems plug into it."
        >
          <Figure
            title="How an extension connects your system to the agent and the app"
            after="AgentCore’s equivalent stops at the tool: Gateway turns your APIs into MCP tools, and any screen people see is yours to build."
          >
            <ExtensionFlow />
          </Figure>
          <Figure
            title="What it looks like in the igni app"
            caption={<>Screenshots of the real igni web client. The claims and the &ldquo;Claims desk&rdquo; extension are example data: first igni on its own, then with the extension installed.</>}
          >
            <ShotTabs
              label="Screens"
              shots={[
              {
                id: 'plain',
                tab: 'Plain igni',
                light: claimsPlainLight,
                dark: claimsPlainDark,
                alt: 'Plain igni, no extensions: a chat where the agent reads the claim report and photo from the shared folder and lists what is missing from the file.',
                caption: (
                  <>
                <b>Plain igni, no extensions.</b> The same claims team using igni as it ships:
                the agent reads the claim report and the photo from the team&rsquo;s folder,
                summarises what happened and the cover, and lists what is missing from the file.
                Tools, files and the model picker (<code>igni 1.0 4b</code>) are igni&rsquo;s own.
                  </>
                ),
              },
              {
                id: 'page',
                tab: 'An extension’s page',
                light: claimsAppLight,
                dark: claimsAppDark,
                alt: 'The Claims desk extension page inside the igni app: a table of open claims with statuses and assignees, and a detail panel with the agent summary, the missing documents and a drafted reply.',
                caption: (
                  <>
                <b>An extension&rsquo;s page.</b> Claims desk sits in igni&rsquo;s sidebar with a
                count of claims waiting. Its page lists the open claims and, for the selected
                one, the agent&rsquo;s summary, the missing documents and a drafted reply.
                  </>
                ),
              },
              {
                id: 'chat',
                tab: 'In the chat',
                light: claimsChatLight,
                dark: claimsChatDark,
                alt: 'A chat in igni where the Claims desk service reports a new claim, the agent calls the claims tool, and a claim card with an Assign button appears; a status chip reads Claims: 4 open.',
                caption: (
                  <>
                <b>The extension in the chat.</b> The claims system messages the agent
                (&ldquo;from Claims desk&rdquo;), the agent calls the extension&rsquo;s tool
                (<code>claims_get_claim</code>), and the extension adds a card with an action.
                The status chip at the bottom (&ldquo;Claims: 4 open&rdquo;) is the
                extension&rsquo;s too.
                  </>
                ),
              },
              ]}
            />
          </Figure>
          <div className="cmp-grid cmp-grid--2">
            <div className="lp-sec-card cmp-card">
              <h4>What an extension is</h4>
              <p>
                A capability with a service behind it — your claims system, a document store, a
                risk engine. It arrives either as a signed image that runs beside the agent, or
                as an endpoint your team runs inside your network. Tools reach the agent over
                MCP; everything else is defined by igni&rsquo;s extension contract.
              </p>
              <p>
                CodeIndex and Artifacts are themselves extensions.{' '}
                <a href="/docs/building-extensions">Building extensions</a> walks through the
                whole loop: a service, its extension and a page.
              </p>
            </div>
            <div className="lp-sec-card cmp-card">
              <h4>What it can add, beyond tools</h4>
              <ul>
                <li><b>Pages:</b> its own screen inside the igni app, in a sandboxed frame.</li>
                <li><b>Cards and messages</b> in the chat, labelled with who sent them.</li>
                <li><b>Slash commands, menu entries and status chips</b> in igni&rsquo;s own chrome.</li>
                <li><b>Settings</b>, rendered on igni&rsquo;s Extensions page for an administrator.</li>
                <li><b>Prompts:</b> replace or edit the agent&rsquo;s prompts, so it works your way.</li>
                <li><b>Access to igni itself</b> — sessions, chat, models — granted object by object.</li>
              </ul>
            </div>
            <div className="lp-sec-card cmp-card">
              <h4>How your systems talk to the agent</h4>
              <p>
                With igni&rsquo;s service SDK, your service knows which person is calling, can
                send a message straight into a person&rsquo;s chat (with files, in a named
                thread), start a chat, or send an event only its extension sees. It can notify
                people, look them up in the directory, and answer igni&rsquo;s erase and export
                requests, so your data follows the same retention as igni&rsquo;s.
              </p>
            </div>
            <div className="lp-sec-card cmp-card">
              <h4>How it is kept safe</h4>
              <ul>
                <li>Bundles are signed by the approved service and verified before they load.</li>
                <li>Each extension&rsquo;s process runs in an OS sandbox that enforces exactly the permissions it declared.</li>
                <li>Its page runs in a sandboxed frame and calls only what it was granted.</li>
                <li>A repository runs no code until the person trusts it.</li>
                <li>Collisions between extensions are settled by an administrator&rsquo;s priority order.</li>
              </ul>
            </div>
          </div>
          <RTable
            className="cmp-gap"
            head={['Status', 'What']}
            rows={[
              [<Pill tone="good">Built</Pill>, 'Manifest and validation, signed distribution, prompt contributions, the sandboxed page and its bridge, extension pages in the web client, the OS sandbox, the service SDK’s agent messaging.'],
              [<Pill tone="warn">Not yet</Pill>, 'Installing and supervising a sidecar image automatically; extension pages on a shared, multi-person back end (pages are served to one person’s own app); an extension on a shared back end knowing which person is calling.'],
            ]}
          />
          <div className="cmp-grid cmp-grid--2 cmp-gap">
            <div className="lp-sec-card cmp-card cmp-card--aws">
              <h4>AgentCore&rsquo;s UI</h4>
              <p>
                The AWS console has a playground to chat with an agent while you build it, a
                local inspector in the browser, and observability dashboards. These are builder
                tools. There is no end-user app and no way to add your system&rsquo;s screens to
                one: you build the front end, typically from AWS samples.
              </p>
            </div>
            <div className="lp-sec-card cmp-card cmp-card--igni">
              <h4>igni&rsquo;s UI</h4>
              <p>
                The desktop app and web client are what people use every day: chat, plans,
                files, and every installed extension&rsquo;s pages, commands and cards. The CLI
                covers the terminal. The server&rsquo;s portal is for administrators:
                organisations, roles, services and erasures.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Models and GPU capacity ────────────────────── */}
        <Section
          id="models"
          band
          label="Models"
          title="Models and GPU capacity"
          sub="igni is not tied to one model. Run igni’s own models on your GPUs, any open-weight model you serve, or — where your policy allows — the hosted APIs you already approve."
        >
          <div className="cmp-grid cmp-grid--3">
            <div className="lp-sec-card cmp-card">
              <span className="cmp-card-label">igni&rsquo;s own models</span>
              <h4>igni 1.0 · 4B and 27B</h4>
              <p>
                Apache-2.0, on your GPUs. The 4B is tuned from Qwen3.5-4B and also runs on a
                laptop. The 27B is tuned from Qwen3.8-27B, the strongest model you can actually
                self-host in our tests. The Factory tunes either to your domain.
              </p>
            </div>
            <div className="lp-sec-card cmp-card">
              <span className="cmp-card-label">Any open-weight model</span>
              <h4>Served by you</h4>
              <p>
                Anything behind an OpenAI-compatible server — vLLM, Ollama and the like. Models
                are configured per deployment, so you can run your approved model beside
                igni&rsquo;s own.
              </p>
            </div>
            <div className="lp-sec-card cmp-card">
              <span className="cmp-card-label">Hosted APIs, where allowed</span>
              <h4>OpenAI-like, Anthropic-like, Gemini</h4>
              <p>
                Any OpenAI-compatible API (OpenAI, Mistral, Groq, OpenRouter, MiniMax…),
                Anthropic&rsquo;s Claude, and Google Gemini. Not used in an air-gapped install;
                useful in the private-cloud tier or for a team that is allowed frontier models.
              </p>
            </div>
          </div>
          <Figure
            title="What one GH200 carries with the 27B"
            caption="Our sizing. A person’s agent works hard for about a minute, then waits about three while the person reads, thinks or types. Those bursts overlap, so 200 people can work at the same time while only ~60 requests are being generated at any moment, each with 25–100k tokens of context."
          >
            <GpuCapacity />
          </Figure>
          <div className="cmp-grid cmp-grid--2">
            <div className="lp-sec-card cmp-card">
              <h4>Why subagents scale well</h4>
              <p>
                When the agent fans out into many subagents, each one works on a short, separate
                context and shares the same system-prompt prefix, which is cached once. So
                subagents add GPU compute, not memory, and many run side by side in one batch —
                the GPU is used better, not filled up.
              </p>
            </div>
            <div className="lp-sec-card cmp-card">
              <h4>Against AgentCore</h4>
              <p>
                On AgentCore every token of every subagent is billed. On igni the GPU is already
                paid for: more subagents use spare compute at no extra cost until the GPU is
                busy, and then the answer is another GPU, not a bigger monthly bill.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Cost ───────────────────────────────────────── */}
        <Section
          id="cost"
          label="Cost"
          title="Cost for 200 people, per year"
          sub="The same heavy-use workload both sides: 200 people, agent working 8 hours a day, 22 days a month, 5 M tokens a person a day. All figures in euros at €1 = $1.10. Only what each needs to run: AgentCore’s services and tokens; igni’s licence, servers and GPU. Staff and development are left out on both sides."
        >
          <Figure
            title="Annual cost, side by side"
            after="AgentCore ranges run from committed rates with a 10% enterprise discount to list price. Bars are scaled to the upper figure."
          >
            <CostBars />
          </Figure>

          <div className="cmp-grid cmp-grid--2 cmp-cost-tables">
            <figure className="cmp-panel cmp-panel--table">
              <h4>AgentCore, per year at list</h4>
              <p className="cmp-cap">
                Every line is for all 200 people working at the same time, each in their own
                session. AgentCore bills CPU only while it computes, not while the agent waits
                for the model.
              </p>
              <RTable
                className="cmp-numeric"
                head={['Line', '€ / year']}
                num={[1]}
                total={[8, 11, 12]}
                rows={[
                  ['Runtime CPU: 200 sessions at once, each 2 vCPU for 8 h, billed while busy (30%)', '29.4k'],
                  ['Runtime memory: each session 4 GB, billed while held (half the session)', '13.0k'],
                  ['Code Interpreter: 1 h a person a day', '4.4k'],
                  ['Rebuilding workspaces (only beyond session storage or after a redeploy)', '3.1k'],
                  ['Memory: long-term records + retrieval', '9.4k'],
                  ['Web search: 10 a person a day', '3.4k'],
                  ['PrivateLink + NAT', '2.5k'],
                  ['Gateway, Policy, Observability, S3, KMS, short-term memory', '1.3k'],
                  ['AgentCore without the model', '66.5k'],
                  ['+ Open-weight model tokens (Qwen3 32B)', '40.3k'],
                  ['or + Claude Sonnet tokens (incl. cache writes)', '345.8k'],
                  ['Total at list, open-weight / Sonnet', '107k / 413k'],
                  ['Total, committed + 10% discount, open-weight / Sonnet', '88k / 363k'],
                ]}
              />
              <p className="cmp-cap cmp-cap--after">
                Priced at us-east-1 list in dollars, converted at €1 = $1.10. In the EU,
                platform V2 (priced here) is offered only in Ireland; Frankfurt runs V1. Left
                out: AWS support plans, Evaluations, and internet egress.
              </p>
            </figure>
            <figure className="cmp-panel cmp-panel--table">
              <h4>igni + Fleet, per year</h4>
              <RTable
                className="cmp-numeric"
                head={['Line', '€ / year']}
                num={[1]}
                total={[3, 5]}
                rows={[
                  ['Harness, server, igni models (Apache-2.0)', '0'],
                  ['Fleet licence at 200 people (includes 200 apps), graduated per seat', k(FLEET_200)],
                  ['CPU servers: 2, bought (Dell R7625, 2 × EPYC 9474F, 256 GB), over 4 years, + power and support. No spare: 200 agents fill about 97% of their usable RAM, so a lost server leaves too little room until it is back', '13–15k'],
                  ['Runtime, comparable to AgentCore’s', '37–39k'],
                  ['GPU: 1 × GH200, bought, over 4 years, + power and support', '14–18k'],
                  ['Total with the model', '51–57k'],
                  [<><em>Optional:</em> the Factory — tunes igni&rsquo;s models on your own data, guided by its experts, with evaluation; any number of domain models. Training runs on your own GPU (a 27B tuning run measured at ~44 h on one H100).</>, `+${k(FACTORY_PER_YEAR)}`],
                  [<><em>Optional, with the Factory:</em> Autopilot — improves the Factory&rsquo;s models from real users&rsquo; conversations, with no one in the loop. At 200 people.</>, `+${k(AUTOPILOT_200)}`],
                ]}
              />
              <p className="cmp-cap cmp-cap--after">
                Hardware is shown bought. Renting instead is one of the options below — you pick
                one. One GH200 carries the 200 people; a second, for GPU failover, is optional
                (+€14–18k).
              </p>
            </figure>
          </div>

          <h4 className="lp-subhead">igni&rsquo;s hardware: pick one option</h4>
          <p className="landing-section-desc lp-desc cmp-desc">igni needs two CPU servers and one GPU; choose one way to get them.</p>
          <RTable
            head={['Option', 'CPU servers (2)', 'GPU (1)', 'Total with the Fleet licence']}
            num={[3]}
            rows={[
              [<><b>Buy</b> (base case)</>, 'Dell R7625 (2 × EPYC 9474F, 256 GB), over 4 years + power and support: €13–15k', 'GH200, over 4 years + power and support: €14–18k', <b>€51–57k</b>],
              [<b>Rent</b>, 'Hetzner AX162 (48 cores, 128 GB; more RAM extra), €614 a month each: ~€15k', 'GH200 at Lambda Labs, $2.29 an hour: ~€18k', '~€57k'],
              [<b>Rent from AWS</b>, 'm7i.metal-24xl (96 vCPU, 384 GB), $4.84 an hour each, on-demand: ~€77k', 'No GH200 on EC2; H100 80 GB (p5.4xlarge), $6.88 an hour: ~€55k', '~€156k'],
            ]}
          />
          <p className="cmp-note">
            Buying and renting come to about the same. Renting from AWS on-demand costs about
            three times as much and makes igni dearer than AgentCore with an open-weight model;
            Savings Plans narrow that, and an H100 holds fewer long contexts than a GH200. In
            regulated sectors, renting hardware counts as outsourcing; use a provider you
            already have approved.
          </p>

          <Figure
            title="What each bill is made of"
            caption="Open-weight model, heavy use, € a year at the middle of each range. AgentCore at list price. The model is AgentCore’s biggest line and grows with use; igni’s GPUs do not."
          >
            <Breakdown />
          </Figure>

          <h4 className="lp-subhead">If the team is a different size</h4>
          <p className="landing-section-desc lp-desc cmp-desc">
            The same heavy per-person workload at different team sizes &mdash; and it is not
            only people: the app agents a Fleet licence includes and the parallel subagent runs an
            agent spawns load the same GPUs too. AgentCore bills every session, token and busy
            vCPU; igni&rsquo;s figure &mdash; the graduated Fleet licence plus the hardware the
            load takes &mdash; rises gently per seat, reaching its €128k ceiling at 3,000
            people and flat above that: past 3,000 only the hardware grows, never the licence
            and never a token. Open-weight model, € a year; figures above 1,000 people are
            modelled. The chart zooms into 50&ndash;600; the table runs to 5,000.
          </p>
          <RTable
            className="cmp-numeric cmp-usage"
            head={['People (at the heavy per-person rate)', 'AgentCore, list', 'igni + Fleet, licence included']}
            num={[1, 2]}
            rows={USAGE.map((u) => [`${u.people.toLocaleString('en-US')}`, `~${u.aws.toLocaleString('en-US')}k`, <>{u.igni[0].toLocaleString('en-US')}–{u.igni[1].toLocaleString('en-US')}k<span className="cmp-cell-sub">{u.hw}</span></>])}
          />
          <Figure
            title="Cost as the team grows"
            caption="€ a year, open-weight model, 50 to 600 people at the heavy per-person rate — with the apps and parallel runs that load the same GPUs (the table above runs to 5,000). AgentCore rises with every person; igni rises gently with its per-seat licence to a €128k ceiling at 3,000 people, flat above that, with only the hardware growing."
          >
            <UsageChart />
          </Figure>
          <p className="cmp-note">
            Below about 70 people AgentCore is cheaper; above it igni costs less, and the gap
            widens with scale &mdash; more than twice as cheap at 600 people, and more than three
            times at 5,000 (table above) &mdash; because
            AgentCore&rsquo;s bill grows with every person, app and parallel run, while
            igni&rsquo;s per-seat licence rises gently to its €128k ceiling at 3,000 and is flat
            above it, so past 3,000 only a GPU or server is ever added. igni can also
            use Claude or GPT through their APIs where policy allows; the token bill is then the
            same as on AgentCore, and igni&rsquo;s fixed licence replaces AgentCore&rsquo;s
            runtime charges.
          </p>

          <h4 className="lp-subhead" id="own-gpu">&ldquo;What if we run the model on our own GPU and keep AgentCore?&rdquo;</h4>
          <p className="landing-section-desc lp-desc cmp-desc">
            Two ways to do it. In both, AgentCore&rsquo;s runtime and services stay on the bill,
            and they alone cost about as much as igni with its GPU.
          </p>
          <RTable
            head={['Set-up, 200 people, € a year', 'AgentCore part', 'Model / GPU', 'Total', 'Where the data lives']}
            num={[1, 2, 3]}
            total={[2]}
            rows={[
              ['AgentCore + its own GPU in AWS (1 × H100 80 GB, p5.4xlarge; no GH200 is offered on EC2)', '52–67k', '~55k on-demand', '107–122k', 'All in AWS'],
              ['AgentCore + a GH200 in your own data centre', '52–67k', '14–18k + the network link', '66–85k', 'Agent, files, memory and prompts in AWS; only inference at home'],
              ['igni + Fleet + one GH200', '—', 'included', '51–57k', 'All inside your network'],
            ]}
          />
          <div className="cmp-grid cmp-grid--2 cmp-gap">
            <div className="lp-sec-card cmp-card">
              <h4>The arguments</h4>
              <ul>
                <li><b>AgentCore without any model already costs €52–67k</b> a year for 200 people — as much as igni with the GPU included.</li>
                <li><b>Moving the GPU home does not move the data home.</b> The agent&rsquo;s context, files, memory and every prompt still pass through AWS; only the token generation leaves. If your data cannot go to a public cloud, nothing is solved.</li>
                <li><b>No GH200 in AWS.</b> The nearest is a single H100 with 80 GB and no large CPU memory beside it, so the cache cannot spill into RAM the way it does on a GH200.</li>
              </ul>
            </div>
            <div className="lp-sec-card cmp-card">
              <h4>What you get only with igni</h4>
              <ul>
                <li><b>Tuned models, not stock ones.</b> igni 1.0 4B passed {FACTORY_EVAL.tuned} of {FACTORY_EVAL.total} of our agent scenarios against {FACTORY_EVAL.base} for the Qwen model it was tuned from; the Factory tunes to your own domain.</li>
                <li><b>The serving set-up that makes one GH200 carry 200 people:</b> FP8, shared-prefix caching, and the cache tiered across GPU memory, RAM and SSD.</li>
                <li><b>The rest of the stack:</b> the app people use, extensions, persistent workspaces and audited erasure — none of which AgentCore provides.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── Cost by usage ──────────────────────────────── */}
        <Section
          id="cost-usage"
          band
          label="Cost by usage"
          title="Cost by usage, per year"
          sub="The 200-person case prices people. This prices use: how many agent sessions run, and how much of every 15 minutes each spends working. AgentCore bills each second an agent computes or holds memory; igni costs the Fleet licence plus the servers that hold what is working at once. Both in euros, AgentCore at €1 = $1.10 as above. Model tokens are left out on both sides."
        >
          <Figure
            title="Three worked cases"
            caption={<>{WORKED_BASE.sessions.toLocaleString('en-US')} sessions, each {WORKED_BASE.vcpu} vCPU busy {Math.round(WORKED_BASE.busy * 100)}% while working and holding {WORKED_BASE.memGb} GB, running around the clock. Only the work in each 15 minutes changes. AgentCore at list; igni with the licence and the servers bought.</>}
            after={<>The share of AgentCore&rsquo;s bill paid while the agent waits falls as it works more: at one minute in fifteen nearly half of it is memory held while idle. igni&rsquo;s licence is fixed; its servers grow with what works at once.</>}
          >
            <RTable
              className="cmp-worked"
              head={['The agent works', 'AgentCore, € a year', 'of it while idle', 'igni + Fleet, € a year', 'Servers (incl. 1 spare)']}
              num={[1, 2, 3, 4]}
              rows={WORKED.map((w) => {
                const inp = { ...WORKED_BASE, workS: w.workS }
                const a = agentCoreYear(inp)
                const f = fleetYear(inp)
                return [
                  <>{w.label}<span className="cmp-cell-sub">{duration(w.workS)} of every 15 min</span></>,
                  eurShort(a.total),
                  `${eurShort(a.memIdle)} (${Math.round(a.idleShare * 100)}%)`,
                  <>{eurRangeShort(f.total)}<span className="cmp-cell-sub">{eurShort(f.licence)} licence + {eurRangeShort(f.serverCost)} servers</span></>,
                  `${f.servers}`,
                ]
              })}
            />
          </Figure>

          <h4 className="lp-subhead">Work it out for your own load</h4>
          <p className="landing-section-desc lp-desc cmp-desc">
            Move the sliders, or start from a worked case. Both sides are worked out from the
            same inputs with the formulas below.
          </p>
          <UsageCalculator />

          <div className="cmp-grid cmp-grid--2 cmp-gap">
            <div className="lp-sec-card cmp-card cmp-card--aws">
              <h4>How AgentCore is priced here</h4>
              <ul>
                <li>Runtime v2 at us-east-1 list, checked {USAGE_CHECKED}: <b>${AC_RUNTIME.vcpuHour} a vCPU-hour</b> and <b>${AC_RUNTIME.gbHour} a GB-hour</b>, billed per second, converted at €1 = ${USD_PER_EUR.toFixed(2)}.</li>
                <li>CPU is not billed while the agent waits. Each 15 minutes: CPU = W × C × B vCPU-seconds.</li>
                <li>Memory: M GB while working; while idle, M GB for up to {AC_RUNTIME.reclaimS} s until it is reclaimed, then the 128 MB minimum for the rest of the 15 minutes.</li>
                <li>A session ends after {AC_RUNTIME.maxLifetimeH} hours at most (maxLifetime): a busy agent is restarted, with a ~2 s cold start, and loses what it held in memory.</li>
                <li>Working hours: only those hours are billed. Overnight the idle timeout ({AC_RUNTIME.idleTimeoutS / 60} min by default) ends the session, so each morning starts cold.</li>
              </ul>
            </div>
            <div className="lp-sec-card cmp-card cmp-card--igni">
              <h4>How Fleet is sized here</h4>
              <ul>
                <li>Licence: the graduated <a href="/#pricing">price list</a> at N people. App agents count separately, up to as many as there are people, so N can be fewer people plus their apps.</li>
                <li>Working at once: A = N × W / 900, assuming the work is spread evenly. RAM = A × M + (N − A) × {PAUSED_GB} GB for each paused agent (measured). Busy threads = A × C × B.</li>
                <li>Servers: {SERVER.name}, {SERVER.cpus} ({SERVER.cores} cores, {SERVER.threads} threads), {SERVER.ramGb} GB. Sizing uses {Math.round(HEADROOM.ram * 100)}% of its RAM and {Math.round(HEADROOM.threads * 100)}% of its threads; the count is whichever needs more, plus 1 spare.</li>
                <li>Servers are bought, at £{SERVER.priceGbp.toLocaleString('en-US')} each (≈{eurShort(SERVER_EUR)} at £1 = €{EUR_PER_GBP.toFixed(2)}), paid up front. Each costs €{SERVER.perYear[0] / 1000}–{SERVER.perYear[1] / 1000}k a year: the price spread over {SERVER.years} years plus power and support, as in the 200-person case. So 3 servers are ≈{eurShort(3 * SERVER_EUR)} to buy and €{(3 * SERVER.perYear[0]) / 1000}–{(3 * SERVER.perYear[1]) / 1000}k a year. Servers are bought for the working peak, so working hours cost the same.</li>
              </ul>
            </div>
          </div>

          <p className="cmp-note">
            <b>Measured so far:</b> up to 400 agents on one server (c3-highcpu-192-metal, 192
            vCPU, 512 GiB). 1,000 agents, and hundreds working at once, have not been measured;
            the sizing here is arithmetic from measured per-agent figures, not a benchmark. The
            one-minute case puts 500 agents on each working server, more than were measured.
          </p>
          <p className="cmp-note">
            <b>Bursts:</b> if every agent works at the same moment, Fleet needs servers for that
            peak, while AgentCore charges the same per second whenever the work happens.
          </p>
        </Section>

        {/* ── Speed ──────────────────────────────────────── */}
        <Section
          id="speed"
          label="Speed"
          title="Speed"
          sub={<>Fleet figures are measured through the real gateway with the real igni image, p50, on a bare-metal GCP server (C3) with 100–300 agents; the figures for an app first used days later on a nested-virtualisation GCP VM. Details are on the <a href="/fleet">Fleet page</a>.</>}
        >
          <RTable
            head={['Moment', 'AgentCore', 'Fleet (measured)']}
            rows={[
              ['Agent picks up where it left off', 'Within the idle timeout (15 min by default, up to 8 h): the same VM, warm. After it: a new VM, ~2 s cold start (P75, AWS’s figure), then session storage restored — or a full rebuild if it is off, after a redeploy or after 14 idle days', <><b>~27–33 ms</b> from paused, back within 10 minutes; ~36–40 ms after a longer idle; ~142–148 ms from a snapshot; ~135–141 ms cold</>],
              ['While the agent is idle', 'No CPU charge; memory is reclaimed after 120 s down to a 128 MB floor, which is billed until the idle timeout ends the session. A longer timeout keeps it warm for longer at that cost.', 'Paused, holding ~200 MiB on your server; its files are on shared storage, so they survive a node failure. No extra charge — the licence is fixed.'],
              ['New app created', 'New session each time', '~30 ms (started and paused when the app is created); ~0.2–0.4 s if first used days later, restored from your object store'],
              ['After a discard or reset', 'n/a', '~30 ms / ~0.2–0.4 s days later — a fresh disk is prepared in the background'],
              ['Upgrades', 'A redeploy wipes session storage', 'An image upgrade restarts each session once; files persist'],
            ]}
          />
          <Figure
            title="How long a person waits for their agent after it has been idle"
            caption="To scale. Fleet: measured p50, first answer from igni through the real gateway, bare-metal GCP server, 100–300 agents; a person’s first VM is prepared ahead of time, so nobody waits for it. AgentCore: AWS’s published P75 cold start for runtime V2, once the idle timeout (15 min by default) has ended the session; inside the timeout the VM is still warm, and AWS publishes no figure for that."
          >
            <WakeChart />
          </Figure>
        </Section>

        {/* ── Security ───────────────────────────────────── */}
        <Section id="security" band label="Security" title="Security and where data lives">
          <div className="cmp-grid cmp-grid--2">
            <div className="lp-sec-card cmp-card cmp-card--aws">
              <h4>AgentCore</h4>
              <ul>
                <li>Using it is outsourcing to AWS: in regulated sectors that means a supplier register entry, a risk assessment and an exit plan.</li>
                <li>EU regions include Frankfurt and Ireland; runtime V2 is in Ireland only, web search is not in Frankfurt, and AgentCore is not on the European Sovereign Cloud&rsquo;s service list.</li>
                <li>Session VMs are isolated and discarded; long-lived data in S3, Memory and session storage, encrypted with KMS.</li>
                <li>Covered by AWS&rsquo;s audited certifications (SOC 2, ISO 27001 family) — a real advantage with auditors.</li>
              </ul>
            </div>
            <div className="lp-sec-card cmp-card cmp-card--igni">
              <h4>igni + Fleet</h4>
              <ul>
                <li>Self-hosted: runs on your own servers, in your own country, so data never leaves its jurisdiction. With <code>air_gapped = true</code> (one setting) nothing calls out; the licence is checked offline.</li>
                <li>Disks (dm-crypt) and memory snapshots (fscrypt) are encrypted under per-person keys wrapped by your own Vault / OpenBao; igni never holds a key.</li>
                <li>Harness, server and models are open source; Fleet, CodeIndex and Artifacts are closed.</li>
                <li>EU-owned. <b>Software you run, not a service we host</b> — like PostgreSQL, it holds no service certificate; it sits inside your own certified estate. Assessed as a product under the EU Cyber Resilience Act: SBOMs and vulnerability scanning today, signed images and build provenance in build. ISO 27001 for the build and release process is planned. No independent penetration test yet.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── Erasure ────────────────────────────────────── */}
        <Section id="erasure" label="Erasure" title="What erasure covers">
          <Figure
            title="What happens on a discard in Fleet"
            after="AgentCore discards the VM; Memory, S3, CloudWatch and session storage are deleted service by service, by you."
          >
            <ErasureSteps />
          </Figure>
          <RTable
            head={['Status', 'What']}
            rows={[
              [<Pill tone="good">Done</Pill>, 'Fleet volume, VM state, replicas, offloaded objects and the keys; the server’s records for the person.'],
              [<Pill tone="warn">Not yet</Pill>, 'The workspace volume is not yet included in a removed member’s data export.'],
              [<Pill tone="warn">Your policy</Pill>, 'Inference logs, search indexes and backups follow your retention policy; key-service backups must follow the same retention.'],
            ]}
          />
        </Section>

        {/* ── Where AgentCore is ahead ───────────────────── */}
        <Section id="aws-wins" band label="Honestly" title="Where AgentCore is ahead">
          <RTable
            head={['Area', 'Gap', 'How igni addresses it']}
            rows={[
              ['Certification', 'AWS’s hosted service is certified (SOC 2, ISO 27001). igni holds no certificate.', 'igni hosts nothing, so there is no service to certify: it runs inside your own certified estate and your certificates cover it, as they do PostgreSQL. It is assessed as a product, under the EU Cyber Resilience Act. Available today: SBOM, vulnerability scanning, network diagram, exit runbook, self-assessment and policies. In build: signed images and build provenance. Planned: ISO 27001 for the build and release process.'],
              ['Managed high availability', 'AWS runs multi-zone for you.', 'If a node fails, Fleet brings its agents back on another node with the same files once the shared storage releases the dead node’s lock. On bare metal with GCP Filestore that took 97–100 s, set by Filestore’s ~90 s lock lease; the agents started fresh from their files, since memory snapshots were not replicated. With replicas, an agent resumes where it left off in ~0.5 s after the lock lapses (nested VMs, NFS).'],
              ['Support', 'AWS 24/7 with SLAs.', 'Your integrator gives 24/7 first- and second-line support; Ignite Ember gives third-line in business hours, Sev 1 within 4 business hours.'],
              ['Exit & continuity', 'AWS is large and stable.', 'A lapsed licence keeps running 90 days, then goes read-only — never a hard stop. Models don’t expire. Source escrow is being set up (no agreement signed yet).'],
              ['Packaging', 'A managed service, ready now.', 'Fleet is not yet in the offline bundle; first deployments are co-delivered.'],
              ['Breadth', 'A managed browser; a managed converter from REST APIs to MCP tools; tool search.', 'Both come from open source, run in your network: a browser added to a VM profile (Chromium + Playwright MCP), and REST APIs converted with FastMCP.'],
              ['Time to first agent', 'Days with an existing AWS landing zone; weeks to months otherwise.', 'GPU lead time (often months), then an integrator install of ~2–4 weeks; the desktop app and CLI work on day one with the 4B on a laptop, or with any API model your policy allows.'],
              ['Proven density', 'AWS sizes it for you.', 'Fleet’s people-per-server figure is a sizing assumption, not yet measured.'],
            ]}
          />
        </Section>

        {/* ── Which to choose ────────────────────────────── */}
        <Section id="choose" label="Choosing" title="Which to choose">
          <div className="cmp-grid cmp-grid--2">
            <div className="lp-sec-card cmp-card cmp-card--aws">
              <h4>Choose AgentCore when…</h4>
              <ul>
                <li>The organisation is already on AWS and the data is approved for it.</li>
                <li>Agent state fits per-session storage or shared EFS, and a 14-day idle reset and a wipe on redeploy are acceptable.</li>
                <li>You want a managed service more than a fixed bill.</li>
                <li>Usage will be light or uncertain at first.</li>
                <li>You need certifications today and have engineers to build the agent.</li>
              </ul>
            </div>
            <div className="lp-sec-card cmp-card cmp-card--igni">
              <h4>Choose igni + Fleet when…</h4>
              <ul>
                <li>Data, models and keys must stay on-premises or in an air-gapped network.</li>
                <li>Agents are long-lived colleagues that keep large workspaces between days and through upgrades.</li>
                <li>Finance wants a fixed annual cost that does not grow with token use.</li>
                <li>You want an exit plan you control: an Apache-2.0 core, no state outside your network, no hard stop on lapse.</li>
              </ul>
            </div>
          </div>
          <p className="cmp-inshort">
            <b>In short:</b> where agents work on code, customer data and internal documents
            that cannot go to a public cloud, igni + Fleet is the option that keeps the whole
            stack inside your network. For an organisation already on AWS with data approved
            for it, igni still costs less once usage is above about half of the heavy case; the
            choice is between a managed service with certifications today and a fixed-price,
            in-house platform with larger persistent workspaces.
          </p>
        </Section>

        {/* ── Assumptions and sources ────────────────────── */}
        <Section id="sources" band label="Sources" title="Assumptions and sources">
          <ul className="cmp-sources">
            <li>Written {WRITTEN}. AWS facts and list prices checked against AWS documentation on {AWS_CHECKED}. Usage figures are the assumptions below. €1 = $1.10 assumed throughout, except in the cost-by-usage section, which does not convert.</li>
            <li>AgentCore prices: aws.amazon.com/bedrock/agentcore/pricing, us-east-1 list, 1 Nov 2026. Runtime V2 $0.1276 / vCPU-hour and $0.0169 / GB-hour; committed $0.0997 and $0.0132. Committed figures also assume a 10% enterprise discount.</li>
            <li>AgentCore UI: the AgentCore console harness playground and observability (AWS blog, harness GA, 2026). igni extensions: igni&rsquo;s extension documentation (<a href="/docs/building-extensions">Building extensions</a>) and its example extensions, checked 2 Nov 2026.</li>
            <li>Own-GPU options: AWS p5.4xlarge (1 × H100 80 GB) at $6.88 an hour on-demand, run all year; GH200 not offered on EC2 as of Nov 2026. The AgentCore part is the bill above without model tokens (committed + 10% discount to list).</li>
            <li>Model tokens: Amazon Bedrock on-demand list prices, us-east-1. Open-weight case: Qwen3 32B at $0.15 / $0.60 per million input / output tokens — the same model family igni&rsquo;s own models are tuned from. With MiniMax M2 ($0.30 / $1.20) the open-weight case would be about €40k a year higher. Third-party listings give Bedrock&rsquo;s Qwen3 32B a 16k-token context window, below the 25–100k contexts assumed here; check the model card. Claude Sonnet at $3 / $15, cache reads $0.30.</li>
            <li>Web search: AgentCore Web Search announcement and pricing page ($7 per 1,000 queries); Brave Search API ($5 per 1,000) and Tavily ($5–8 per 1,000) list prices, Nov 2026; igni&rsquo;s built-in tool, from its open-source client.</li>
            <li>AgentCore Browser: list price as Code Interpreter; customer-provided proxies (AWS What&rsquo;s New, Feb 2026); session recording, live view and Web Bot Auth (AgentCore developer guide). Chromium in Fleet: igni&rsquo;s own measurement in a Fleet VM, Oct–Nov 2026.</li>
            <li>AgentCore features: AWS developer guide — runtime file system configurations, how Runtime works (platform versions by region), supported regions; checked 2 Nov 2026. Session storage is in preview.</li>
            <li>Heavy-use case, per person per working day, all 200 people: 8 h session of 2 vCPU / 4 GB, CPU busy 30%, memory held half the time; Code Interpreter 1 h (2 vCPU busy 30%, 4 GB held); 5 workspace rebuilds of 3 minutes; 300 tool calls; 30 long-term memory records, 100 retrievals; 10 web searches; 5 M input / 0.15 M output tokens. Sonnet includes cache writes.</li>
            <li>igni prices: igni&rsquo;s <a href="/#pricing">price list</a>, the graduated Fleet licence (€24k at 200 people), list, excl. VAT. Servers: Dell PowerEdge R7625 with 2 × AMD EPYC 9474F (96 cores, 192 threads), 256 GB DDR5 and 2 × 3.84 TB NVMe, at £17,950 each ex VAT from a UK reseller (shop.bytestock.com listing, checked 7 Nov 2026). GPU ownership at ≈$15–20k a GPU-year is an estimate; get a quote.</li>
            <li>Staff and development are not included on either side.</li>
            <li>Cost by usage, AgentCore: aws.amazon.com/bedrock/agentcore/pricing, runtime v2, us-east-1 list, checked {USAGE_CHECKED}: $0.1276 / vCPU-hour and $0.0169 / GB-hour, billed per second; CPU scales to zero during I/O wait; idle memory reclaimed after 120 s; 128 MB minimum memory billed. Session lifetime: AgentCore Control API reference, LifecycleConfiguration — maxLifetime 28,800 s (8 h) by default and at most; idleRuntimeSessionTimeout 900 s by default.</li>
            <li>Cost by usage, Fleet sizing: igni&rsquo;s own measurements in the Fleet repository&rsquo;s results log, &ldquo;End to end on bare metal: 400 real producers&rdquo; (31 Oct 2026) and &ldquo;Step 6 again on bare metal&rdquo; (5 Nov 2026), on c3-highcpu-192-metal: up to 400 agents on one server; a paused agent held 190–240 MiB of host RAM ({PAUSED_GB} GB used here, the median). The servers and their yearly cost are the R7625 line above.</li>
            <li>AgentCore cold start and idle behaviour: AWS blog &ldquo;The new AgentCore runtime: elastic, optimized, and consistently fast starts&rdquo; and the runtime lifecycle settings page, checked 7 Nov 2026.</li>
            <li>Fleet timings: igni&rsquo;s own measurements, bare-metal GCP server (c3-highcpu-192-metal) and nested GCP VM (n2-standard-8), Oct–Nov 2026; wake times from the Fleet repository&rsquo;s results log, &ldquo;Step 6 a third time on bare metal&rdquo; (6 Nov 2026); details are on the <a href="/fleet">Fleet page</a>. Security tests ran on cloud test VMs with OpenBao in dev mode and a test object store; a pilot repeats them on your hardware.</li>
            <li>GPU sizing: one GH200 for ~200 people with the 27B, assuming each agent works hard for ~1 minute then idles ~3; ~60 requests generating at once with 25–100k tokens of context; FP8 weights; KV cache tiered across GPU memory, CPU RAM and SSD. Our calculation; a pilot load test confirms it on your hardware. How igni routes to inference nodes: <a href="/docs/inference-backends">Inference backends</a>.</li>
            <li>Model providers: igni&rsquo;s client configuration — OpenAI-compatible, native Anthropic (Messages API, prompt caching, extended thinking) and Gemini — checked 2 Nov 2026.</li>
          </ul>
        </Section>

      <div className="lp-band">
        <section className="landing-section lp-center cmp-close">
          <p className="lp-note">
            <strong>Estimates, not a quote.</strong> List prices in EUR per year, excluding
            VAT; your integrator quotes the final price. No licence fee is due until a pilot
            meets the criteria you agree. <a href="/#pricing">See the price list</a> or read{' '}
            <a href="/#start">how you buy</a>.
          </p>
          <div className="lp-hero-cta">
            <a href={CALENDLY_URL} className="landing-btn-primary" target="_blank" rel="noopener noreferrer">
              Schedule a call
            </a>
            <a href={mailto('igni + Fleet vs AgentCore')} className="landing-btn-secondary" title={CONTACT_EMAIL}>
              <MailIcon size={16} /> Email us
            </a>
            <a href="/docs/fleet" className="landing-btn-secondary">
              Read the Fleet docs
            </a>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  )
}
