/**
 * The documentation index — per package, per version.
 *
 * Every article was written by reading the code (never the previous,
 * drifted documentation) and checked by a second pass that opened each
 * cited file and ruled on every factual claim.
 *
 * Phase 1 of the docs-versioning plan split what used to be one mixed
 * index — a single set of articles at one version that blended every
 * product — into a documentation set per package. The packages are
 * `core`, `app`, `server` (the portal is documented inside it), `fleet`,
 * `artifacts` and `codeindex`; the generated SDK docs keep their own
 * `sdk/<package>` section (see `sdkManifest.ts`). `/docs` is a product
 * grid, each package has its own index and left-nav, and the combined
 * changelog is split into one changelog per package.
 *
 * Phase 2 adds version history. Each package's pages are frozen snapshots
 * under `content/<package>/<version>/<slug>.md`; `PACKAGES[i].versions`
 * lists the released versions newest-first, and the first entry is
 * "latest". A page is addressable three ways:
 *
 *   /docs/<package>/<version>/<slug>   a pinned snapshot
 *   /docs/<package>/latest/<slug>      an alias that follows the newest
 *   /docs/<package>/<slug>             the same alias, version omitted
 *
 * and the package landing likewise (`/docs/<package>`, `/docs/<package>/
 * <version>`, `/docs/<package>/latest`). The version-less form is the
 * canonical one the nav, the sitemap and the in-article links use; it
 * always resolves to the newest snapshot, so a bookmark keeps working
 * across releases. A future release adds a new `content/<package>/
 * <version>/` folder and prepends the version to that package's
 * `versions` — the old folders are never touched. See `src/docs/README.md`.
 *
 * `scripts/generate-sitemap.mjs` and `scripts/site-routes.mjs` read this
 * file as text (plain node cannot import a module that does `?raw`
 * imports), so keep `PACKAGES`, `DOCS` and `RETIRED_DOC_SLUGS` as plain
 * literals with `slug:`, `package:`, `category:` and `versions:` on their
 * own.
 */

/**
 * The frozen page snapshots, keyed `./content/<package>/<version>/<slug>.md`.
 * Loaded eagerly as raw markdown: the hand-written docs render
 * synchronously, the way they did before the per-version split.
 */
