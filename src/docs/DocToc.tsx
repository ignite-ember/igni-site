/**
 * An article's table of contents: a column beside it on wide screens,
 * a collapsed "On this page" above it on narrow ones.
 *
 * Moved out of `DocArticlePage` so the SDK pages render the same one.
 */
import { useCallback, useRef } from 'react'
import { Stack, Text } from '@primer/react'
import { ListUnorderedIcon } from '@primer/octicons-react'

/** The same list for screens too narrow for the right-hand column. */
export function MobileTableOfContents({ sections }: { sections: { id: string; title: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const scrollTo = useCallback((id: string) => {
    if (ref.current) ref.current.open = false
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <details className="doc-toc-mobile" ref={ref}>
      <summary><ListUnorderedIcon size={14} /> On this page</summary>
      <ol>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); scrollTo(s.id) }}>{s.title}</a>
          </li>
        ))}
      </ol>
    </details>
  )
}

export function TableOfContents({ sections, activeSectionId }: { sections: { id: string; title: string }[]; activeSectionId: string | null }) {
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <nav className="doc-toc">
      <Stack gap="none">
        <Text size="small" weight="semibold" className="doc-toc-heading">
          <ListUnorderedIcon size={12} /> On this page
        </Text>
        {sections.map((s) => (
          <a
            key={s.id}
            className={`doc-toc-link ${activeSectionId === s.id ? 'doc-toc-link-active' : ''}`}
            href={`#${s.id}`}
            onClick={(e) => { e.preventDefault(); scrollTo(s.id) }}
          >
            {s.title}
          </a>
        ))}
      </Stack>
    </nav>
  )
}
