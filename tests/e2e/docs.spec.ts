/**
 * The documentation, in a real browser.
 *
 * Moved from the igni server portal's `functional.spec.ts` when the
 * site got its own repository.
 */
import { test, expect } from '@playwright/test'

test.describe('docs', () => {
  test('an article opens from the index and the footer advances', async ({ page }) => {
    await page.goto('/docs')
    const first = page.locator('.doc-card').first()
    const title = (await first.locator('.doc-card-title').innerText()).trim()
    await first.click()

    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()

    // The prev/next footer is the only way through the set in order.
    const next = page.locator('.doc-prev-next a, .doc-prev-next button').last()
    await next.click()
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(title)
  })

  test('a table-of-contents link lands on its heading', async ({ page }) => {
    await page.goto('/docs')
    await page.locator('.doc-card').first().click()
    const toc = page.locator('a[href^="#"]').first()
    test.skip(!(await toc.isVisible().catch(() => false)), 'this article has no sections')

    const id = (await toc.getAttribute('href'))!.slice(1)
    await toc.click()

    const heading = page.locator(`#${CSS.escape(id)}`)
    await expect(heading).toBeVisible()
  })
})
