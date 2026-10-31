import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Primer design tokens (base spacing, typography, motion)
import '@primer/primitives/dist/css/primitives.css'
// Primer color themes
import '@primer/primitives/dist/css/functional/themes/light.css'
import '@primer/primitives/dist/css/functional/themes/dark.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
