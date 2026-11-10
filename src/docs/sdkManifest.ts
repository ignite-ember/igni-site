/**
 * The SDKs' documentation: igni-client, igni-extension and igni-service.
 *
 * Not written here. igni-sdk generates every page (`make sdk-docs`: each
 * package README cut at its sections, igni-client's reference from
 * igni-core's RPC contract, the other two's from their code) with an
 * `index.json` that says what each is, and `scripts/sync-sdk-docs.mjs`
 * copies them into `sdk/`. This module reads that index and the pages it
 * names; `/docs/sdk/...` renders them with the same renderer as the rest
 * of the documentation.
 *
 * What is written here is what igni-sdk does not say: each package's
 * one-line purpose and where it runs, for the SDK landing page.
 */

export interface SdkPackageMeta {
  name: string
  module: string
  version: string
  description: string
  pypi: string
  source: string
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
      add({ path: sdkPath(page.package, page.slug), title: page.title, context: page.package })
    }
  }
  for (const page of SDK_PAGES) {
    for (const section of page.sections) {
      if (section.title.toLowerCase().includes(q)) {
        add({
          path: sdkPath(page.package, page.slug, section.id),
          title: section.title,
          context: `${page.package} · ${page.title}`,
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
