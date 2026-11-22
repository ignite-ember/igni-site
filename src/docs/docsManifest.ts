/**
 * The documentation index — per package.
 *
 * Every article was written by reading the code (never the previous,
 * drifted documentation) and checked by a second pass that opened each
 * cited file and ruled on every factual claim.
 *
 * Phase 1 of the docs-versioning plan splits what used to be one mixed
 * index — a single set of articles at one version that blended every
 * product — into a documentation set per package. The packages are
 * `core`, `app`, `server` (the portal is documented inside it), `fleet`,
 * `artifacts` and `codeindex`; the generated SDK docs keep their own
 * `sdk/<package>` section (see `sdkManifest.ts`). `/docs` is a product
 * grid, each package has its own index and left-nav, and the combined
 * changelog is split into one changelog per package.
 *
 * Version history and the version selector are Phase 2; here each package
 * shows its single current version (the Phase 0 numbers). Rebuilding an
 * article means adding its markdown under `content/` and one entry below,
 * with its `package`.
 *
 * `scripts/generate-sitemap.mjs` and `scripts/site-routes.mjs` read this
 * file as text (plain node cannot import a module that does `?raw`
 * imports), so keep `PACKAGES`, `DOCS` and `RETIRED_DOC_SLUGS` as plain
 * literals with `slug:` and `package:` on their own.
 */

import projectContextAndMemoryRaw from './content/PROJECT_CONTEXT_AND_MEMORY.md?raw'
import permissionsAndSafetyRaw from './content/PERMISSIONS_AND_SAFETY.md?raw'
import configurationAndPrecedenceRaw from './content/CONFIGURATION_AND_PRECEDENCE.md?raw'
import agentsAndOrchestrationRaw from './content/AGENTS_AND_ORCHESTRATION.md?raw'
import slashCommandsAndSkillsRaw from './content/SLASH_COMMANDS_AND_SKILLS.md?raw'
import toolsMcpAndLanguageServersRaw from './content/TOOLS_MCP_AND_LANGUAGE_SERVERS.md?raw'
import hooksWorkflowsAndScheduledTasksRaw from './content/HOOKS_WORKFLOWS_AND_SCHEDULED_TASKS.md?raw'
import artifactsRaw from './content/ARTIFACTS.md?raw'
import selfHostingTheServerRaw from './content/SELF_HOSTING_THE_SERVER.md?raw'
import serverConfigurationRaw from './content/SERVER_CONFIGURATION.md?raw'
import inferenceBackendsRaw from './content/INFERENCE_BACKENDS.md?raw'
import runningTheDocumentsServiceRaw from './content/RUNNING_THE_DOCUMENTS_SERVICE.md?raw'
import administeringYourOrganisationRaw from './content/ADMINISTERING_YOUR_ORGANISATION.md?raw'
import installingIgniRaw from './content/INSTALLING_IGNI.md?raw'
import modelsAndTheFactoryRaw from './content/MODELS_AND_THE_FACTORY.md?raw'
import licensingAndEvaluationsRaw from './content/LICENSING_AND_EVALUATIONS.md?raw'
import offlineUpdatesRaw from './content/OFFLINE_UPDATES.md?raw'
import codeindexRaw from './content/CODEINDEX.md?raw'
import fleetRaw from './content/FLEET.md?raw'
import buildingExtensionsRaw from './content/BUILDING_EXTENSIONS.md?raw'
import sdksRaw from './content/SDKS.md?raw'
import yourFirstSessionRaw from './content/FIRST_SESSION.md?raw'
import glossaryRaw from './content/GLOSSARY.md?raw'
import troubleshootingRaw from './content/TROUBLESHOOTING.md?raw'
import coreChangelogRaw from './content/CORE_CHANGELOG.md?raw'
import appChangelogRaw from './content/APP_CHANGELOG.md?raw'
import serverChangelogRaw from './content/SERVER_CHANGELOG.md?raw'

/** The stable URL slug of a documentation package. */
export type DocPackageSlug =
  | 'core'
  | 'app'
  | 'server'
  | 'fleet'
  | 'artifacts'
  | 'codeindex'

export interface DocPackage {
  slug: DocPackageSlug
  /** The product's name, as the registry/repository knows it. */
  name: string
  /** The card and landing title. */
  title: string
  /** One line for the product grid and the package landing. */
  tagline: string
  /** The current version, shown as a label. Undefined for a parked module. */
  version?: string
  /** The label text when there is no version to show (a parked module). */
  versionLabel?: string
  /**
   * A single-page package: its one article is its landing, rendered at
   * `/docs/<slug>` (not `/docs/<slug>/<article>`). Fleet and the two
   * parked modules are these.
   */
  single?: boolean
}

