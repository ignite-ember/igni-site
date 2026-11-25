/**
 * The language switcher has to survive the *real* markdown pipeline, the
 * same lesson as `diagramFence.test.tsx`: a component tested in isolation
 * cannot see that `rehype-highlight` and `rehypeSdkLayout` have already
 * rewritten the blocks it is handed. So these render markdown through
 * `ReactMarkdown` with the same plugins the article page uses — plus
 * `rehypeCodeGroups` and the `CodeLanguageProvider` — and assert on what
 * comes out: the toggle, which block shows, that one toggle moves every
 * paired block on the page, and that the choice is remembered.
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BaseStyles, ThemeProvider } from '@primer/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { markdownComponents } from '../markdownComponents'
import { CodeLanguageProvider } from '../CodeLanguage'
import { rehypeCodeGroups } from '../rehypeCodeGroups'
import { rehypeSdkLayout } from '../rehypeSdkLayout'

const PAIR = [
  '```python',
  'print("from python")',
  '```',
  '',
  '```typescript',
  'console.log("from typescript");',
  '```',
  '',
].join('\n')

function renderMarkdown(md: string) {
  return render(
    <ThemeProvider colorMode="auto">
      <BaseStyles>
        <MemoryRouter>
          <CodeLanguageProvider>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeSdkLayout, rehypeCodeGroups]}
              components={markdownComponents}
            >
              {md}
            </ReactMarkdown>
          </CodeLanguageProvider>
        </MemoryRouter>
      </BaseStyles>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})
afterEach(cleanup)

describe('a pair of adjacent python/typescript blocks', () => {
  it('becomes one toggle, showing Python by default', () => {
    const { getByRole, container } = renderMarkdown(PAIR)

    expect(getByRole('button', { name: 'Python' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'TypeScript' })).toBeInTheDocument()
    // Only the Python block is in the DOM.
    expect(container.textContent).toContain('print(')
    expect(container.textContent).not.toContain('console.log')
    // One group, one code block shown at a time.
    expect(container.querySelectorAll('pre')).toHaveLength(1)
  })

  it('switches the shown block when TypeScript is chosen', () => {
    const { getByRole, container } = renderMarkdown(PAIR)

    fireEvent.click(getByRole('button', { name: 'TypeScript' }))

    expect(container.textContent).toContain('console.log')
    expect(container.textContent).not.toContain('print(')
  })
})

describe('the choice is shared and remembered', () => {
  it('moves every paired block on the page at once', () => {
    const { getAllByRole, container } = renderMarkdown(`${PAIR}\n${PAIR}`)

    // Two groups, each starting on Python.
    expect(container.querySelectorAll('pre')).toHaveLength(2)
    expect(container.textContent?.match(/print\(/g)).toHaveLength(2)

    // Flip one toggle; both groups follow.
    fireEvent.click(getAllByRole('button', { name: 'TypeScript' })[0])

    expect(container.textContent?.match(/console\.log/g)).toHaveLength(2)
    expect(container.textContent).not.toContain('print(')
  })

  it('marks the same language selected on every toggle, not only the one clicked', () => {
    const { getAllByRole } = renderMarkdown(`${PAIR}\n${PAIR}`)

    fireEvent.click(getAllByRole('button', { name: 'TypeScript' })[0])

    for (const button of getAllByRole('button', { name: 'TypeScript' })) {
      expect(button).toHaveAttribute('aria-current', 'true')
    }
    for (const button of getAllByRole('button', { name: 'Python' })) {
      expect(button).toHaveAttribute('aria-current', 'false')
    }

    fireEvent.click(getAllByRole('button', { name: 'Python' })[1])

    for (const button of getAllByRole('button', { name: 'Python' })) {
      expect(button).toHaveAttribute('aria-current', 'true')
    }
  })

  it('remembers the language across a fresh render (localStorage)', () => {
    const first = renderMarkdown(PAIR)
    fireEvent.click(first.getByRole('button', { name: 'TypeScript' }))
    first.unmount()

    const { container } = renderMarkdown(PAIR)
    expect(container.textContent).toContain('console.log')
    expect(container.textContent).not.toContain('print(')
  })
})

describe('blocks that are not a pair', () => {
  it('leave a lone python block as a plain code block, with no toggle', () => {
    const { queryByRole, container } = renderMarkdown('```python\nprint("alone")\n```\n')

    expect(queryByRole('button', { name: 'Python' })).toBeNull()
    expect(queryByRole('button', { name: 'TypeScript' })).toBeNull()
    expect(container.querySelector('pre')?.textContent).toContain('print("alone")')
  })

  it('leave an unrelated language (bash) untouched', () => {
    const { queryByRole, container } = renderMarkdown('```bash\nnpm ci\n```\n')

    expect(queryByRole('button')).toBeNull()
    expect(container.querySelector('pre')?.textContent).toContain('npm ci')
  })
})
