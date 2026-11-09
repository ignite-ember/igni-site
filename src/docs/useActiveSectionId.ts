/**
 * Which of an article's sections is in view, for the table of contents.
 *
 * Moved out of `DocArticlePage` so the SDK pages share it; a hook in a
 * module that defines components would break fast refresh.
 */
import { useEffect, useRef, useState } from 'react'

/** Track which H2 section is currently visible. */
export function useActiveSectionId(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (sectionIds.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )

    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [sectionIds])

  return activeId
}