export interface DocArticle {
  slug: string
  title: string
  description: string
  category: DocCategory
  package: DocPackageSlug
  content: string
}

export type DocCategory =
  | 'getting-started'
  | 'core-concepts'
  | 'features'
  | 'modules'
  | 'extending'
  | 'operations'
  | 'release-notes'

/** The order categories are listed in within a package, and the order the
 *  prev/next buttons walk its articles. */
export const CATEGORY_ORDER: DocCategory[] = [
  'getting-started',
  'operations',
  'core-concepts',
  'features',
  'modules',
  'extending',
  'release-notes',
]

export const CATEGORY_META: Record<DocCategory, { label: string; description: string }> = {
  'getting-started': {
    label: 'Getting Started',
    description: 'Install it and understand what it does',
  },
  'core-concepts': {
    label: 'Core Concepts',
    description: 'How the pieces fit together',
  },
  features: {
    label: 'Features',
    description: 'What it can do',
  },
  modules: {
    label: 'Overview',
    description: 'What this module is',
  },
  extending: {
    label: 'Extending igni',
    description: 'Extensions, and services that reach the agent',
  },
  operations: {
    label: 'Operations',
    description: 'Configuring, securing and running it',
  },
  'release-notes': {
    label: 'Release notes',
    description: 'What changed, and what to change when you upgrade',
  },
}

/**
 * The documentation packages, in the order the `/docs` product grid lists
 * them. igni is not "four things": it is these six documented packages,
 * plus the SDK packages under `sdk/`.
 */
export const PACKAGES: DocPackage[] = [
  {
    slug: 'core',
    name: 'igni-core',
    title: 'igni core',
    tagline:
      'The engine, the igni CLI and the agent: configuration, project context, permissions, agents, tools, hooks, models, and extending igni.',
    version: '1.0.5',
  },
  {
    slug: 'app',
    name: 'igni app',
    title: 'igni app',
    tagline: 'The desktop app and the web client: installing igni and your first session.',
    version: '1.0.5',
  },
  {
    slug: 'server',
    name: 'igni server',
    title: 'igni server',
    tagline:
      'Self-hosting the API, portal and migrations: configuration, inference and cloud providers, administration, offline updates and licensing.',
    version: '0.8.0',
  },
  {
    slug: 'fleet',
    name: 'Fleet',
    title: 'Fleet',
    tagline: 'A cloud agent in an isolated microVM for every person and app, on your own servers.',
    version: '0.1.2',
    single: true,
  },
  {
    slug: 'artifacts',
    name: 'Artifacts',
    title: 'Artifacts',
    tagline: 'Shared documents the agent writes, with versions, comments and lineage.',
    versionLabel: 'Paid module',
    single: true,
  },
  {
    slug: 'codeindex',
    name: 'CodeIndex',
    title: 'CodeIndex',
    tagline: 'A queryable graph of your code for the agent to search and review.',
    versionLabel: 'Paid module',
    single: true,
  },
]

