/**
 * The header's cat sits left of the wordmark as decoration: the brand link
 * is still called "igni", and a page without WebGL renders without it.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { SiteNav } from '../../pages/site/SiteChrome'

describe('the header cat', () => {
  it('sits before the wordmark and leaves the link named igni', () => {
    render(
      <MemoryRouter>
        <SiteNav />
      </MemoryRouter>,
    )
    const brand = screen.getByRole('link', { name: 'igni' })
    const cat = brand.querySelector('.landing-nav-cat')
    expect(cat).not.toBeNull()
    expect(cat!.getAttribute('aria-label')).toBeNull()
    expect(brand.firstElementChild).toBe(cat)
    expect(brand.querySelector('h1')?.textContent).toBe('igni')
  })
})
