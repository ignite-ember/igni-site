/**
 * The landing page, in a real browser.
 *
 * This spec used to test `/old` — the previous per-seat marketing page,
 * which DEC-12 retired behind a redirect to `/`. Every test navigated
 * to `/old`, was redirected to the current page, and asserted the old
 * page's content against it. Three failed on content that no longer
 * exists anywhere ("Public Beta" badge, "Sign up" buttons, a "Features"
 * nav item).
 *
 * **The other two passed**, which is the worse half: "Docs link
 * navigates to /docs" and "GitHub link points at the public repo" are
 * true of the new page as well, so they were green while testing a page
 * they were never written for. A spec that survives the deletion of its
 * subject is not coverage.
 *
 * Nothing caught it because nothing ran it: CI runs this suite, and CI
 * had not run for nine days.
 *
 * What is asserted here is what a browser can see and a jsdom unit test
 * cannot. `LandingPage.test.tsx` already checks that every in-page
 * anchor has a matching section id; this checks that clicking one
 * actually moves the page, which is a layout property — an ancestor
 * with `overflow: hidden` breaks scrolling while leaving every id
 * exactly where the unit test looks for it.
 */
import { test, expect } from '@playwright/test'

test.describe('the retired page stays retired', () => {
  test('/old redirects to the current landing page', async ({ page }) => {
    // DEC-12: "redirect now, delete later". Two public pages
    // contradicting each other — one saying igni is free, one showing a
    // per-seat price — was the reason.
    await page.goto('/old')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /inside your network/i })).toBeVisible()
  })

  test('/alt redirects too, because links to it were shared', async ({ page }) => {
    await page.goto('/alt')

    await expect(page).toHaveURL(/\/$/)
  })

  test('nothing on the live page still advertises the retired one', async ({ page }) => {
    // The contradiction DEC-12 removed: a "Public Beta" badge and a
    // per-seat pricing nav item on a page that says the software is
    // free. If either comes back, it comes back on purpose.
    await page.goto('/')

    await expect(page.getByText(/Public Beta/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Sign up$/i })).toHaveCount(0)
  })
})

test.describe('the landing page renders', () => {
  test('the hero states the offer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /inside your network/i })).toBeVisible()
    // The strip under it: where it runs, and what leaves.
    await expect(page.getByText('Air-gapped, or on dedicated GPUs you rent.')).toBeVisible()
    await expect(page.getByText('Outbound connections of its own in air-gap mode.')).toBeVisible()
  })

  test('the entry price is on screen', async ({ page }) => {
    await page.goto('/')

    // Per-seat now, graduated by headcount — not the old per-module band price.
    await expect(page.locator('.lp-hero-note')).toContainText('€160 a person a year')
    await expect(page.locator('.lp-hero-note')).toContainText('graduated by headcount')
  })
})

test.describe('the navigation works in a browser', () => {
  test('every in-page anchor scrolls to its section', async ({ page }) => {
    // Derived from the nav rather than listed: a hardcoded list is how
    // the previous version of this spec ended up looking for a
    // "Features" link that no longer exists. The unit test checks the
    // ids resolve; this checks the page actually moves, which only a
    // real layout can answer.
    await page.goto('/')

    const hrefs = await page.locator('.landing-nav-links a[href^="#"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('href') ?? ''),
    )
    expect(hrefs.length).toBeGreaterThan(3)

    for (const href of hrefs) {
      const id = href.slice(1)
      await page.locator(`.landing-nav-links a[href="${href}"]`).click()

      await expect(page).toHaveURL(new RegExp(`#${id}$`))
      const section = page.locator(`#${id}`)
      await expect(section).toBeVisible()

      // The section is actually near the top of the viewport, which is
      // the part a jsdom test cannot see.
      const box = await section.boundingBox()
      expect(box, `#${id} has no layout box`).not.toBeNull()
      expect(box!.y, `#${id} did not scroll into view`).toBeLessThan(400)
    }
  })

  test('Docs goes to the docs index', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /^Docs$/i }).first().click()

    await expect(page).toHaveURL(/\/docs$/)
  })

  test('the nav offers a call, not a sign-in', async ({ page }) => {
    // Ignite Ember hosts nothing a visitor could sign in to.
    await page.goto('/')
    const nav = page.locator('.landing-nav')

    await expect(nav.getByRole('button', { name: /^Sign in$/i })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: /^Schedule a call$/i })).toHaveAttribute(
      'href',
      /calendly\.com/,
    )
  })

  test('the GitHub link points at the public repo', async ({ page }) => {
    await page.goto('/')
    const github = page.getByRole('link', { name: /^Source$/ }).first()

    await expect(github).toHaveAttribute('href', /github\.com\/ignite-ember/)
  })
})

test.describe('the deal estimator', () => {
  test('picking a preset changes the quote', async ({ page }) => {
    // The pricing section's centrepiece. If it renders and does not
    // respond, the page is making its case with a dead control.
    await page.goto('/')
    const total = page.locator('.lp-est-total-annual')
    await expect(total).toHaveText('€40,000')

    await page.getByRole('button', { name: /Several departments/ }).click()
    await expect(total).toHaveText('€143,000')
  })
})
