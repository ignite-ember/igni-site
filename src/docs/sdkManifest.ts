/**
 * The SDKs' documentation: six published packages, three on PyPI and
 * three on npm.
 *
 * Not written here. igni-sdk generates every page (`make sdk-docs`: each
 * package README cut at its sections, igni-client's reference from
 * igni-core's RPC contract, the other two Python ones' from their code,
 * the npm ones' from their TypeScript and CSS) with an `index.json` that
 * says what each is, and `scripts/sync-sdk-docs.mjs` copies them into
 * `sdk/`. This module reads that index and the pages it names;
 * `/docs/sdk/...` renders them with the same renderer as the rest of the
 * documentation.
 *
 * What is written here is what igni-sdk does not say: each package's
 * one-line purpose and where it runs, for the SDK landing page.
 */

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

interface SdkIndex {
  packages: SdkPackageMeta[]
  pages: SdkPage[]
}

const INDEX = Object.values(
  import.meta.glob<SdkIndex>('./sdk/index.json', { eager: true, import: 'default' }),
)[0]

/**
 * The pages themselves, each its own chunk, fetched when it is opened:
 * together they are larger than the rest of the site. The index above is
 * all that search and the sidebars need.
 */
const FILES = import.meta.glob<string>('./sdk/**/*.md', { query: '?raw', import: 'default' })

/** A page's markdown without the generator's banner comment, which is for whoever opens the file. */
function withoutBanner(raw: string): string {
  return raw.replace(/^<!--[\s\S]*?-->\s*/, '')
}

export const SDK_PACKAGES: SdkPackageMeta[] = INDEX?.packages ?? []

export const SDK_PAGES: SdkPage[] = INDEX?.pages ?? []

/** A page's markdown, starting with its `# title`. */
export async function loadSdkContent(page: SdkPage): Promise<string> {
  const load = FILES[`./sdk/${page.file}`]
  if (!load) throw new Error(`no SDK page ${page.file}`)
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

/** The site path of a page: a package's overview is the package's own path. */
export function sdkPath(pkg: string, slug = 'overview', anchor = ''): string {
  const base = slug === 'overview' ? `/docs/sdk/${pkg}` : `/docs/sdk/${pkg}/${slug}`
  return anchor ? `${base}#${anchor}` : base
}

export function sdkPackage(name: string | undefined): SdkPackageMeta | undefined {
  return SDK_PACKAGES.find((p) => p.name === name)
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
export function sdkPagesOf(pkg: string): SdkPage[] {
  return SDK_PAGES.filter((p) => p.package === pkg).sort((a, b) => a.order - b.order)
}

export function sdkPage(pkg: string | undefined, slug: string | undefined): SdkPage | undefined {
  return SDK_PAGES.find((p) => p.package === pkg && p.slug === (slug ?? 'overview'))
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
export function searchSdk(query: string, limit = 20): SdkHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: SdkHit[] = []
  const seen = new Set<string>()
  const add = (hit: SdkHit) => {
    if (seen.has(hit.path) || hits.length >= limit) return
    seen.add(hit.path)
    hits.push(hit)
  }
  for (const page of SDK_PAGES) {
    if (page.title.toLowerCase().includes(q) || page.description.toLowerCase().includes(q)) {
      add({
        path: sdkPath(page.package, page.slug),
        title: page.title,
        context: sdkLabel(sdkPackage(page.package)) || page.package,
      })
    }
  }
  for (const page of SDK_PAGES) {
    for (const section of page.sections) {
      if (section.title.toLowerCase().includes(q)) {
        add({
          path: sdkPath(page.package, page.slug, section.id),
          title: section.title,
          context: `${sdkLabel(sdkPackage(page.package)) || page.package} · ${page.title}`,
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
