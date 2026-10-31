import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.tsx'],
    // Primer (and its peer deps) ship CSS imports inside their JS. Inline
    // these packages so vitest's transformer handles the .css side-effects
    // instead of Node trying to load them as ESM.
    server: {
      deps: {
        inline: [/@primer\//, /@radix-ui\//, /styled-components/],
      },
    },
    // Playwright specs live under tests/e2e and run via `playwright test`
    exclude: ['node_modules', 'dist', 'tests/e2e/**', '**/*.spec.ts'],
  },
})
