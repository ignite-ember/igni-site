/**
 * The AgentCore comparison, in a real browser.
 *
 * `AgentCorePage.test.tsx` checks the content and that every bar is
 * drawn to its number. What only a browser can answer is layout: the
 * page is tables and figures, and the failure that matters is one of
 * them pushing the whole page sideways on a phone. Wide tables may
 * scroll inside their own box; the page may not.
 */
import { test, expect, type Page } from '@playwright/test'

const URL = '/compare/agentcore'

async function pageOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

test.describe('the comparison renders', () => {
  test('with its title and the date AWS was checked', async ({ page }) => {
    await page.goto(URL)

    await expect(page.getByRole('heading', { level: 2, name: 'igni + Fleet vs AWS Bedrock AgentCore' })).toBeVisible()
    await expect(page.locator('.cmp-meta')).toContainText('1–2 November 2026')
    await expect(page).toHaveTitle(/AgentCore/)
  })

  test('a contents link scrolls to its section', async ({ page }) => {
    await page.goto(URL)
    await page.locator('.cmp-toc a[href="#cost"]').click()

    await expect(page).toHaveURL(/#cost$/)
    const box = await page.locator('#cost').boundingBox()
    expect(box!.y).toBeLessThan(400)
  })
})

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`on a phone, ${colorScheme}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, colorScheme })

    test('the page never scrolls sideways', async ({ page }) => {
      await page.goto(URL)
      // Images load lazily; the layout must not depend on them.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      expect(await pageOverflow(page)).toBe(0)
    })

    test('the screenshots follow the theme', async ({ page }) => {
      await page.goto(URL)
      const img = page.locator('.cmp-shot img').first()
      await img.scrollIntoViewIfNeeded()
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.currentSrc)).toMatch(
        colorScheme === 'dark' ? /-dark/ : /-light/,
      )
    })
  })
}

test.describe('the site links to it', () => {
  test('from the Fleet page', async ({ page }) => {
    await page.goto('/fleet')
    await page.getByRole('link', { name: 'igni + Fleet vs AWS Bedrock AgentCore' }).click()

    await expect(page).toHaveURL(/\/compare\/agentcore$/)
  })

  test('from the footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.landing-footer a[href="/compare/agentcore"]')).toHaveText('igni vs AgentCore')
  })
})
