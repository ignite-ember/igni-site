/**
 * The SDK documentation: `/docs/sdk`, `/docs/sdk/<package>` and
 * `/docs/sdk/<package>/<page>` at the latest release, and the same pinned
 * to a release at `/docs/sdk/<version>/...` (or `latest`).
 *
 * Asserted over the real pages igni-sdk generated (`src/docs/sdk/`), as
 * the article tests are over the real manifest: a fixture would agree
 * with a page list that has gone stale.
 */
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import {
  SDK_LATEST,
  SDK_PACKAGES,
  SDK_PAGES,
  SDK_VERSIONS,
  loadSdkContent,
  loadSdkDocs,
  sdkLabel,
  sdkLinkAt,
  sdkPagesOf,
  sdkPath,
  sdkToc,
  searchSdk,
} from '../../docs/sdkManifest'
import { SdkArticlePage } from '../SdkArticlePage'
import { SdkLandingPage } from '../SdkLandingPage'
import { SdkFirstSegment, SdkSecondSegment } from '../SdkRoutes'

beforeAll(() => {
  // jsdom has no IntersectionObserver; the table of contents makes one.
  class StubObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = StubObserver
  Element.prototype.scrollIntoView = function () {}
})

afterEach(cleanup)

/** Where the router is, so a test can see where the selector went. */
function Where() {
  const { pathname } = useLocation()
  return <div data-testid="where">{pathname}</div>
}

/** The SDK routes exactly as App.tsx declares them. */
function renderAt(route: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/docs" element={<div>docs index stub</div>} />
        <Route path="/docs/sdk" element={<SdkLandingPage />} />
        <Route path="/docs/sdk/:seg" element={<SdkFirstSegment />} />
        <Route path="/docs/sdk/:seg/:page" element={<SdkSecondSegment />} />
        <Route path="/docs/sdk/:version/:pkg/:page" element={<SdkArticlePage />} />
      </Routes>
      <Where />
    </>,
    { route },
  )
}

/** A past release, frozen: its snapshot never changes. */
const OLD = '0.2.0'
const LATEST = SDK_VERSIONS[0]

describe('the pages igni-sdk generated', () => {
  test('there are six packages, each with an overview, a guide and a reference', () => {
    expect(SDK_PACKAGES.map((p) => p.name).sort()).toEqual([
      'extension-bridge',
      'igni-client',
      'igni-extension',
      'igni-service',
      'ui-css',
      'ui-react',
    ])
    for (const pkg of SDK_PACKAGES) {
      const pages = sdkPagesOf(pkg.name)
      expect(pages[0].slug, pkg.name).toBe('overview')
      expect(pages.some((p) => p.category === 'reference'), pkg.name).toBe(true)
    }
  })

  test('every page loads, without the generator banner', async () => {
    for (const page of SDK_PAGES) {
      expect((await loadSdkContent(page)).startsWith(`# ${page.title}`), page.file).toBe(true)
    }
  })

  test('igni-client has a page per area of methods, each method a section', () => {
    const scheduler = SDK_PAGES.find((p) => p.package === 'igni-client' && p.slug === 'scheduler')!
    expect(sdkToc(scheduler).map((s) => s.id)).toEqual([
      'session-scheduler-cancel',
      'session-scheduler-execute',
      'session-scheduler-list',
      'session-scheduler-start',
    ])
  })
})

describe('search', () => {
  test('finds a method by its name and links to its heading', () => {
    const hits = searchSdk('scheduler.list')
    expect(hits[0].path).toBe('/docs/sdk/igni-client/scheduler#session-scheduler-list')
  })

  test('finds a model on the models page', () => {
    expect(searchSdk('ScheduledTask').map((h) => h.path)).toContain(
      '/docs/sdk/igni-client/models-reference#scheduledtask',
    )
  })

  test('whitespace alone is not a search', () => {
    expect(searchSdk('   ')).toEqual([])
  })
})

