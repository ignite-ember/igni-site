/**
 * The documentation's Python | TypeScript code switcher.
 *
 * `rehypeCodeGroups` wraps a pair of adjacent code blocks in a
 * `div.code-group`; `markdownComponents` renders that through `CodeGroup`,
 * which shows one language at a time with a toggle. The chosen language is
 * held in a context (see `codeLanguageContext.ts`) so that flipping one
 * toggle flips *every* paired block on the page at once, and it is
 * remembered across pages and reloads in `localStorage`, defaulting to
 * Python.
 *
 * Nothing here hardcodes a colour: the toggle is Primer's `SegmentedControl`,
 * and the one spacing value is a Primer size token.
 */

import { Children, isValidElement, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SegmentedControl } from '@primer/react'

import {
  CodeLanguageContext,
  rememberLanguage,
  storedLanguage,
  useCodeLanguage,
} from './codeLanguageContext'

/** The label each language's toggle button shows. */
const LANGUAGE_LABEL: Record<string, string> = {
  python: 'Python',
  typescript: 'TypeScript',
}

/** Holds the chosen code language for every paired block beneath it. */
export function CodeLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setStored] = useState<string>(storedLanguage)
  const setLanguage = useCallback((next: string) => {
    setStored(next)
    rememberLanguage(next)
  }, [])
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])
  return <CodeLanguageContext.Provider value={value}>{children}</CodeLanguageContext.Provider>
}

interface HastElement {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastElement[]
}

/** The language a grouped `<pre>` was tagged with by `rehypeCodeGroups`. */
function preLanguage(pre: HastElement): string | null {
  const classes = pre.properties?.className
  const names = Array.isArray(classes) ? classes.map(String) : []
  for (const name of names) {
    if (name.startsWith('code-lang-')) return name.slice('code-lang-'.length)
  }
  return null
}

/**
 * One language group: a toggle over the languages, and the block for the
 * chosen one. `node` is the `div.code-group`, whose `<pre>` children carry
 * their language; `children` are those same blocks, already rendered, in the
 * same order.
 */
export function CodeGroup({ node, children }: { node?: unknown; children: ReactNode }) {
  const { language, setLanguage } = useCodeLanguage()
  const element = node as HastElement | undefined
  const languages = (element?.children ?? [])
    .filter((child) => child.tagName === 'pre')
    .map(preLanguage)
    .filter((lang): lang is string => lang !== null)
  const blocks = Children.toArray(children).filter(isValidElement)

  // Not a group this understands — show the blocks untouched.
  if (languages.length < 2 || blocks.length !== languages.length) {
    return <>{children}</>
  }

  const activeIndex = Math.max(0, languages.indexOf(language))
  const activeLanguage = languages[activeIndex]
  return (
    <div className="code-group">
      <div className="code-group-toggle" style={{ marginBottom: 'var(--base-size-8)' }}>
        <SegmentedControl aria-label="Code language" size="small">
          {languages.map((lang) => (
            <SegmentedControl.Button
              key={lang}
              selected={lang === activeLanguage}
              onClick={() => setLanguage(lang)}
            >
              {LANGUAGE_LABEL[lang] ?? lang}
            </SegmentedControl.Button>
          ))}
        </SegmentedControl>
      </div>
      {blocks[activeIndex]}
    </div>
  )
}
