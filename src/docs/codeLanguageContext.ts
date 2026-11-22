/**
 * The chosen documentation code language, shared across every paired block.
 *
 * The context, its hook and the `localStorage` helpers live here, apart from
 * the components in `CodeLanguage.tsx`: a module that exports a component may
 * not also export a hook or a constant, or fast refresh breaks and the lint
 * gate fails (the same split `markdownComponents.tsx` had to make).
 */

import { createContext, useContext } from 'react'

/** Where the chosen language is remembered, and the language chosen by default. */
export const STORAGE_KEY = 'igni:docs:code-language'
export const DEFAULT_LANGUAGE = 'python'

export interface CodeLanguageValue {
  language: string
  setLanguage: (language: string) => void
}

export const CodeLanguageContext = createContext<CodeLanguageValue | null>(null)

/** The remembered language, or Python — never throwing in a private window. */
export function storedLanguage(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

/** Remember the chosen language, ignoring a storage that refuses to be written. */
export function rememberLanguage(language: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // A private window with storage blocked: the choice lives for this page only.
  }
}

/**
 * The chosen code language and a setter. Outside a provider — a lone code
 * block rendered on its own — it reads Python and the setter does nothing.
 */
export function useCodeLanguage(): CodeLanguageValue {
  const context = useContext(CodeLanguageContext)
  return context ?? { language: DEFAULT_LANGUAGE, setLanguage: () => {} }
}