describe('the landing page', () => {
  test('shows the six packages, what each is for and where it runs', async () => {
    renderAt('/docs/sdk')
    for (const pkg of SDK_PACKAGES) {
      expect(await screen.findByRole('heading', { name: sdkLabel(pkg) })).toBeInTheDocument()
    }
    expect(screen.getAllByText(/Where it runs:/)).toHaveLength(6)
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs')
  })

  test('each package says how it is installed and where it lives', async () => {
    renderAt('/docs/sdk')
    for (const pkg of SDK_PACKAGES) {
      const card = (await screen.findByRole('heading', { name: sdkLabel(pkg) })).closest('section')!
      expect(within(card).getByText(pkg.install), pkg.name).toBeInTheDocument()
      const registry = within(card).getByRole('link', { name: pkg.registry })
      expect(registry).toHaveAttribute('href', pkg.registryUrl)
    }
  })

  test('searching lists methods, linked to their section', async () => {
    const user = userEvent.setup()
    renderAt('/docs/sdk')
    await user.type(screen.getByLabelText(/Search the SDK documentation/i), 'scheduler.list')
    const results = screen.getByRole('list', { name: /Search results/i })
    expect(within(results).getByRole('link', { name: /session\.scheduler\.list\(\)/ })).toHaveAttribute(
      'href',
      '/docs/sdk/igni-client/scheduler#session-scheduler-list',
    )
  })
})

