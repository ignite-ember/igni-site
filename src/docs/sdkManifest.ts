/**
 * The SDKs' documentation: six published packages, three on PyPI and
 * three on npm, released together, one snapshot per release.
 *
 * Not written here. igni-sdk generates every page (`make sdk-docs`: each
 * package README cut at its sections, igni-client's reference from
 * igni-core's RPC contract, the other two Python ones' from their code,
 * the npm ones' from their TypeScript and CSS) with an `index.json` that
 * says what each is, and `scripts/sync-docs.mjs sdk` copies them into
 * `sdk/<version>/`, the folder named by that index's version. This module
 * reads those indexes and the pages they name; `/docs/sdk/...` renders the
 * latest, `/docs/sdk/<version>/...` a pinned one, with the same renderer
 * as the rest of the documentation.
 *
 * The latest index is in the bundle (vite.config.ts points
 * `sdk-latest-index` at it); a past release's is fetched when it is opened,
 * so the bundle does not grow with every release.
 *
 * What is written here is what igni-sdk does not say: each package's
 * one-line purpose and where it runs, for the SDK landing page.
 */
import LATEST_INDEX from 'sdk-latest-index'

export interface SdkPackageMeta {
  /** How the site routes the package: `/docs/sdk/<name>`. */
  name: string
  /** The name on the registry. An npm name carries a `/`, a path cannot. */
  registryName: string
  /** The registry it is published on: PyPI or npm. */
  registry: string
  /** Where it lives on that registry. */
  registryUrl: string
  /** The line that installs it, as the registry wants it written. */
  install: string
  /** The name to import. */
  importName: string
  version: string
  description: string
  source: string
  /** PyPI's page, for the Python packages. */
  pypi?: string
}

export type SdkCategory = 'guide' | 'reference'

export interface SdkSection {
  level: 2 | 3
  id: string
  title: string
}

export interface SdkPage {
  package: string
  slug: string
  title: string
  description: string
  category: SdkCategory
  order: number
  file: string
  /** Its `##` and `###` headings: the table of contents (level 2) and search. */
  sections: SdkSection[]
}

export interface SdkIndex {
  packages: SdkPackageMeta[]
  pages: SdkPage[]
}

/** One release's documentation: its version and its index. */
export interface SdkDocs extends SdkIndex {
  version: string
}

/** Every snapshot's index, as text, fetched when that version is opened. */
const INDEXES = import.meta.glob<string>('./sdk/*/index.json', { query: '?raw', import: 'default' })

/**
 * The pages themselves, each its own chunk, fetched when it is opened:
 * together they are larger than the rest of the site. The index is all
 * that search and the sidebars need.
 */
const FILES = import.meta.glob<string>('./sdk/**/*.md', { query: '?raw', import: 'default' })

/** Order two `x.y.z` versions newest first (as `scripts/sync-docs.mjs` does). */
function compareVersionsDesc(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, pre = ''] = v.split('-', 2)
    return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre }
  }
  const x = parse(a)
  const y = parse(b)
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (y.nums[i] ?? 0) - (x.nums[i] ?? 0)
    if (d) return d
  }
  if (x.pre === y.pre) return 0
  if (!x.pre) return -1
  if (!y.pre) return 1
  return y.pre < x.pre ? -1 : 1
}

/** The released SDK versions with documentation here, newest first; `[0]` is "latest". */
export const SDK_VERSIONS: string[] = Object.keys(INDEXES)
  .map((key) => key.split('/')[2])
  .sort(compareVersionsDesc)

const LATEST: SdkDocs = {
  version: (LATEST_INDEX as SdkIndex).packages[0]?.version ?? SDK_VERSIONS[0] ?? '',
  packages: (LATEST_INDEX as SdkIndex).packages,
  pages: (LATEST_INDEX as SdkIndex).pages,
}

/** The latest release's documentation, what the version-less `/docs/sdk/...` shows. */
export const SDK_LATEST: SdkDocs = LATEST

/** Whether a URL segment names an SDK version here, or the `latest` alias. */
export function isSdkVersion(v: string | undefined): boolean {
  return v === 'latest' || (!!v && SDK_VERSIONS.includes(v))
}

