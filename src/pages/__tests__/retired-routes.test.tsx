/**
 * Retired public routes must redirect, not 404 and not serve stale copy.
 *
 * DEC-12. `/old` served the previous per-seat landing page: a "Public Beta"
 * badge, a "Download Windows" button shown to macOS visitors, and a "Pricing"
 * nav item — against a live page that says igni itself is free. Two public
 * pages contradicting each other, one reachable by anyone who guessed the URL.
 *
 * The decision was redirect now, delete later. Both halves are done: the
 * redirect is here, and the page file was deleted deliberately on
 * 2026-10-31, before the repository was published. What is worth asserting:
 *
 * 1. `/old` lands on the live page. A 404 would break shared links, and
 *    leaving the route would keep the contradiction.
 * 2. No route renders `LandingPageOld`, and the file is gone, so nobody
 *    tidying up can re-import it.
 *
 * `/alt` is here too. It was the live page's address during review and has
 * redirected ever since; it is the precedent DEC-12 followed, and an untested
 * precedent is how the second one gets done differently.
 *
 * `App` is rendered directly rather than through `renderWithProviders`,
 * because it brings its own `BrowserRouter` — two routers nested is an
 * invariant violation, and the point of this file is to exercise the real
 * route table rather than a copy of it that could disagree.
 *
 * This repository is the public site and nothing else, so `App` is the
 * site's route table. Until 2026-10-31 it lived in the igni server portal
 * behind a `VITE_PUBLIC_SITE` build flag; the portal's own `/` opens its
 * dashboard, and that is tested there.
 */
import { beforeEach, describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The whole app is imported, which can take several seconds when the
// full suite is running in parallel.
const IMPORT_TIMEOUT_MS = 30_000

async function loadApp() {
  return (await import('../../App')).default
}

// `import.meta.url` is not a file: URL under the jsdom environment, so the
// path is resolved from the vitest working directory (the repository root) instead.
const APP_SOURCE = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')

describe('retired public routes redirect to the live page', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  test.each(['/old', '/alt'])('%s serves the live landing page', async (route) => {
    window.history.pushState({}, '', route)
    const App = await loadApp()

    render(<App />)

    // Copy the retired page carried and the live one does not. Asserting
    // on its absence is what distinguishes "redirected" from "still
    // serving the old page" — a check that only looked for the live
    // page's own text would pass on a page showing both.
    expect(await screen.findByRole('heading', { level: 1, name: /^igni$/i })).toBeInTheDocument()
    expect(screen.queryByText(/public beta/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/download for windows/i)).not.toBeInTheDocument()

    // And the URL is the live one, so a visitor's address bar agrees with
    // what they are looking at. `replace` rather than `push`, so Back
    // does not bounce them straight into the redirect again.
    expect(window.location.pathname).toBe('/')
  }, IMPORT_TIMEOUT_MS)
})

describe('the route table itself', () => {
  test('declares /old as a redirect', () => {
    expect(APP_SOURCE).toMatch(/path="\/old"\s+element=\{<Navigate to="\/" replace \/>\}/)
  })

  test('no route renders the retired page component', () => {
    // Read from the source rather than by rendering every route: a
    // rendering test could only ever check the routes somebody thought
    // to try, and the component is meant to still exist as a file — so
    // "is it reachable" is a question about the router.
    expect(APP_SOURCE).not.toContain('LandingPageOld')
  })

  test('the decision is recorded where the change is', () => {
    // Without this, the next reader sees a redirect with no reason and
    // the obvious tidy-up is to delete the route entirely — which is the
    // outcome DEC-12 explicitly did not choose.
    expect(APP_SOURCE).toContain('DEC-12')
  })
})

describe('the retired component is gone', () => {
  test('its file was deleted, deliberately', () => {
    // The deletion half of DEC-12, done on 2026-10-31. If this fails,
    // somebody brought the retired page back: a second public page that
    // contradicts the live one.
    const pages = import.meta.glob('../*.tsx')

    expect(Object.keys(pages)).not.toContain('../LandingPageOld.tsx')
    expect(Object.keys(pages)).toContain('../LandingPage.tsx')
  })
})