describe('a page', () => {
  test('renders its title once, a breadcrumb back to /docs and the package', async () => {
    renderAt('/docs/sdk/igni-client/scheduler')
    expect(await screen.findByRole('heading', { level: 1, name: 'Scheduled tasks' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Scheduled tasks' })).toHaveLength(1)
    const crumbs = document.querySelector('.doc-breadcrumbs') as HTMLElement
    expect(within(crumbs).getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs')
    expect(within(crumbs).getByRole('link', { name: 'igni-client' })).toHaveAttribute('href', '/docs/sdk/igni-client')
  })

  test('every method has an anchor the table of contents points at', async () => {
    renderAt('/docs/sdk/igni-client/scheduler')
    await waitFor(() => expect(document.getElementById('session-scheduler-list')).not.toBeNull())
    const toc = document.querySelector('.doc-toc') as HTMLElement
    const hrefs = Array.from(toc.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('#session-scheduler-list')
    for (const href of hrefs) expect(document.getElementById(href!.slice(1)), href!).not.toBeNull()
  })

  test('the sidebar lists the package pages and marks this one', async () => {
    renderAt('/docs/sdk/igni-client/scheduler')
    const nav = await screen.findByRole('navigation', { name: 'igni-client documentation' })
    const current = within(nav).getByRole('link', { name: 'Scheduled tasks' })
    expect(current).toHaveAttribute('aria-current', 'page')
    for (const page of sdkPagesOf('igni-client')) {
      expect(within(nav).getAllByRole('link', { name: page.slug === 'overview' ? 'Overview' : page.title }).length).toBeGreaterThan(0)
    }
    expect(within(nav).getByRole('link', { name: /igni-service/ })).toHaveAttribute('href', sdkPath('igni-service'))
  })

  test('in-page links stay on the page; links to other pages route', async () => {
    renderAt('/docs/sdk/igni-client/scheduler')
    await screen.findByRole('heading', { level: 1, name: 'Scheduled tasks' })
    const body = document.querySelector('.sdk-article-body') as HTMLElement
    const model = (await within(body).findAllByRole('link', { name: 'ScheduledTask' }))[0]
    expect(model).toHaveAttribute('href', '/docs/sdk/igni-client/models-reference#scheduledtask')
    expect(model).not.toHaveAttribute('target')
  })

  test('the package path is its overview', async () => {
    renderAt('/docs/sdk/igni-service')
    expect(await screen.findByRole('heading', { level: 1, name: 'igni-service' })).toBeInTheDocument()
  })

  test('an unknown page says so and offers the way back', async () => {
    renderAt('/docs/sdk/igni-client/no-such-page')
    expect(await screen.findByText(/Page not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /SDK documentation/i })).toBeInTheDocument()
  })

  test.each(SDK_PAGES.map((p) => [`${p.package}/${p.slug}`] as const))(
    'every section the nav offers for %s exists in the page',
    async (key) => {
      const [pkg, slug] = key.split('/')
      const page = SDK_PAGES.find((p) => p.package === pkg && p.slug === slug)!
      renderAt(sdkPath(pkg, slug))
      await screen.findByRole('heading', { level: 1 })
      await waitFor(() => expect(document.querySelector('.sdk-article-body')?.children.length).toBeGreaterThan(0))
      const ids = new Set(Array.from(document.querySelectorAll('h2[id], h3[id]')).map((h) => h.id))
      const missing = page.sections.filter((s) => !ids.has(s.id))
      expect(missing).toEqual([])
    },
  )
})

describe('on a phone, tables and code', () => {
  test('a table keeps its roles and every filled cell carries its column name', async () => {
    renderAt('/docs/sdk/igni-client/scheduler')
    await screen.findByRole('heading', { level: 1, name: 'Scheduled tasks' })
    const body = document.querySelector('.sdk-article-body') as HTMLElement
    await waitFor(() => expect(body.querySelector('table')).not.toBeNull())
    const params = within(body).getAllByRole('table')[1]
    expect(within(params).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Parameter',
      'Type',
      'Default',
      'Meaning',
    ])
    const cells = within(params).getAllByRole('cell')
    const labels = cells.map((c) => c.querySelector('.sdk-cell-label'))
    expect(labels.map((l) => l?.textContent)).toEqual(['Parameter', 'Type', 'Default', 'Meaning'])
    // Screen readers hear the header, not the visual label as well.
    for (const label of labels) expect(label).toHaveAttribute('aria-hidden', 'true')
  })

  test('a signature is a block per line, each knowing its indentation', async () => {
    renderAt('/docs/sdk/igni-client/window')
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(document.querySelector('.code-line')).not.toBeNull())
    const lines = Array.from(document.querySelector('pre code')!.querySelectorAll(':scope > .code-line'))
    expect(lines[0].textContent).toBe('def model(')
    expect(lines[1].textContent).toBe('    self,')
    expect((lines[1] as HTMLElement).style.getPropertyValue('--indent')).toBe('4ch')
  })
})

describe('the version shown', () => {
  test('is the version igni-sdk generated the pages from, as its index says', async () => {
    const meta = SDK_PACKAGES.find((p) => p.name === 'igni-service')!
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+/)
    renderAt('/docs/sdk/igni-service')
    expect(await screen.findByText(`igni-service ${meta.version}`)).toBeInTheDocument()
  })
})

describe('the versions', () => {
  test('are every snapshot, newest first, and the latest is the bundled index', () => {
    expect(SDK_VERSIONS).toEqual(expect.arrayContaining(['0.2.0', '0.2.1', '0.2.2', '0.2.3']))
    expect([...SDK_VERSIONS].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))).toEqual(SDK_VERSIONS)
    expect(SDK_LATEST.version).toBe(LATEST)
    for (const pkg of SDK_PACKAGES) expect(pkg.version, pkg.name).toBe(LATEST)
  })

  test.each(SDK_VERSIONS.map((v) => [v] as const))('every page of %s loads, as that release', async (version) => {
    const docs = (await loadSdkDocs(version))!
    expect(docs.version).toBe(version)
    for (const pkg of docs.packages) expect(pkg.version, pkg.name).toBe(version)
    for (const page of docs.pages) {
      expect((await loadSdkContent(page, version)).startsWith(`# ${page.title}`), page.file).toBe(true)
    }
  })

  test('an SDK link moves into a pinned release, and only then', () => {
    const link = '/docs/sdk/igni-client/models-reference#scheduledtask'
    expect(sdkLinkAt(link, LATEST)).toBe(link)
    expect(sdkLinkAt(link, OLD)).toBe(`/docs/sdk/${OLD}/igni-client/models-reference#scheduledtask`)
    expect(sdkLinkAt('/docs/sdk', OLD)).toBe(`/docs/sdk/${OLD}`)
    expect(sdkLinkAt(`/docs/sdk/0.2.1/igni-client`, OLD)).toBe('/docs/sdk/0.2.1/igni-client')
    expect(sdkLinkAt('/docs/core/install', OLD)).toBe('/docs/core/install')
    expect(sdkLinkAt('#here', OLD)).toBe('#here')
  })

  test('a path at the latest is the canonical one; at a past release it is pinned', () => {
    expect(sdkPath('igni-client', 'scheduler', '', LATEST)).toBe('/docs/sdk/igni-client/scheduler')
    expect(sdkPath('igni-client', 'scheduler', '', OLD)).toBe(`/docs/sdk/${OLD}/igni-client/scheduler`)
    expect(sdkPath('igni-client', 'overview', '', OLD)).toBe(`/docs/sdk/${OLD}/igni-client`)
  })
})

