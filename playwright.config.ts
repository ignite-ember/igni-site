import { defineConfig, devices } from '@playwright/test'

/**
 * E2E specs live under `tests/e2e/`. They run against the Vite dev
 * server; the site has no backend, so nothing else needs to be up.
 *
 * `SITE_URL` points the suite at a deployed copy instead.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.SITE_URL ?? 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.SITE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 5174 --strictPort',
        url: 'http://localhost:5174',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