export const DOCS: DocArticle[] = [
  // ── igni app ──────────────────────────────────────────────────────
  {
    slug: 'installing-igni',
    title: "Installing igni: the desktop app and the CLI",
    description: "Installing the desktop app and the CLI, signing in to your server, and installing on a machine with no internet access.",
    category: 'getting-started',
    package: 'app',
    content: installingIgniRaw,
  },
  {
    slug: 'your-first-session',
    title: "Your first session",
    description: "One run, from an empty terminal to a finished task: installing it, signing in, saying what it may do, and where to go next.",
    category: 'getting-started',
    package: 'app',
    content: yourFirstSessionRaw,
  },
  {
    slug: 'changelog',
    title: "igni app: changes and upgrades",
    description: "The desktop app and web client's releases, and what changes when you cross a version boundary.",
    category: 'release-notes',
    package: 'app',
    content: appChangelogRaw,
  },
  // ── igni core ─────────────────────────────────────────────────────
  {
    slug: 'models-and-the-factory',
    title: "Models and the Factory",
    description: "igni's own models, serving them and their LoRA adapters on your GPUs, how a model is chosen, and what the Factory is.",
    category: 'core-concepts',
    package: 'core',
    content: modelsAndTheFactoryRaw,
  },
  {
    slug: 'configuration-and-precedence',
    title: "Configuration: files, precedence and where igni loads things from",
    description: "The settings files igni reads, the order they win in, and the same tiering applied to agents, skills, commands and plugins.",
    category: 'core-concepts',
    package: 'core',
    content: configurationAndPrecedenceRaw,
  },
  {
    slug: 'glossary',
    title: "Glossary",
    description: "Every term igni uses, and what it means here. Where a word means more than one thing, the entry says which sense is meant.",
    category: 'core-concepts',
    package: 'core',
    content: glossaryRaw,
  },
  {
    slug: 'project-context-and-memory',
    title: "Project context, rules and memory",
    description: "The files igni reads before it answers — igni.md, rules directories, personal overrides — and what it remembers between sessions.",
    category: 'core-concepts',
    package: 'core',
    content: projectContextAndMemoryRaw,
  },
  {
    slug: 'permissions-and-safety',
    title: "Permissions and safety",
    description: "The five permission modes, the categories they act on, the CLI flags that set them, and the safety rules that sit underneath.",
    category: 'core-concepts',
    package: 'core',
    content: permissionsAndSafetyRaw,
  },
  {
    slug: 'agents-and-orchestration',
    title: "Agents and orchestration",
    description: "The main agent, the specialists that ship with igni, how to write your own, and how work gets handed to a team.",
    category: 'core-concepts',
    package: 'core',
    content: agentsAndOrchestrationRaw,
  },
  {
    slug: 'slash-commands-and-skills',
    title: "Slash commands, skills and output styles",
    description: "Everything you can type after a slash — the built-ins, the markdown commands you write yourself, and the skills that package a procedure.",
    category: 'features',
    package: 'core',
    content: slashCommandsAndSkillsRaw,
  },
  {
    slug: 'tools-mcp-and-language-servers',
    title: "Tools, MCP servers and language servers",
    description: "The eight built-in tools, why there is no Read or Grep, how to add your own, and how to attach MCP servers.",
    category: 'features',
    package: 'core',
    content: toolsMcpAndLanguageServersRaw,
  },
  {
    slug: 'hooks-workflows-and-scheduled-tasks',
    title: "Hooks, workflows and scheduled tasks",
    description: "Running your own code when igni does something — event hooks, scripted workflows and tasks that run later.",
    category: 'features',
    package: 'core',
    content: hooksWorkflowsAndScheduledTasksRaw,
  },
  {
    slug: 'building-extensions',
    title: "Building extensions",
    description: "The manifest, approval and distribution, the host API, the SDKs, and the two ways a service reaches a person's agent.",
    category: 'extending',
    package: 'core',
    content: buildingExtensionsRaw,
  },
  {
    slug: 'sdks',
    title: 'SDKs and the API',
    description:
      "Building on igni from your own code: the OpenAI-compatible model API, igni-client, igni-service and igni-extension, the TypeScript page packages, and the CLI — with install, authentication and worked examples.",
    category: 'extending',
    package: 'core',
    content: sdksRaw,
  },
  {
    slug: 'troubleshooting',
    title: "Troubleshooting",
    description: "The errors igni actually prints, what each one means, and what to do about it.",
    category: 'operations',
    package: 'core',
    content: troubleshootingRaw,
  },
  {
    slug: 'changelog',
    title: "igni-core: changes and upgrades",
    description: "The backend, the igni command and the decisions service: the package rename, where igni keeps things, and the current release.",
    category: 'release-notes',
    package: 'core',
    content: coreChangelogRaw,
  },
  // ── igni server ───────────────────────────────────────────────────
  {
    slug: 'self-hosting-the-server',
    title: "Self-hosting the igni server",
    description: "Deploying the API, portal and migrations with Helm or Docker Compose, and knowing when the thing is actually up.",
    category: 'operations',
    package: 'server',
    content: selfHostingTheServerRaw,
  },
  {
    slug: 'server-configuration',
    title: "Server configuration reference",
    description: "Every setting an operator sets, what it does, and which ones are safe to leave empty.",
    category: 'operations',
    package: 'server',
    content: serverConfigurationRaw,
  },
  {
    slug: 'inference-backends',
    title: "Connecting your GPUs: inference backends",
    description: "How the server routes chat over the inference nodes and cloud providers you own, and how capacity is shared between them.",
    category: 'operations',
    package: 'server',
    content: inferenceBackendsRaw,
  },
  {
    slug: 'administering-your-organisation',
    title: "Administering your organisation in the portal",
    description: "Admitting developers, publishing where your server is so they never type a URL, shipping them a standard set of agents and skills, and taking access away again.",
    category: 'operations',
    package: 'server',
    content: administeringYourOrganisationRaw,
  },
  {
    slug: 'running-the-documents-service',
    title: "Running the documents service",
    description: "The optional deployment behind shared documents: what it needs, how it pairs with the server, and what is not yet packaged.",
    category: 'operations',
    package: 'server',
    content: runningTheDocumentsServiceRaw,
  },
  {
    slug: 'offline-updates',
    title: "Offline updates: the signed release bundle",
    description: "Carrying a release into a network with no route out, verifying it, and importing it into your own registry with igni-import.",
    category: 'operations',
    package: 'server',
    content: offlineUpdatesRaw,
  },
  {
    slug: 'licensing-and-evaluations',
    title: "Licensing and evaluations",
    description: "The offline, signed licence file the paid modules check, where it goes, and what happens when a licence or an evaluation runs out.",
    category: 'operations',
    package: 'server',
    content: licensingAndEvaluationsRaw,
  },
  {
    slug: 'changelog',
    title: "igni server: changes and upgrades",
    description: "The API, portal and migrations: the pools removal, the offline bundle's new shape, and the 0.7.1 and 0.8.0 releases.",
    category: 'release-notes',
    package: 'server',
    content: serverChangelogRaw,
  },
  // ── Fleet (single page) ───────────────────────────────────────────
  {
    slug: 'fleet',
    title: "Fleet: an agent in a microVM for every person and app",
    description: "The gateway, node agent and Firecracker microVMs behind Fleet, what a host needs, how it ties into igni server, and what is not finished.",
    category: 'modules',
    package: 'fleet',
    content: fleetRaw,
  },
  // ── Artifacts (single page) ───────────────────────────────────────
  {
    slug: 'artifacts',
    title: "Artifacts: shared documents and lineage",
    description: "Artifacts are the documents the agent writes. Publishing one to a link your colleagues can open, versioning a set together, and tracking what each was built on.",
    category: 'modules',
    package: 'artifacts',
    content: artifactsRaw,
  },
  // ── CodeIndex (single page) ───────────────────────────────────────
  {
    slug: 'codeindex',
    title: "CodeIndex: a queryable graph of your code",
    description: "What CodeIndex builds from your repositories, the index on each developer's machine, what the agent gets from it, and deploying the service.",
    category: 'modules',
    package: 'codeindex',
    content: codeindexRaw,
  },
]

