/**
 * The fence has to survive the *real* markdown pipeline.
 *
 * `DocDiagram` had unit tests and they all passed while the published
 * page rendered two code blocks reading "lineage" and "versioning".
 * The component was fine; nothing ever reached it. `rehype-highlight`
 * rewrites a fenced block's class from `language-igni-diagram` to
 * `hljs language-igni-diagram`, so the equality test that picked the
 * fence out never matched — and testing the component in isolation
 * cannot see that, because the plugin is the thing that broke it.
 *
 * So this renders markdown through `ReactMarkdown` with the same two
 * plugins the article page uses, and asserts on what comes out. Any
 * future plugin that rewrites the block the same way fails here.
 */

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { describe, expect, it } from 'vitest'

import { markdownComponents } from '../markdownComponents'

function renderMarkdown(md: string) {
  return render(
    <MemoryRouter>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={markdownComponents}>
        {md}
      </ReactMarkdown>
    </MemoryRouter>,
  )
}

describe('an igni-diagram fence', () => {
  it('becomes a figure, not a code block', () => {
    const { container } = renderMarkdown('```igni-diagram\nlineage\n```')

    expect(container.querySelector('figure')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('pre')).toBeNull()
    // Not `code` outright — the caption legitimately uses inline code.
    expect(container.querySelector('pre code')).toBeNull()
  })

  it('picks the diagram the fence names', () => {
    const lineage = renderMarkdown('```igni-diagram\nlineage\n```').container.textContent ?? ''
    const versioning = renderMarkdown('```igni-diagram\nversioning\n```').container.textContent ?? ''

    expect(lineage).toContain('auth design')
    expect(versioning).toContain('draft')
    expect(versioning).not.toContain('auth design')
  })
})

describe('ordinary fences are left alone', () => {
  it('a json block is still a code block', () => {
    const { container } = renderMarkdown('```json\n{ "a": 1 }\n```')

    expect(container.querySelector('pre')).not.toBeNull()
    expect(container.querySelector('code')).not.toBeNull()
    expect(container.querySelector('figure')).toBeNull()
  })

  it('an unfenced block is still a code block', () => {
    const { container } = renderMarkdown('```\nplain\n```')

    expect(container.querySelector('pre')?.textContent).toContain('plain')
    expect(container.querySelector('figure')).toBeNull()
  })

  it('inline code is untouched', () => {
    const { container } = renderMarkdown('the `base_n` field')

    expect(container.querySelector('code')?.textContent).toBe('base_n')
  })
})

describe('in-site links route client-side', () => {
  it('a /docs link becomes a router link, not a reload', () => {
    const { container } = renderMarkdown('see [Artifacts](/docs/artifacts)')
    const a = container.querySelector('a')!

    expect(a.getAttribute('href')).toBe('/docs/artifacts')
    // A react-router Link renders no target; an external one does.
    expect(a.getAttribute('target')).toBeNull()
  })

  it('an external link opens away from the page', () => {
    const { container } = renderMarkdown('see [PyPI](https://pypi.org/project/ignite-ember/)')
    const a = container.querySelector('a')!

    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toContain('noreferrer')
  })
})