/** The concrete version a URL's segment selects: the newest for none or `latest`. */
export function resolveSdkVersion(v: string | undefined): string {
  return !v || v === 'latest' ? SDK_LATEST.version : v
}

const loaded = new Map<string, SdkDocs>([[LATEST.version, LATEST]])

/** A release's documentation if it is at hand: the latest always, a past one once fetched. */
export function sdkDocsAt(version: string): SdkDocs | undefined {
  return loaded.get(version)
}

/** A release's documentation, fetching its index the first time; `undefined` for none here. */
export async function loadSdkDocs(version: string): Promise<SdkDocs | undefined> {
  const have = loaded.get(version)
  if (have) return have
  const load = INDEXES[`./sdk/${version}/index.json`]
  if (!load) return undefined
  const index = JSON.parse(await load()) as SdkIndex
  const docs: SdkDocs = { version, packages: index.packages, pages: index.pages }
  loaded.set(version, docs)
  return docs
}

/** A page's markdown without the generator's banner comment, which is for whoever opens the file. */
function withoutBanner(raw: string): string {
  return raw.replace(/^<!--[\s\S]*?-->\s*/, '')
}

export const SDK_PACKAGES: SdkPackageMeta[] = SDK_LATEST.packages

export const SDK_PAGES: SdkPage[] = SDK_LATEST.pages

/** A page's markdown at a release (the latest by default), starting with its `# title`. */
export async function loadSdkContent(page: SdkPage, version: string = SDK_LATEST.version): Promise<string> {
  const load = FILES[`./sdk/${version}/${page.file}`]
  if (!load) throw new Error(`no SDK page ${version}/${page.file}`)
  return withoutBanner(await load())
}

/** What each package is for and where it runs — the landing page's words. */
export const SDK_ROLES: Record<string, { forWhat: string; runsWhere: string }> = {
  'igni-client': {
    forWhat:
      'Your own program driving an igni from outside — a script, a backend, a CI job, a bot: sessions, prompts, approvals, and every method igni has, typed.',
    runsWhere:
      'Wherever your program runs. It connects to a person’s, an app’s or a space’s igni in Fleet, through the gateway, or to the igni on the same machine.',
  },
  'igni-extension': {
    forWhat:
      'An extension’s process, inside igni: the tools it gives the agent, the hooks that have a say in what the agent does, and calls to the host and to its own service.',
    runsWhere:
      'Inside igni, on each person’s device or in their Fleet VM, started by igni in an OS sandbox.',
  },
  'igni-service': {
    forWhat:
      'An extension’s backend service: the organisation’s shared data, who is calling, notifications, and reaching a person’s agent.',
    runsWhere:
      'Once per deployment, in the organisation’s own cloud or data centre.',
  },
  'extension-bridge': {
    forWhat:
      'A page inside igni: the bridge it talks to igni over — connect(), RPC to the extension’s own tools, navigation, and the theme.',
    runsWhere:
      'In the browser, in the frame igni gives an extension’s page. The host imports the same protocol, so there is one description of the wire.',
  },
  'ui-react': {
    forWhat:
      'The React components an extension builds its page from — the shell, the primitives, the tables, the feedback. Everything exported is under the compatibility floor.',
    runsWhere:
      'In the browser, in an extension’s page, drawn with `@ignite-ember/ui-css`.',
  },
  'ui-css': {
    forWhat:
      'The stylesheet an extension bundles: igni’s own classes, and the tokens the host pushes live as the theme changes.',
    runsWhere:
      'In the browser, as a stylesheet the extension bundles — a page’s own origin refuses a cross-origin one.',
  },
}

export const SDK_CATEGORY_LABEL: Record<SdkCategory, string> = {
  guide: 'Guide',
  reference: 'Reference',
}

/**
 * The site path of a page at a release: the canonical, version-less
 * `/docs/sdk/<pkg>[/<slug>]` when that release is the latest (or none is
 * given), else the pinned `/docs/sdk/<version>/<pkg>[/<slug>]`. A
 * package's overview is the package's own path.
 */
