/**
 * The SDK documentation: `/docs/sdk`, `/docs/sdk/<package>` and
 * `/docs/sdk/<package>/<page>`.
 *
 * Asserted over the real pages igni-sdk generated (`src/docs/sdk/`), as
 * the article tests are over the real manifest: a fixture would agree
 * with a page list that has gone stale.
 */
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test/render'
import { SDK_PACKAGES, SDK_PAGES, loadSdkContent, sdkPagesOf, sdkPath, sdkToc, searchSdk } from '../../docs/sdkManifest'
import { SdkArticlePage } from '../SdkArticlePage'
import { SdkLandingPage } from '../SdkLandingPage'

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

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/docs" element={<div>docs index stub</div>} />
      <Route path="/docs/sdk" element={<SdkLandingPage />} />
      <Route path="/docs/sdk/:pkg" element={<SdkArticlePage />} />
      <Route path="/docs/sdk/:pkg/:page" element={<SdkArticlePage />} />
    </Routes>,
    { route },
  )
}

describe('the pages igni-sdk generated', () => {
  test('there are three packages, each with an overview, a guide and a reference', () => {
    expect(SDK_PACKAGES.map((p) => p.name).sort()).toEqual(['igni-client', 'igni-extension', 'igni-service'])
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
  test('shows the three packages, what each is for and where it runs', async () => {
    renderAt('/docs/sdk')
    for (const pkg of SDK_PACKAGES) {
      expect(await screen.findByRole('heading', { name: pkg.name })).toBeInTheDocument()
    }
    expect(screen.getAllByText(/Where it runs:/)).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs')
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
