/**
 * The diagrams render, and a typo degrades instead of breaking.
 *
 * A figure is the one thing on a documentation page that cannot be
 * proof-read by reading the markdown, so the checks that matter are
 * structural: every declared diagram draws something, each one carries
 * the accessible title a screen reader needs, and a name nobody drew
 * returns nothing rather than throwing — because a typo in an article
 * should cost the picture, not the page it is in.
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DocDiagram } from '../DocDiagram'
import { DIAGRAM_NAMES } from '../docDiagramNames'

describe.each(DIAGRAM_NAMES)('%s', (name) => {
  it('draws a figure', () => {
    const { container } = render(<DocDiagram name={name} />)

    expect(container.querySelector('figure')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('is described for a reader who cannot see it', () => {
    const { container } = render(<DocDiagram name={name} />)
    const svg = container.querySelector('svg')!

    // `role="img"` plus a referenced <title>, and a caption saying the
    // same thing in prose.
    expect(svg.getAttribute('role')).toBe('img')
    const titleId = svg.getAttribute('aria-labelledby')
    expect(titleId).toBeTruthy()
    expect(container.querySelector(`#${titleId}`)?.textContent?.trim().length ?? 0).toBeGreaterThan(40)
    expect(container.querySelector('figcaption')?.textContent?.trim().length ?? 0).toBeGreaterThan(80)
  })

  it('scrolls inside its own box', () => {
    // The article body must never scroll sideways; a wide figure gets
    // its own overflow container.
    const { container } = render(<DocDiagram name={name} />)

    expect(container.querySelector('.dd-scroll')).not.toBeNull()
  })

  it('tolerates the whitespace a fenced block carries', () => {
    const { container } = render(<DocDiagram name={`\n  ${name}  \n`} />)

    expect(container.querySelector('svg')).not.toBeNull()
  })
})

describe('a name nobody drew', () => {
  it('renders nothing instead of throwing', () => {
    const { container } = render(<DocDiagram name="no-such-diagram" />)

    expect(container.innerHTML).toBe('')
  })
})

describe('the lineage figure says what it is for', () => {
  it('shows a pin that is behind its source', () => {
    const { container } = render(<DocDiagram name="lineage" />)
    const text = container.textContent ?? ''

    // The single fact the picture exists to carry: an edge points at a
    // version, and staleness is that version falling behind the head.
    expect(text).toContain('v3')
    expect(text).toContain('head v7')
    expect(text).toContain('stale')
  })

  it('shows all three edge states and the hidden count', () => {
    const text = render(<DocDiagram name="lineage" />).container.textContent ?? ''

    expect(text).toContain('confirmed')
    expect(text).toContain('candidate')
    expect(text).toContain('dismissed')
    expect(text).toContain('hidden')
  })
})

describe('the versioning figure says what it is for', () => {
  it('shows the chain, the draft and the conflict', () => {
    const text = render(<DocDiagram name="versioning" />).container.textContent ?? ''

    expect(text).toContain('head')
    expect(text).toContain('draft')
    expect(text).toContain('base_n')
    expect(text).toContain('409')
  })
})
