import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for host ↔ remote integration smoke tests.
 *
 * Test setup boots BOTH dev servers (host on 3000, remote on 3001) via the
 * `webServer` array, then runs the suite. Smoke tests live in `e2e/` and
 * assert the federation contract end-to-end: remote mounts inside the
 * host, theme propagates, error boundary catches load failures.
 *
 * CI tip: set `CI=true` (Playwright recognizes it) to disable workers
 * parallelism and enable retries.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: !process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Boot host + remote before the suite runs. `reuseExistingServer` lets
  // local devs keep their own dev server running.
  webServer: [
    {
      command: 'pnpm dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --dir ../afsd.remote-mfe dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