export function sdkPath(pkg: string, slug = 'overview', anchor = '', version?: string): string {
  const prefix = !version || version === SDK_LATEST.version ? '/docs/sdk' : `/docs/sdk/${version}`
  const base = slug === 'overview' ? `${prefix}/${pkg}` : `${prefix}/${pkg}/${slug}`
  return anchor ? `${base}#${anchor}` : base
}

/** The pinned path of a page, carrying the version even when it is the latest. */
export function sdkPinnedPath(version: string, pkg?: string, slug = 'overview'): string {
  if (!pkg) return `/docs/sdk/${version}`
  return slug === 'overview' ? `/docs/sdk/${version}/${pkg}` : `/docs/sdk/${version}/${pkg}/${slug}`
}

/** The SDK landing at a release: `/docs/sdk` for the latest, else `/docs/sdk/<version>`. */
export function sdkLandingPath(version?: string): string {
  return !version || version === SDK_LATEST.version ? '/docs/sdk' : `/docs/sdk/${version}`
}

/**
 * A canonical in-site SDK link (`/docs/sdk/<pkg>...`, as igni-sdk writes
 * them in its pages) moved to a pinned release, so a reader of an old
 * release stays in it. Other links, and links on the latest, are unchanged.
 */
export function sdkLinkAt(href: string, version: string): string {
  if (version === SDK_LATEST.version) return href
  const m = href.match(/^\/docs\/sdk(\/[^#?]*)?([#?].*)?$/)
  if (!m) return href
  const rest = m[1] ?? ''
  const first = rest.split('/')[1]
  if (isSdkVersion(first)) return href
  return `/docs/sdk/${version}${rest}${m[2] ?? ''}`
}

export function sdkPackage(name: string | undefined, docs: SdkDocs = SDK_LATEST): SdkPackageMeta | undefined {
  return docs.packages.find((p) => p.name === name)
}

/**
 * The name a reader knows the package by: the one on the registry. An
 * npm package's is `@ignite-ember/ui-react` — a `/` a path cannot carry,
 * which is why the site routes it under a slug and calls it by this.
 */
export function sdkLabel(pkg: SdkPackageMeta | undefined): string {
  return pkg?.registryName ?? pkg?.name ?? ''
}

/** A package's pages in their order: its guide, then its reference. */
export function sdkPagesOf(pkg: string, docs: SdkDocs = SDK_LATEST): SdkPage[] {
  return docs.pages.filter((p) => p.package === pkg).sort((a, b) => a.order - b.order)
}

export function sdkPage(pkg: string | undefined, slug: string | undefined, docs: SdkDocs = SDK_LATEST): SdkPage | undefined {
  return docs.pages.find((p) => p.package === pkg && p.slug === (slug ?? 'overview'))
}

export interface SdkHit {
  path: string
  title: string
  context: string
}

/**
 * Pages whose title or description match, then sections whose heading
 * does — a method (`session.scheduler.list()`) or a model — linking
 * straight to it. Case-insensitive; whitespace alone matches nothing.
 */
export function searchSdk(query: string, limit = 20, docs: SdkDocs = SDK_LATEST): SdkHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: SdkHit[] = []
  const seen = new Set<string>()
  const add = (hit: SdkHit) => {
    if (seen.has(hit.path) || hits.length >= limit) return
    seen.add(hit.path)
    hits.push(hit)
  }
  const at = docs.version
  for (const page of docs.pages) {
    if (page.title.toLowerCase().includes(q) || page.description.toLowerCase().includes(q)) {
      add({
        path: sdkPath(page.package, page.slug, '', at),
        title: page.title,
        context: sdkLabel(sdkPackage(page.package, docs)) || page.package,
      })
    }
  }
  for (const page of docs.pages) {
    for (const section of page.sections) {
      if (section.title.toLowerCase().includes(q)) {
        add({
          path: sdkPath(page.package, page.slug, section.id, at),
          title: section.title,
          context: `${sdkLabel(sdkPackage(page.package, docs)) || page.package} · ${page.title}`,
        })
      }
    }
  }
  return hits
}

/** A page's table of contents: its `##` headings. */
export function sdkToc(page: SdkPage): { id: string; title: string }[] {
  return page.sections.filter((s) => s.level === 2).map(({ id, title }) => ({ id, title }))
}
