/**
 * The code palette in the documentation's stylesheet.
 *
 * The bug it pins: the palette was keyed on `[data-dark-theme="dark"]`,
 * and that attribute is on `<html>` in every mode — it names the dark
 * theme, it does not say the dark theme is on. So a light page was
 * painted with dark-theme colours, and the values in the articles came
 * out a pale blue on a light grey background.
 *
 * The palette is checked as a mechanism rather than as a picture. It is
 * made of Primer's functional roles, which carry one colour in the
 * light theme and another in the dark one, so the code follows the page
 * without this stylesheet deciding anything about themes. Three things
 * have to hold for that to be true, and each is checked here:
 *
 * - nothing in the stylesheet keys on a theme attribute;
 * - every token is painted from a `--hl-*` variable, and every one of
 *   those is a Primer role;
 * - every role used is defined in *both* Primer themes, or the palette
 *   would follow the page in one theme and not in the other.
 */
import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// `import.meta.url` is an http: URL under the vite dev transform, so the
// paths are built from the working directory instead.
const CSS = join(process.cwd(), 'src/pages/DocsPage.css')
const THEMES = join(
  process.cwd(),
  'node_modules/@primer/primitives/dist/css/functional/themes',
)

const css = readFileSync(CSS, 'utf8')

interface Rule {
  media: string | null
  selector: string
  body: string
}

/** Split a block of CSS into its rules, without the comments. */
function splitBlocks(source: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = []
  let depth = 0
  let start = 0
  let selectorStart = 0
  let bodyStart = 0
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '{') {
      if (depth === 0) {
        selectorStart = start
        bodyStart = i + 1
      }
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        out.push({
          selector: source.slice(selectorStart, bodyStart - 1).trim(),
          body: source.slice(bodyStart, i),
        })
        start = i + 1
      }
    }
  }
  return out
}

/** Every rule in the stylesheet, with the media query it sits in. */
function rules(source: string): Rule[] {
  const out: Rule[] = []
  for (const block of splitBlocks(source.replace(/\/\*[\s\S]*?\*\//g, ''))) {
    if (block.selector.startsWith('@media')) {
      out.push(...rules(block.body).map((r) => ({ ...r, media: block.selector })))
    } else {
      out.push({ media: null, selector: block.selector, body: block.body })
    }
  }
  return out
}

const all = rules(css)

/** The rules that paint code: the palette and the tokens. */
const codeRules = all.filter(
  (rule) =>
    rule.selector.includes('.hljs') || rule.body.includes('--hl-'),
)

describe('the code palette', () => {
  test('the stylesheet does not decide the theme itself', () => {
    // `data-dark-theme` is on <html> in every mode, and `data-color-mode`
    // duplicates what Primer's roles already know. A rule keyed on either
    // is a second opinion about the theme, and it can disagree.
    const keyed = all.filter(
      (rule) =>
        rule.selector.includes('data-dark-theme') ||
        rule.selector.includes('data-color-mode'),
    )
    expect(keyed.map((rule) => rule.selector)).toEqual([])
  })

  test('the tokens are painted from the palette, not from fixed colours', () => {
    expect(codeRules.length).toBeGreaterThan(0)

    for (const rule of codeRules) {
      for (const match of rule.body.matchAll(/color:\s*([^;]+)/g)) {
        expect(match[1].trim(), rule.selector).toMatch(/^var\(--hl-/)
      }
    }
  })

  test('the palette is Primer roles', () => {
    const declared = new Map<string, string>()
    for (const rule of codeRules) {
      for (const match of rule.body.matchAll(/(--hl-[\w-]+)\s*:\s*([^;]+)/g)) {
        declared.set(match[1], match[2].trim())
      }
    }
    expect(declared.size).toBeGreaterThan(0)

    for (const [name, value] of declared) {
      expect(value, name).toMatch(/^var\(--fgColor-[\w-]+\)$/)
    }
  })

  test('every role used is defined in both Primer themes', () => {
    const light = readFileSync(join(THEMES, 'light.css'), 'utf8')
    const dark = readFileSync(join(THEMES, 'dark.css'), 'utf8')

    const roles = new Set<string>()
    for (const rule of codeRules) {
      for (const match of rule.body.matchAll(/var\((--fgColor-[\w-]+)\)/g)) {
        roles.add(match[1])
      }
    }
    expect(roles.size).toBeGreaterThan(0)

    for (const role of roles) {
      expect(light, `${role} is not in the light theme`).toContain(`${role}:`)
      expect(dark, `${role} is not in the dark theme`).toContain(`${role}:`)
    }
  })

  test('the roles are not the same colour in the two themes', () => {
    // A role defined the same in both themes would leave the palette
    // looking for a theme it cannot find.
    const light = readFileSync(join(THEMES, 'light.css'), 'utf8')
    const dark = readFileSync(join(THEMES, 'dark.css'), 'utf8')

    const roles = new Set<string>()
    for (const rule of codeRules) {
      for (const match of rule.body.matchAll(/var\((--fgColor-[\w-]+)\)/g)) {
        roles.add(match[1])
      }
    }

    for (const role of roles) {
      const inLight = light.match(new RegExp(`${role}:\\s*(#[0-9a-fA-F]+)`))?.[1]
      const inDark = dark.match(new RegExp(`${role}:\\s*(#[0-9a-fA-F]+)`))?.[1]
      expect(inLight, role).toBeDefined()
      expect(inDark, role).toBeDefined()
      expect(inDark, `${role} is the same colour in both themes`).not.toBe(inLight)
    }
  })
})
