/**
 * The SDK documentation, in a real browser: from the docs index to a
 * method's own heading, on a desktop and on a phone. (Every SDK page is
 * also in `mobile-layout.spec.ts`, through `scripts/site-routes.mjs`.)
 */
import { readFileSync } from 'node:fs'
import { test, expect, devices } from '@playwright/test'

test.describe('SDK docs', () => {
  test('the docs index leads to a package and its reference', async ({ page }) => {
    await page.goto('/docs')
    await page.getByRole('link', { name: 'All SDK documentation' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'SDK documentation' })).toBeVisible()

    await page.locator('.sdk-package-card', { hasText: 'igni-client' }).getByRole('link', { name: /Overview/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'igni-client' })).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'igni-client documentation' })
    await nav.getByRole('link', { name: 'Scheduled tasks' }).click()
    await expect(page).toHaveURL(/\/docs\/sdk\/igni-client\/scheduler$/)
    await expect(page.getByRole('heading', { level: 2, name: 'session.scheduler.list()' })).toBeVisible()
  })

  test('a link to a method opens at its heading', async ({ page }) => {
    await page.goto('/docs/sdk/igni-client/scheduler#session-scheduler-start')
    const heading = page.locator('#session-scheduler-start')
    await expect(heading).toBeInViewport()
  })

  test('searching the docs index finds a method', async ({ page }) => {
    await page.goto('/docs')
    await page.getByLabel(/Search documentation/i).fill('scheduler.list')
    await page.getByRole('link', { name: /session\.scheduler\.list\(\)/ }).click()
    await expect(page).toHaveURL(/scheduler#session-scheduler-list$/)
    await expect(page.locator('#session-scheduler-list')).toBeInViewport()
  })

  test('a type in a signature links to its model', async ({ page }) => {
    await page.goto('/docs/sdk/igni-client/scheduler')
    await page.locator('.sdk-article-body').getByRole('link', { name: 'ScheduledTask' }).first().click()
    await expect(page).toHaveURL(/models-reference#scheduledtask$/)
    await expect(page.locator('#scheduledtask')).toBeInViewport()
  })
})

test.describe('SDK docs on a phone', () => {
  test.use({
    viewport: { width: 360, height: 780 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: devices['Pixel 7'].userAgent,
  })

  test('a reference page fits the screen, and its page list opens and navigates', async ({ page }) => {
    await page.goto('/docs/sdk/igni-client/scheduler')
    await expect(page.getByRole('heading', { level: 1, name: 'Scheduled tasks' })).toBeVisible()
    await expect(page.locator('#session-scheduler-list')).toBeAttached()

    const width = await page.evaluate(() => document.scrollingElement!.scrollWidth)
    expect(width).toBeLessThanOrEqual(360)

    // The sidebar is a collapsed list above the article.
    await expect(page.locator('.sdk-sidebar')).toBeHidden()
    const list = page.locator('.sdk-sidebar-mobile')
    const summary = list.locator('summary')
    const box = await summary.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(40)
    await summary.tap()
    await list.getByRole('link', { name: 'Workflows' }).tap()
    await expect(page).toHaveURL(/\/docs\/sdk\/igni-client\/workflows$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Workflows' })).toBeVisible()
    await expect(list).not.toHaveAttribute('open', '')
  })

  test('the table of contents jumps to a method', async ({ page }) => {
    await page.goto('/docs/sdk/igni-client/scheduler')
    const toc = page.locator('.doc-toc-mobile')
    await toc.locator('summary').tap()
    await toc.getByRole('link', { name: 'session.scheduler.start()' }).tap()
    await expect(page.locator('#session-scheduler-start')).toBeInViewport()
  })
})

/**
 * Every SDK reference page at 360px: no table cell off the screen and
 * nothing in the article that scrolls sideways — tables are cards and
 * code wraps there. The page not scrolling is mobile-layout.spec.ts's
 * check; a table or a code block scrolling inside the article passed it
 * while its fourth column sat off the screen.
 */
const SDK_INDEX = JSON.parse(readFileSync('src/docs/sdk/index.json', 'utf8')) as {
  pages: { package: string; slug: string; category: string }[]
}
const REFERENCE = SDK_INDEX.pages.filter((p) => p.category === 'reference')

test.describe('SDK reference pages at 360px', () => {
  test.use({
    viewport: { width: 360, height: 780 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: devices['Pixel 7'].userAgent,
  })

  for (const p of REFERENCE) {
    test(`${p.package}/${p.slug}`, async ({ page }) => {
      await page.goto(`/docs/sdk/${p.package}/${p.slug}`)
      await expect(page.locator('.sdk-article-body > *').first()).toBeAttached()

      const problems = await page.evaluate((width) => {
        const body = document.querySelector('.sdk-article-body')!
        const out: string[] = []
        const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 40)}"`
        for (const cell of body.querySelectorAll('td')) {
          const r = cell.getBoundingClientRect()
          if (r.width === 0) continue
          if (r.left < -0.5 || r.right > width + 0.5) out.push(`cell off screen: ${name(cell)} ${Math.round(r.left)}..${Math.round(r.right)}`)
        }
        for (const el of body.querySelectorAll('*')) {
          // The header row is visually hidden on purpose, for screen readers.
          if (el.closest('thead')) continue
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') {
            out.push(`scrolls sideways: ${name(el)} ${el.scrollWidth}>${el.clientWidth}`)
          }
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.right > width + 0.5) out.push(`past the edge: ${name(el)} right=${Math.round(r.right)}`)
          if (out.length > 8) break
        }
        return out
      }, 360)

      expect(problems).toEqual([])
    })
  }
})
