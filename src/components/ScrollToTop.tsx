import { useInsertionEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * A new page opens at its own top.
 *
 * The browser keeps the scroll position across a client-side
 * navigation, so a reader who follows a link at the foot of an article
 * lands at the foot of the next one — or past its end, if the next
 * page is shorter. Every route change therefore resets the scroll.
 *
 * Two cases are left alone:
 *
 * - a jump to an anchor, which goes where it points;
 * - the back button, where the reader is put back where they were,
 *   because a page is a place and not only a document.
 */
export function ScrollToTop() {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()

  /** Where the reader was on each page, by the history entry's key. */
  const positions = useRef(new Map<string, number>())
  /** The history entry on screen. */
  const showing = useRef(key)

  // Remember where the reader is on the page they are leaving.
  //
  // The reading is taken in an insertion effect, which runs before the
  // new page is put in the document: that is the last moment the old
  // page is still under the reader, with their scroll intact. A commit
  // later the browser has already moved them, and the reading would be
  // the new page's position rather than the old one's.
  useInsertionEffect(() => {
    if (showing.current !== key) {
      positions.current.set(showing.current, window.scrollY)
      showing.current = key
    }
  }, [key])

  useLayoutEffect(() => {
    if (navigationType === 'POP') {
      // The reader is put back where they were. A page is a place, and
      // not only a document.
      window.scrollTo(0, positions.current.get(key) ?? 0)
      return
    }

    if (hash) {
      const target = document.getElementById(anchorId(hash))
      if (target) {
        target.scrollIntoView({ block: 'start' })
        return
      }
    }

    window.scrollTo(0, 0)
  }, [pathname, hash, key, navigationType])

  return null
}

/** The element id a `#fragment` points at, decoded if it was encoded. */
function anchorId(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
