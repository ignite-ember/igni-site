/**
 * ScrollToTop — a new page opens at its own top.
 *
 * The complaint it answers: at the foot of an article, following a link
 * to the next one landed the reader at the foot of *that* page too, or
 * past its end. The browser keeps the scroll position across a
 * client-side navigation, so nothing resets it by itself.
 *
 * Two cases are deliberately not a reset, and are pinned here so a
 * later change does not "fix" them away: a jump to an anchor goes where
 * it points, and the back button puts the reader back where they were.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ScrollToTop } from '../ScrollToTop'

function route(path: string, title: string, extra?: React.ReactNode) {
  return {
    path,
    element: (
      <>
        <h1>{title}</h1>
        {extra}
      </>
    ),
  }
}

function renderRouter(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      {
        // Mounted once, above the routes, as the app mounts it: the
        // component has to survive the navigation to remember where the
        // reader was.
        path: '/',
        element: (
          <>
            <ScrollToTop />
            <Outlet />
          </>
        ),
        children: [
          route('a', 'Page A'),
          route('b', 'Page B', <h2 id="deep">Deep down</h2>),
        ],
      },
    ],
    { initialEntries },
  )
  const view = render(<RouterProvider router={router} />)
  return { router, view }
}

/** Put the page at a given scroll offset, as a reader's scroll would. */
function scrollTo(offset: number) {
  Object.defineProperty(window, 'scrollY', {
    value: offset,
    configurable: true,
    writable: true,
  })
}

let scrollToSpy: ReturnType<typeof vi.spyOn>
let scrollIntoView: ReturnType<typeof vi.fn>

beforeEach(() => {
  // jsdom implements neither: window.scrollTo logs "not implemented" and
  // Element.scrollIntoView does not exist at all.
  scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  scrollIntoView = vi.fn()
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: scrollIntoView,
    configurable: true,
    writable: true,
  })
  scrollTo(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

describe('a new page', () => {
  test('opens at the top, not where the last one was left', async () => {
    const { router } = renderRouter(['/a'])
    await waitFor(() => expect(document.querySelector('h1')).toBeInTheDocument())
    // The first render is a reset too; the one that matters is the
    // navigation.
    scrollToSpy.mockClear()

    await router.navigate('/b')

    await waitFor(() => expect(scrollToSpy).toHaveBeenCalledWith(0, 0))
  })

  test('a jump to an anchor goes to the anchor instead', async () => {
    const { router } = renderRouter(['/a'])
    await waitFor(() => expect(document.querySelector('h1')).toBeInTheDocument())
    scrollToSpy.mockClear()
    scrollIntoView.mockClear()

    await router.navigate('/b#deep')

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    const target = scrollIntoView.mock.instances[0] as HTMLElement
    expect(target.id).toBe('deep')
    // And the page is not thrown back to the top on the way.
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test('the back button puts the reader back where they were', async () => {
    const { router } = renderRouter(['/a'])
    await waitFor(() => expect(document.querySelector('h1')).toBeInTheDocument())

    // The reader is a long way down the first page.
    scrollTo(300)
    await router.navigate('/b')
    await waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toBe('Page B'),
    )
    scrollToSpy.mockClear()

    await router.navigate(-1)

    await waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toBe('Page A'),
    )
    // The first page comes back at the offset the reader left it at,
    // not at the top and not at the foot.
    expect(scrollToSpy).toHaveBeenCalledWith(0, 300)
  })

  test('the reader who never scrolled comes back to the top', async () => {
    const { router } = renderRouter(['/a'])
    await waitFor(() => expect(document.querySelector('h1')).toBeInTheDocument())

    await router.navigate('/b')
    await waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toBe('Page B'),
    )
    scrollToSpy.mockClear()

    await router.navigate(-1)

    await waitFor(() =>
      expect(document.querySelector('h1')?.textContent).toBe('Page A'),
    )
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
  })
})

describe('one place resets the scroll', () => {
  const SRC = join(process.cwd(), 'src')

  function sources(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) sources(path, found)
      else if (/\.tsx?$/.test(entry)) found.push(path)
    }
    return found
  }

  test('no other component scrolls the page itself', () => {
    // The reset has to happen in one place. A second scroll anywhere
    // else — a link that scrolls to the top on click, say — happens
    // before the new page is rendered, and the reader's place on the
    // old page is lost with it: the back button then brings them to
    // the top of a page they had read to the end.
    const offenders: string[] = []
    for (const path of sources(SRC)) {
      if (path.endsWith(join('components', 'ScrollToTop.tsx'))) continue
      if (path.includes(`${join('__tests__', '')}`)) continue
      if (/\.test\.tsx?$/.test(path)) continue
      const source = readFileSync(path, 'utf8')
      if (/window\.scrollTo\s*\(/.test(source)) {
        offenders.push(path.slice(SRC.length + 1))
      }
    }

    expect(offenders).toEqual([])
  })
})
