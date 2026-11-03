/**
 * Render template.html to public/og-image.png at 1200×630.
 *
 *     npm run og-image
 *
 * Uses Playwright's Chromium (a dev dependency already, for the e2e
 * tests). Fonts are the system stack, so render on macOS to match the
 * committed image.
 */
import { chromium } from '@playwright/test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '../../public/og-image.png')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.goto(pathToFileURL(join(HERE, 'template.html')).href)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } })
await browser.close()
console.log(`wrote ${OUT}`)
