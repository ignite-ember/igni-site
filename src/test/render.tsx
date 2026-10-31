/**
 * `renderWithProviders` — drop a component into RTL with a router and
 * Primer wired up so a page just works.
 */
import type { ReactElement } from 'react'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { BaseStyles, ThemeProvider } from '@primer/react'
import { MemoryRouter } from 'react-router-dom'

interface ProvidersOptions {
  /** Initial URL the MemoryRouter starts at. */
  route?: string
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...rtlOptions }: ProvidersOptions & RenderOptions = {},
): RenderResult {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider colorMode="auto">
      <BaseStyles>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </BaseStyles>
    </ThemeProvider>
  )

  return render(ui, { wrapper, ...rtlOptions })
}
