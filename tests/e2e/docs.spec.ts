/**
 * The documentation, in a real browser.
 *
 * Moved from the igni server portal's `functional.spec.ts` when the
 * site got its own repository. Since the per-package split, `/docs` is a
 * product grid: a package card opens that package's landing, and the
 * landing lists its articles.
 */
import { test, expect } from '@playwright/test'

test.describe('docs', () => {
  test('a product opens, an article opens from it, and the footer advances', async ({ page }) => {
    await page.goto('/docs')

    // The index is a product grid; open the first package.
    await page.locator('.product-card').first().click()
    await expect(page).toHaveURL(/\/docs\/[a-z]+$/)

    // The package landing lists its own articles; open the first.
    const firstArticle = page.locator('.doc-card').first()
    const title = (await firstArticle.locator('.doc-card-title').innerText()).trim()
    await firstArticle.click()

    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()

    // The prev/next footer is the only way through the package in order.
    const next = page.locator('.doc-prev-next a, .doc-prev-next button').last()
    await next.click()
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(title)
  })

  test('a table-of-contents link lands on its heading', async ({ page }) => {
    await page.goto('/docs')
    // Grid -> package landing -> an article.
    await page.locator('.product-card').first().click()
    await page.locator('.doc-card').first().click()
    // Wait for the article: checking before it renders skipped the test.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // :visible, because below 900px the same links are in a collapsed
    // "On this page" above the article, first in the document.
    const toc = page.locator('a[href^="#"]:visible').first()
    test.skip(!(await toc.isVisible().catch(() => false)), 'this article has no sections')

    const id = (await toc.getAttribute('href'))!.slice(1)
    await toc.click()

    // CSS.escape exists only in the browser; an attribute selector needs no escaping.
    const heading = page.locator(`[id="${id.replace(/"/g, '\\"')}"]`)
    await expect(heading).toBeVisible()
  })
})

/**
 * Per-package versioning (Phase 2): a reader on an old version can read
 * that version's docs. With one release per package today there is no
 * older snapshot yet, but the machinery — the URL version segment, the
 * selector, the `latest` alias — is exercised here so a future release's
 * second snapshot lands on a tested path.
 */
test.describe('docs versions', () => {
  test('the version selector pins the version into the URL on a package landing', async ({ page }) => {
    await page.goto('/docs/server')
    // The header carries a version selector.
    const selector = page.getByLabel('Documentation version')
    await expect(selector).toBeVisible()

    // Pinning the current release puts the version in the URL.
    await selector.selectOption('0.8')
    await expect(page).toHaveURL(/\/docs\/server\/0\.8$/)
    await expect(page.getByRole('heading', { level: 1, name: 'igni server' })).toBeVisible()

    // Back to "Latest" returns to the canonical, version-less URL.
    await page.getByLabel('Documentation version').selectOption('latest')
    await expect(page).toHaveURL(/\/docs\/server$/)
  })

  test('an article can be pinned to a version and read there', async ({ page }) => {
    await page.goto('/docs/server/self-hosting-the-server')
    const title = await page.getByRole('heading', { level: 1 }).innerText()

    await page.getByLabel('Documentation version').selectOption('0.8')
    await expect(page).toHaveURL(/\/docs\/server\/0\.8\/self-hosting-the-server$/)
    // The same article, now at a pinned URL.
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  })

  test('the latest alias resolves to the newest snapshot', async ({ page }) => {
    await page.goto('/docs/server/latest/self-hosting-the-server')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/Article not found/i)).toHaveCount(0)
    // The version selector is still there and reads the newest version.
    await expect(page.getByLabel('Documentation version')).toBeVisible()
  })

  test("a retired Phase-1 URL still redirects to the latest per-package path", async ({ page }) => {
    await page.goto('/docs/self-hosting-the-server')
    await expect(page).toHaveURL(/\/docs\/server\/self-hosting-the-server$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('a parked module shows its label, not a version selector', async ({ page }) => {
    await page.goto('/docs/artifacts')
    await expect(page.getByLabel('Documentation version')).toHaveCount(0)
    await expect(page.getByText('Paid module').first()).toBeVisible()
  })
})