describe('the version selector', () => {
  const select = () => screen.getByRole('combobox', { name: 'Documentation version' }) as HTMLSelectElement

  test('is on the SDK landing, on Latest, offering every release', async () => {
    renderAt('/docs/sdk')
    await screen.findByRole('heading', { name: sdkLabel(SDK_PACKAGES[0]) })
    expect(select().value).toBe('latest')
    expect(Array.from(select().options).map((o) => o.textContent)).toEqual([
      `Latest (v${LATEST})`,
      ...SDK_VERSIONS.map((v) => `v${v}`),
    ])
    expect(screen.queryByRole('status')).toBeNull()
  })

  test('is on a page, and choosing a release keeps the page', async () => {
    const user = userEvent.setup()
    renderAt('/docs/sdk/igni-client/scheduler')
    await screen.findByRole('heading', { level: 1, name: 'Scheduled tasks' })
    expect(select().value).toBe('latest')
    await user.selectOptions(select(), OLD)
    expect(await screen.findByText(`igni-client ${OLD}`)).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent(`/docs/sdk/${OLD}/igni-client/scheduler`)
    expect(select().value).toBe(OLD)
    await user.selectOptions(select(), 'latest')
    expect(await screen.findByText(`igni-client ${LATEST}`)).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/docs\/sdk\/igni-client\/scheduler$/)
  })

  test('on the landing, choosing a release pins the landing', async () => {
    const user = userEvent.setup()
    renderAt('/docs/sdk')
    await screen.findByRole('heading', { name: sdkLabel(SDK_PACKAGES[0]) })
    await user.selectOptions(select(), OLD)
    expect(await screen.findByRole('status')).toHaveTextContent(`You’re reading v${OLD}`)
    expect(screen.getByTestId('where')).toHaveTextContent(`/docs/sdk/${OLD}`)
  })
})

