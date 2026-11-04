/**
 * The download page works, and stays unlisted until somebody decides
 * otherwise.
 *
 * "Hidden" is four separate facts and nothing connected them, so each
 * is checked here: no link from the landing page, no entry in the
 * sitemap, a `Disallow` in `robots.txt`, and a `noindex` on the page
 * itself. Publishing it should be a deliberate edit that turns these
 * red, not something that happens by accident when somebody adds a
 * nav item.
 *
 * The rendering tests do not reach the network. `fetch` is stubbed,
 * including the failing case, because "GitHub is rate-limiting you"
 * is a normal state on a shared office IP and the page has to stay
 * useful in it.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DownloadPage } from '../DownloadPage'
import { buildSitemap } from '../../../scripts/generate-sitemap.mjs'

const RELEASE = {
  tag_name: 'v1.0.3',
  assets: [
    { name: 'igni_1.0.3_aarch64.dmg', browser_download_url: 'https://e.test/arm.dmg', size: 1 << 20 },
    { name: 'igni_1.0.3_x64.dmg', browser_download_url: 'https://e.test/intel.dmg', size: 1 << 20 },
    { name: 'igni_1.0.3_x64_en-US.msi', browser_download_url: 'https://e.test/win.msi', size: 1 << 20 },
    { name: 'igni_1.0.3_amd64.AppImage', browser_download_url: 'https://e.test/lin.AppImage', size: 1 << 20 },
    { name: 'ember-code-vscode-1.0.3.vsix', browser_download_url: 'https://e.test/x.vsix', size: 1 << 20 },
    { name: 'ember-code-jetbrains-1.0.3.zip', browser_download_url: 'https://e.test/jetbrains.zip', size: 1 << 20 },
    { name: 'latest.json', browser_download_url: 'https://e.test/latest.json', size: 10 },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DownloadPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove())
})

describe('with a release to show', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(RELEASE) }),
    )
  })

  it('offers a primary download', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText(/^Download for /)).toBeInTheDocument())
  })

  it('lists every platform', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Windows')).toBeInTheDocument())
    expect(screen.getByText('macOS — Apple silicon')).toBeInTheDocument()
    expect(screen.getByText('macOS — Intel')).toBeInTheDocument()
    expect(screen.getByText('Linux')).toBeInTheDocument()
  })

  it('never offers the updater manifest', async () => {
    const { container } = renderPage()

    await waitFor(() => expect(screen.getByText('Windows')).toBeInTheDocument())
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')

    expect(hrefs.filter((h) => h.includes('latest.json'))).toEqual([])
  })

  it('offers no IDE plugin, even when the release still carries one', async () => {
    // igni no longer supports the VS Code and JetBrains plugins. The
    // fixture keeps a .vsix and a JetBrains zip on purpose: older
    // releases have them, and the page must not hand them out.
    const { container } = renderPage()

    await waitFor(() => expect(screen.getByText('Windows')).toBeInTheDocument())
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')

    expect(hrefs.filter((h) => h.endsWith('.vsix') || /jetbrains/i.test(h))).toEqual([])
    expect(container.textContent).not.toMatch(/VS ?Code|JetBrains|vsix|marketplace/i)
    expect(container.textContent).not.toMatch(/\bIDE\b/)
  })

  it('still offers the CLI', async () => {
    const { container } = renderPage()

    await waitFor(() => expect(screen.getByText('Windows')).toBeInTheDocument())
    expect(container.textContent).toContain('pip install ignite-ember')
  })

  it('says what the first launch needs', async () => {
    const { container } = renderPage()

    await waitFor(() => expect(screen.getByText('Windows')).toBeInTheDocument())

    // Both facts, because somebody decides on them before downloading
    // 180 MB onto a work laptop — not after.
    expect(container.textContent).toContain('1 GB of free disk')
    expect(container.textContent).toContain('first run only')
  })
})

describe('when GitHub cannot be reached', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rate limited')))
  })

  it('still routes somebody to the files', async () => {
    const { container } = renderPage()

    await waitFor(() => {
      const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')
      expect(hrefs).toContain('https://github.com/ignite-ember/igni/releases')
    })
  })

  it('says so rather than showing an empty page', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText(/Could not reach GitHub/)).toBeInTheDocument())
  })
})

describe('it stays unlisted', () => {
  const ROOT = process.cwd()

  it('sets noindex while it is open', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')))
    const { unmount } = renderPage()

    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
        'noindex, nofollow',
      ),
    )

    // And takes it away again, so it cannot leak onto another page.
    unmount()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('is disallowed in robots.txt', () => {
    const robots = readFileSync(join(ROOT, 'public/robots.txt'), 'utf8')

    expect(robots).toContain('Disallow: /download')
  })

  it('is absent from the sitemap', () => {
    expect(buildSitemap()).not.toContain('/download')
  })

  it('is not linked from the landing page', () => {
    const landing = readFileSync(join(ROOT, 'src/pages/LandingPage.tsx'), 'utf8')

    // The whole point of "hidden for now". Launching it means editing
    // this test, which is the right amount of friction.
    expect(landing).not.toContain('/download')
  })
})