/**
 * Legacy single-segment `/docs/<slug>` URLs retired by the per-package
 * split that are not simply a moved article (moved articles' redirects are
 * derived from `DOCS`). Kept a plain literal so the sitemap/site-routes
 * scripts can read it as text.
 */
export const RETIRED_DOC_SLUGS: Record<string, string> = {
  'changes-and-upgrades': '/docs/core/changelog',
}

export function docPackage(slug: string | undefined): DocPackage | undefined {
  return PACKAGES.find((p) => p.slug === slug)
}

/** A package's articles, in category order then manifest order. */
export function articlesOf(pkg: string | undefined): DocArticle[] {
  return DOCS.map((d, i) => ({ d, i }))
    .filter((x) => x.d.package === pkg)
    .sort((a, b) => {
      const c = CATEGORY_ORDER.indexOf(a.d.category) - CATEGORY_ORDER.indexOf(b.d.category)
      return c !== 0 ? c : a.i - b.i
    })
    .map((x) => x.d)
}

/** The one article of a single-page package, if that is what `pkg` is. */
export function overviewArticle(pkg: string | undefined): DocArticle | undefined {
  return docPackage(pkg)?.single ? DOCS.find((d) => d.package === pkg) : undefined
}

export function findArticle(pkg: string | undefined, slug: string | undefined): DocArticle | undefined {
  return DOCS.find((d) => d.package === pkg && d.slug === slug)
}

/** The site path of an article. A single-page package's article is its
 *  landing (`/docs/<pkg>`); every other article is `/docs/<pkg>/<slug>`. */
export function docHref(a: DocArticle): string {
  return docPackage(a.package)?.single ? `/docs/${a.package}` : `/docs/${a.package}/${a.slug}`
}

export function packageHref(pkg: DocPackage): string {
  return `/docs/${pkg.slug}`
}

/** The version label a package shows: its version, or its parked-module text. */
export function packageVersionLabel(pkg: DocPackage): string {
  return pkg.version ? `v${pkg.version}` : (pkg.versionLabel ?? '')
}

/**
 * Every legacy `/docs/<slug>` URL and where it now resolves. Moved
 * articles (those in multi-page packages) redirect to their new path;
 * the single-page packages keep their original `/docs/<slug>` URL and so
 * need no redirect; `RETIRED_DOC_SLUGS` adds the rest.
 */
export const LEGACY_REDIRECTS: Record<string, string> = {
  ...Object.fromEntries(
    DOCS.filter((d) => !docPackage(d.package)?.single && d.category !== 'release-notes').map((d) => [
      d.slug,
      `/docs/${d.package}/${d.slug}`,
    ]),
  ),
  ...RETIRED_DOC_SLUGS,
}

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Extract H2 sections from raw markdown for the table of contents. Skips code blocks. */
export function extractSections(content: string): { id: string; title: string }[] {
  const lines = content.split('\n')
  const sections: { id: string; title: string }[] = []
  let inCodeBlock = false
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    const match = line.match(/^## (.+)/)
    if (match) {
      const title = match[1].trim()
      sections.push({ id: headingId(title), title })
    }
  }
  return sections
}