const CONTENT = import.meta.glob<string>('./content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

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
  /**
   * The released versions, newest first. The first entry is "latest":
   * what `/docs/<package>` and the canonical links resolve to. A parked
   * module with no release number uses the single sentinel `current`.
   */
  versions: string[]
  /** The label text when there is no version number to show (a parked
   *  module): shown in place of a version selector. */
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
  /** The latest snapshot's markdown. The page renders whichever version
   *  the URL selects via `articleContent`; this is the default (latest)
   *  and what search and the link checks read. */
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
 *
 * `versions` is newest-first; `versions[0]` is "latest". When a release
 * ships, prepend its number here and drop its snapshot under
 * `content/<slug>/<version>/` — the existing folders do not move.
 */
export const PACKAGES: DocPackage[] = [
  {
    slug: 'core',
    name: 'igni-core',
    title: 'igni core',
    tagline:
      'The engine, the igni CLI and the agent: configuration, project context, permissions, agents, tools, hooks, models, and extending igni.',
    versions: ['1.0.5'],
  },
  {
    slug: 'app',
    name: 'igni app',
    title: 'igni app',
    tagline: 'The desktop app and the web client: installing igni and your first session.',
    versions: ['1.0.5'],
  },
  {
    slug: 'server',
    name: 'igni server',
    title: 'igni server',
    tagline:
      'Self-hosting the API, portal and migrations: configuration, inference and cloud providers, administration, offline updates and licensing.',
    versions: ['0.8.0'],
  },
  {
    slug: 'fleet',
    name: 'Fleet',
    title: 'Fleet',
    tagline: 'A cloud agent in an isolated microVM for every person and app, on your own servers.',
    versions: ['0.1.2'],
    single: true,
  },
  {
    slug: 'artifacts',
    name: 'Artifacts',
    title: 'Artifacts',
    tagline: 'Shared documents the agent writes, with versions, comments and lineage.',
    versions: ['current'],
    versionLabel: 'Paid module',
    single: true,
  },
  {
    slug: 'codeindex',
    name: 'CodeIndex',
    title: 'CodeIndex',
    tagline: 'A queryable graph of your code for the agent to search and review.',
    versions: ['current'],
    versionLabel: 'Paid module',
    single: true,
  },
]

/** The newest version of a package — "latest". */
export function latestVersion(slug: string | undefined): string | undefined {
  return docPackage(slug)?.versions[0]
}

/** A snapshot's markdown, or `''` when that (package, version, slug) has no
 *  file. The page uses this to render whichever version the URL selects. */
export function articleContent(
  pkg: string | undefined,
  version: string | undefined,
  slug: string | undefined,
): string {
  if (!pkg || !version || !slug) return ''
  return CONTENT[`./content/${pkg}/${version}/${slug}.md`] ?? ''
}

/** The latest snapshot's markdown, for the manifest's default `content`. */
function latestContent(pkg: DocPackageSlug, slug: string): string {
  const version = PACKAGES.find((p) => p.slug === pkg)!.versions[0]
  return articleContent(pkg, version, slug)
}

export const DOCS: DocArticle[] = [
  // ── igni app ──────────────────────────────────────────────────────
  {
    slug: 'installing-igni',
    title: "Installing igni: the desktop app and the CLI",
    description: "Installing the desktop app and the CLI, signing in to your server, and installing on a machine with no internet access.",
    category: 'getting-started',
    package: 'app',
    content: latestContent('app', 'installing-igni'),
  },
  {
    slug: 'your-first-session',
    title: "Your first session",
    description: "One run, from an empty terminal to a finished task: installing it, signing in, saying what it may do, and where to go next.",
    category: 'getting-started',
    package: 'app',
    content: latestContent('app', 'your-first-session'),
  },
  {
    slug: 'changelog',
    title: "igni app: changes and upgrades",
    description: "The desktop app and web client's releases, and what changes when you cross a version boundary.",
    category: 'release-notes',
    package: 'app',
    content: latestContent('app', 'changelog'),
  },
  // ── igni core ─────────────────────────────────────────────────────
  {
    slug: 'models-and-the-factory',
    title: "Models and the Factory",
    description: "igni's own models, serving them and their LoRA adapters on your GPUs, how a model is chosen, and what the Factory is.",
    category: 'core-concepts',
    package: 'core',
    content: latestContent('core', 'models-and-the-factory'),
  },
  {
    slug: 'configuration-and-precedence',
    title: "Configuration: files, precedence and where igni loads things from",
    description: "The settings files igni reads, the order they win in, and the same tiering applied to agents, skills, commands and plugins.",
    category: 'core-concepts',
    package: 'core',
    content: latestContent('core', 'configuration-and-precedence'),
  },
  {
    slug: 'glossary',
    title: "Glossary",
    description: "Every term igni uses, and what it means here. Where a word means more than one thing, the entry says which sense is meant.",
    category: 'core-concepts',
    package: 'core',
    content: latestContent('core', 'glossary'),
  },
  {
    slug: 'project-context-and-memory',
    title: "Project context, rules and memory",
    description: "The files igni reads before it answers — igni.md, rules directories, personal overrides — and what it remembers between sessions.",
    category: 'core-concepts',
    package: 'core',
    content: latestContent('core', 'project-context-and-memory'),
  },
  {
    slug: 'permissions-and-safety',
    title: "Permissions and safety",
    description: "The five permission modes, the categories they act on, the CLI flags that set them, and the safety rules that sit underneath.",
    category: 'core-concepts',
    package: 'core',
    content: latestContent('core', 'permissions-and-safety'),
  },
  {
    slug: 'agents-and-orchestration',
    title: "Agents and orchestration",
    description: "The main agent, the specialists that ship with igni, how to write your own, and how work gets handed to a team.",
    category: 'core-concepts',
    package: 'core',
    content: latestContent('core', 'agents-and-orchestration'),
  },
  {
    slug: 'slash-commands-and-skills',
    title: "Slash commands, skills and output styles",
    description: "Everything you can type after a slash — the built-ins, the markdown commands you write yourself, and the skills that package a procedure.",
    category: 'features',
    package: 'core',
    content: latestContent('core', 'slash-commands-and-skills'),
  },
  {
    slug: 'tools-mcp-and-language-servers',
    title: "Tools, MCP servers and language servers",
    description: "The eight built-in tools, why there is no Read or Grep, how to add your own, and how to attach MCP servers.",
    category: 'features',
    package: 'core',
    content: latestContent('core', 'tools-mcp-and-language-servers'),
  },
  {
    slug: 'hooks-workflows-and-scheduled-tasks',
    title: "Hooks, workflows and scheduled tasks",
    description: "Running your own code when igni does something — event hooks, scripted workflows and tasks that run later.",
    category: 'features',
    package: 'core',
    content: latestContent('core', 'hooks-workflows-and-scheduled-tasks'),
  },
  {
    slug: 'building-extensions',
    title: "Building extensions",
    description: "The manifest, approval and distribution, the host API, the SDKs, and the two ways a service reaches a person's agent.",
    category: 'extending',
    package: 'core',
    content: latestContent('core', 'building-extensions'),
  },
  {
    slug: 'sdks',
    title: 'SDKs and the API',
    description:
      "Building on igni from your own code: the OpenAI-compatible model API, igni-client, igni-service and igni-extension, the TypeScript page packages, and the CLI — with install, authentication and worked examples.",
    category: 'extending',
    package: 'core',
    content: latestContent('core', 'sdks'),
  },
  {
    slug: 'troubleshooting',
    title: "Troubleshooting",
    description: "The errors igni actually prints, what each one means, and what to do about it.",
    category: 'operations',
    package: 'core',
    content: latestContent('core', 'troubleshooting'),
  },
  {
    slug: 'changelog',
    title: "igni-core: changes and upgrades",
    description: "The backend, the igni command and the decisions service: the package rename, where igni keeps things, and the current release.",
    category: 'release-notes',
    package: 'core',
    content: latestContent('core', 'changelog'),
  },
  // ── igni server ───────────────────────────────────────────────────
  {
    slug: 'self-hosting-the-server',
    title: "Self-hosting the igni server",
    description: "Deploying the API, portal and migrations with Helm or Docker Compose, and knowing when the thing is actually up.",
    category: 'operations',
    package: 'server',
    content: latestContent('server', 'self-hosting-the-server'),
  },
  {
    slug: 'server-configuration',
    title: "Server configuration reference",
    description: "Every setting an operator sets, what it does, and which ones are safe to leave empty.",
    category: 'operations',
    package: 'server',
    content: latestContent('server', 'server-configuration'),
  },
  {
    slug: 'inference-backends',
    title: "Connecting your GPUs: inference backends",
    description: "How the server routes chat over the inference nodes and cloud providers you own, and how capacity is shared between them.",
    category: 'operations',
    package: 'server',
    content: latestContent('server', 'inference-backends'),
  },
  {
    slug: 'administering-your-organisation',
    title: "Administering your organisation in the portal",
    description: "Admitting developers, publishing where your server is so they never type a URL, shipping them a standard set of agents and skills, and taking access away again.",
    category: 'operations',
    package: 'server',
    content: latestContent('server', 'administering-your-organisation'),
  },
  {
    slug: 'running-the-documents-service',
    title: "Running the documents service",
    description: "The optional deployment behind shared documents: what it needs, how it pairs with the server, and what is not yet packaged.",
    category: 'operations',
    package: 'server',
    content: latestContent('server', 'running-the-documents-service'),
  },
  {
    slug: 'offline-updates',
    title: "Offline updates: the signed release bundle",
    description: "Carrying a release into a network with no route out, verifying it, and importing it into your own registry with igni-import.",
    category: 'operations',
    package: 'server',
    content: latestContent('server', 'offline-updates'),
  },
  {
    slug: 'licensing-and-evaluations',
    title: "Licensing and evaluations",
    description: "The offline, signed licence file the paid modules check, where it goes, and what happens when a licence or an evaluation runs out.",
    category: 'operations',
    package: 'server',
    content: latestContent('server', 'licensing-and-evaluations'),
  },
  {
    slug: 'changelog',
    title: "igni server: changes and upgrades",
    description: "The API, portal and migrations: the pools removal, the offline bundle's new shape, and the 0.7.1 and 0.8.0 releases.",
    category: 'release-notes',
    package: 'server',
    content: latestContent('server', 'changelog'),
  },
  // ── Fleet (single page) ───────────────────────────────────────────
  {
    slug: 'fleet',
    title: "Fleet: an agent in a microVM for every person and app",
    description: "The gateway, node agent and Firecracker microVMs behind Fleet, what a host needs, how it ties into igni server, and what is not finished.",
    category: 'modules',
    package: 'fleet',
    content: latestContent('fleet', 'fleet'),
  },
  // ── Artifacts (single page) ───────────────────────────────────────
  {
    slug: 'artifacts',
    title: "Artifacts: shared documents and lineage",
    description: "Artifacts are the documents the agent writes. Publishing one to a link your colleagues can open, versioning a set together, and tracking what each was built on.",
    category: 'modules',
    package: 'artifacts',
    content: latestContent('artifacts', 'artifacts'),
  },
  // ── CodeIndex (single page) ───────────────────────────────────────
  {
    slug: 'codeindex',
    title: "CodeIndex: a queryable graph of your code",
    description: "What CodeIndex builds from your repositories, the index on each developer's machine, what the agent gets from it, and deploying the service.",
    category: 'modules',
    package: 'codeindex',
    content: latestContent('codeindex', 'codeindex'),
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

/** Whether `v` names a version this package has (or the `latest` alias). */
export function isKnownVersion(pkg: DocPackage | undefined, v: string | undefined): boolean {
  if (!pkg) return false
  return v === 'latest' || (!!v && pkg.versions.includes(v))
}

/** The concrete version `v` selects: the newest for `undefined`/`latest`. */
export function resolveVersion(pkg: DocPackage | undefined, v: string | undefined): string {
  if (!pkg) return v ?? ''
  if (!v || v === 'latest') return pkg.versions[0]
  return v
}

/** Whether `version` is this package's newest. */
export function isLatest(pkg: DocPackage | undefined, version: string): boolean {
  return !!pkg && version === pkg.versions[0]
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

/** The canonical (latest-tracking, version-less) site path of an article.
 *  A single-page package's article is its landing (`/docs/<pkg>`); every
 *  other article is `/docs/<pkg>/<slug>`. */
export function docHref(a: DocArticle): string {
  return docPackage(a.package)?.single ? `/docs/${a.package}` : `/docs/${a.package}/${a.slug}`
}

/** An article's path at a specific version: the canonical path when that is
 *  the latest, else the pinned `/docs/<pkg>/<version>[/<slug>]`. */
export function docHrefAt(a: DocArticle, version: string): string {
  const pkg = docPackage(a.package)
  if (isLatest(pkg, version)) return docHref(a)
  return pkg?.single ? `/docs/${a.package}/${version}` : `/docs/${a.package}/${version}/${a.slug}`
}

/** The canonical (latest) path of a package landing. */
export function packageHref(pkg: DocPackage): string {
  return `/docs/${pkg.slug}`
}

/** A package landing's path at a specific version. */
export function packageHrefAt(pkg: DocPackage, version: string): string {
  return isLatest(pkg, version) ? `/docs/${pkg.slug}` : `/docs/${pkg.slug}/${version}`
}

/** The version label a package shows: `v<latest>`, or its parked-module text. */
export function packageVersionLabel(pkg: DocPackage): string {
  return pkg.versionLabel ?? `v${pkg.versions[0]}`
}

/** How a given version is shown in the selector and banner. */
export function versionLabel(pkg: DocPackage, version: string): string {
  return pkg.versionLabel ?? `v${version}`
}

/**
 * Every legacy `/docs/<slug>` URL and where it now resolves. Moved
 * articles (those in multi-page packages) redirect to their new path;
 * the single-page packages keep their original `/docs/<slug>` URL and so
 * need no redirect; `RETIRED_DOC_SLUGS` adds the rest. The targets are
 * the canonical (latest) paths, so an old link lands on the newest docs.
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
