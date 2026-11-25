import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { join } from 'node:path'

import { latestSdkDir } from './scripts/sync-docs.mjs'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // The newest SDK snapshot's index, bundled so `/docs/sdk/...` renders
      // at once; past releases' indexes load on demand (src/docs/sdkManifest.ts).
      // Read when the server starts: restart `npm run dev` after a sync adds a version.
      { find: /^sdk-latest-index$/, replacement: join(latestSdkDir(), 'index.json') },
    ],
  },
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
