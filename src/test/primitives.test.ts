/**
 * Every value in product CSS should be a Primer primitive.
 *
 * Not a rule that can be applied all at once. A sweep of the igni portal's
 * stylesheets found **1,172** hardcoded colours and sizes, and 823 of
 * them were in the two marketing landing pages, which carry a deliberate
 * brand palette rather than the product's design system. Those pages now
 * live here, in the site's own repository; the portal keeps the same
 * rule over its own stylesheets. Converting them
 * in one change would touch every section at once with no visual
 * baselines to catch what moved — so a big-bang rewrite is precisely the
 * change that cannot be verified.
 *
 * So this is a **ratchet**, not a gate. Each file carries the number of
 * literals it had when the rule was written; the count may fall and
 * never rise, and a file not listed must have none at all. New CSS is
 * therefore held to the standard immediately, and the debt can only be
 * paid down.
 *
 * A ratchet rather than an exemption list because an exemption never
 * expires. This one names a number, and the number is the work left.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

// vitest runs from the repository root, so this is stable whichever file
// the test lives in.
const SRC = join(process.cwd(), 'src')

/**
 * Literals that are Primer's job to decide.
 *
 * A value inside `var(--token, fallback)` is not counted: the fallback
 * is the token's own published value, written for the case where the
 * primitives stylesheet has not loaded, and is the documented way to
 * write one.
 */
const HEX = /#[0-9a-fA-F]{3,8}\b/g
const PX = /(?<![\w-])(\d+(?:\.\d+)?)px/g

/**
 * What each file still owes, as of this rule being written.
 *
 * The two landing pages are the bulk and are listed at their current
 * numbers rather than exempted: they are a marketing surface with its
 * own visual language, and if that ever changes the ceiling is here to
 * lower.
 */
const CEILINGS: Record<string, number> = {
  // +1 on 2026-11-03: the phone breakpoint for the nav, menu and footer
  // tap targets. A `@media` condition cannot read a custom property.
  'pages/landing-shared.css': 512,
  // Raised from 282 on 2026-10-28: the page was rewritten for the
  // modular price list, with a drawn platform diagram, department mocks,
  // a deal estimator, the Fleet grid, the extensions mocks and the partner
  // block, the 2026-10-29 visual pass (bands, accordion, phone layouts), the
  // factory showcase, the app screenshot and the extension code windows — all
  // marketing visuals.
  // +1 on 2026-11-03: the breakpoint of the phone pass (tabs, switch,
  // code windows, product-page spacing).
  // +4 on 2026-11-06: the deal estimator moved from band radios to a
  // graduated per-seat headcount input, adding the number field, its
  // "Not now" toggle, the inline price and the rate-card table — control
  // sizes (field widths, font sizes, the 10px radius) with no primitive.
  'pages/LandingPage.css': 794,
  // +3 on 2026-11-03: breakpoints for the stacked prev/next, the
  // narrow-screen table of contents and the phone pass.
  'pages/DocsPage.css': 100,
  // Geometry inside a `viewBox`, which is not CSS pixels. A
  // `font-size` on SVG text is a length in *user units* that scales
  // with the drawing, so a text-size token there would size a label
  // against the page instead of against the figure it is in — and the
  // figure would re-proportion itself whenever Primer retuned the
  // token. `min-width` is the drawing's own intrinsic width, below
  // which it scrolls. Colour in this file is all tokens. +1 on
  // 2026-11-03: the breakpoint for the scroll shadow on a phone.
  'docs/DocDiagram.css': 9,
  // Two content-column widths, a grid minimum and a breakpoint.
  // Primer publishes no token for "how wide should this page's
  // column be", a spacing token used as a width is a token used for
  // the wrong thing, and a `@media` condition cannot read a custom
  // property at all. Every colour in this file is a token. +1 on
  // 2026-11-03: the phone breakpoint. −1 on 2026-11-04: the IDE
  // plugin cards, and their grid minimum, went (decision D19).
  'pages/DownloadPage.css': 5,
  // Three breakpoints (the third, 2026-11-03, for the phone pass),
  // which a `@media` condition cannot take from a
  // custom property, and the 1px box of the standard visually-hidden
  // pattern (a status word kept for screen readers on a phone).
  // Everything else in the file is a token, or rem for a column width
  // Primer has no token for.
  'pages/AgentCorePage.css': 5,
}

function stylesheets(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) stylesheets(path, found)
    else if (entry.endsWith('.css')) found.push(path)
  }
  return found
}

function literals(source: string): number {
  let count = 0
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
    const withoutFallbacks = line.replace(/var\(--[\w-]+,\s*[^)]*\)/g, 'var(--token)')
    count += (withoutFallbacks.match(HEX) ?? []).length
    count += (withoutFallbacks.match(PX) ?? []).length
  }
  return count
}

describe('Primer primitives', () => {
  test('no stylesheet has more literals than it is allowed', () => {
    const over: string[] = []
    for (const path of stylesheets(SRC)) {
      const name = path.slice(SRC.length).replace(/^\/+/, '')
      const count = literals(readFileSync(path, 'utf8'))
      const ceiling = CEILINGS[name] ?? 0
      if (count > ceiling) {
        over.push(`${name}: ${count} literal(s), allowed ${ceiling}`)
      }
    }

    expect(over, [
      'These use hardcoded colours or sizes where a Primer primitive exists.',
      'Spacing is --base-size-*, text is --text-*-size-*, colour is a functional',
      'role like --fgColor-muted, borders are --borderWidth-* and --borderRadius-*.',
      'See https://primer.style/product/primitives/.',
      '',
      'If a value genuinely has no token — a component width, a fixed height —',
      'raise the ceiling in this file with the reason.',
    ].join('\n')).toEqual([])
  })

  test('every ceiling is still needed', () => {
    // A ceiling above what a file actually contains is a debt that has
    // been paid and not written down, and it lets the next literal in
    // for free. Lower it when you lower the count.
    const slack: string[] = []
    for (const [name, ceiling] of Object.entries(CEILINGS)) {
      const path = join(SRC, name)
      let source: string
      try {
        source = readFileSync(path, 'utf8')
      } catch {
        slack.push(`${name}: listed but does not exist`)
        continue
      }
      const count = literals(source)
      if (count < ceiling) slack.push(`${name}: allowed ${ceiling}, has ${count} — lower it`)
    }

    expect(slack).toEqual([])
  })

  test('the scan reads the stylesheets', () => {
    // Every assertion above is "this list is empty", so a scan that
    // found no files would pass in silence.
    const found = stylesheets(SRC)
    expect(found.length).toBeGreaterThanOrEqual(Object.keys(CEILINGS).length)
    expect(literals('color: #ff0000; padding: 8px;')).toBe(2)
    expect(literals('color: var(--fgColor-muted, #656d76);')).toBe(0)
  })
})
