/**
 * Every page, on a phone.
 *
 * Two things a jsdom test cannot see and a desktop browser never shows:
 *
 * 1. **The page scrolls sideways.** One element wider than the screen
 *    (a long label on a nowrap button did it to every docs article)
 *    and a phone widens its layout viewport to fit, so the whole page
 *    renders zoomed out with 10px text. The check is the document's
 *    scroll width against the width the page was given.
 *
 * 2. **Something to tap is smaller than a finger.** Interactive elements
 *    must be at least 40×40px. A link inside a sentence is exempt (its
 *    size is the line's, and padding it would break the paragraph), and
 *    so is a control inside a larger label, which takes the tap for it.
 *
 * The routes come from `scripts/site-routes.mjs`, the same list the
 * deploy uploads, so a new page is covered without touching this file.
 */
import { execFileSync } from 'node:child_process'
import { test, expect, devices } from '@playwright/test'

const ROUTES = [
  '',
  ...execFileSync('node', ['scripts/site-routes.mjs'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    // Redirects to `/`, which is already in the list.
    .filter((r) => r !== 'old' && r !== 'alt'),
]

const WIDTHS = [360, 390]
const MIN_TARGET = 40

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({
      viewport: { width, height: 780 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      userAgent: devices['Pixel 7'].userAgent,
    })

    for (const route of ROUTES) {
      test(`/${route}`, async ({ page }) => {
        await page.goto(`/${route}`)
        await page.waitForLoadState('networkidle')

        const { scrollWidth, wide, small } = await page.evaluate(
          ({ width, min }) => {
            const describe = (el: Element) => {
              const cls = [...el.classList].slice(0, 2).join('.')
              const text = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)
              return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${text}"`
            }

            // Elements sticking out past the right edge, outermost first,
            // skipping any inside a box that scrolls or clips them.
            const wide: string[] = []
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect()
              if (r.width === 0 || r.right <= width + 1) continue
              let clipped = false
              for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) { clipped = true; break }
              }
              if (!clipped) wide.push(`${describe(el)} right=${Math.round(r.right)}`)
              if (wide.length >= 5) break
            }

            const visible = (el: Element) => {
              const r = el.getBoundingClientRect()
              if (r.width === 0 || r.height === 0) return false
              const cs = getComputedStyle(el)
              return cs.visibility !== 'hidden' && !el.closest('[aria-hidden="true"], [inert]')
            }

            // A link that is part of running text: inline, and the block
            // it sits in (past any <strong> or <em> around it) has words
            // of its own besides the link's.
            const inline = (el: Element) => {
              if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline') return false
              let block = el.parentElement
              while (block && getComputedStyle(block).display === 'inline') block = block.parentElement
              if (!block) return false
              const own = (el.textContent || '').trim().length
              const all = (block.textContent || '').trim().length
              return all > own + 1
            }

            const insideBigLabel = (el: Element) => {
              const label = el.closest('label')
              if (!label || label === el) return false
              const r = label.getBoundingClientRect()
              return r.width >= min && r.height >= min
            }

            const small: string[] = []
            const selector = 'a[href], button, [role="button"], [role="tab"], input:not([type="hidden"]), select, textarea, summary'
            for (const el of document.querySelectorAll(selector)) {
              if (!visible(el) || inline(el) || insideBigLabel(el)) continue
              const r = el.getBoundingClientRect()
              if (r.width < min - 0.5 || r.height < min - 0.5) {
                small.push(`${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
              }
            }

            return { scrollWidth: document.scrollingElement!.scrollWidth, wide, small }
          },
          { width, min: MIN_TARGET },
        )

        expect(scrollWidth, `page scrolls sideways; wider than the screen:\n${wide.join('\n')}`).toBeLessThanOrEqual(width)
        expect(small, `tap targets under ${MIN_TARGET}×${MIN_TARGET}px`).toEqual([])
      })
    }
  })
}