describe('a pinned release', () => {
  test('a page renders that release’s snapshot, with a banner back to the latest', async () => {
    renderAt(`/docs/sdk/${OLD}/igni-client/scheduler`)
    expect(await screen.findByText(`igni-client ${OLD}`)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Scheduled tasks' })).toBeInTheDocument()
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(`You’re reading v${OLD}; the latest is v${LATEST}.`)
    expect(within(banner).getByRole('link', { name: 'Go to the latest docs' })).toHaveAttribute(
      'href',
      '/docs/sdk/igni-client/scheduler',
    )
  })

  test('its sidebar, breadcrumbs and the page’s own links stay in the release', async () => {
    renderAt(`/docs/sdk/${OLD}/igni-client/scheduler`)
    const nav = await screen.findByRole('navigation', { name: 'igni-client documentation' })
    expect(within(nav).getByRole('link', { name: 'Scheduled tasks' })).toHaveAttribute(
      'href',
      `/docs/sdk/${OLD}/igni-client/scheduler`,
    )
    expect(within(nav).getByRole('link', { name: /igni-service/ })).toHaveAttribute('href', `/docs/sdk/${OLD}/igni-service`)
    const crumbs = document.querySelector('.doc-breadcrumbs') as HTMLElement
    expect(within(crumbs).getByRole('link', { name: 'SDK' })).toHaveAttribute('href', `/docs/sdk/${OLD}`)
    const body = document.querySelector('.sdk-article-body') as HTMLElement
    const model = (await within(body).findAllByRole('link', { name: 'ScheduledTask' }))[0]
    expect(model).toHaveAttribute('href', `/docs/sdk/${OLD}/igni-client/models-reference#scheduledtask`)
  })

  test('a package overview is `/docs/sdk/<version>/<package>`', async () => {
    renderAt(`/docs/sdk/${OLD}/igni-service`)
    expect(await screen.findByRole('heading', { level: 1, name: 'igni-service' })).toBeInTheDocument()
    expect(screen.getByText(`igni-service ${OLD}`)).toBeInTheDocument()
  })

  test('the landing lists the release’s packages, linked inside it', async () => {
    renderAt(`/docs/sdk/${OLD}`)
    const card = (await screen.findByRole('heading', { name: 'igni-client' })).closest('section')!
    expect(within(card).getByText(OLD)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Overview/ })).toHaveAttribute('href', `/docs/sdk/${OLD}/igni-client`)
    expect(screen.getByRole('status')).toHaveTextContent(`You’re reading v${OLD}`)
  })

  test('search finds pages of that release, linked inside it', async () => {
    const user = userEvent.setup()
    renderAt(`/docs/sdk/${OLD}`)
    await screen.findByRole('heading', { name: 'igni-client' })
    await user.type(screen.getByLabelText(/Search the SDK documentation/i), 'scheduler.list')
    const results = screen.getByRole('list', { name: /Search results/i })
    expect(within(results).getByRole('link', { name: /session\.scheduler\.list\(\)/ })).toHaveAttribute(
      'href',
      `/docs/sdk/${OLD}/igni-client/scheduler#session-scheduler-list`,
    )
  })

  test('a page the release does not have is not found, with the way back to that release', async () => {
    // igni-client's Fleet discovery page arrived in 0.2.2.
    renderAt('/docs/sdk/0.2.1/igni-client/fleet-discovery-and-signing-in')
    expect(await screen.findByText(/Page not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /SDK documentation/i })).toHaveAttribute('href', '/docs/sdk/0.2.1')
  })

  test('pinned to the latest release, it shows that version selected and no banner', async () => {
    renderAt(`/docs/sdk/${LATEST}/igni-client/scheduler`)
    await screen.findByText(`igni-client ${LATEST}`)
    expect((screen.getByRole('combobox', { name: 'Documentation version' }) as HTMLSelectElement).value).toBe(LATEST)
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the latest alias', () => {
  test('`/docs/sdk/latest/<package>/<page>` is the newest release, on Latest', async () => {
    renderAt('/docs/sdk/latest/igni-client/scheduler')
    expect(await screen.findByText(`igni-client ${LATEST}`)).toBeInTheDocument()
    expect((screen.getByRole('combobox', { name: 'Documentation version' }) as HTMLSelectElement).value).toBe('latest')
    expect(screen.queryByRole('status')).toBeNull()
  })

  test('`/docs/sdk/latest` is the landing and `/docs/sdk/latest/<package>` an overview', async () => {
    renderAt('/docs/sdk/latest')
    expect(await screen.findByRole('heading', { level: 1, name: 'SDK documentation' })).toBeInTheDocument()
    cleanup()
    renderAt('/docs/sdk/latest/igni-service')
    expect(await screen.findByRole('heading', { level: 1, name: 'igni-service' })).toBeInTheDocument()
  })
})
