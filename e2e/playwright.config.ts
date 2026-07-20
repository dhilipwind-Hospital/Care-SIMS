import { defineConfig } from '@playwright/test';

// Browser specs point baseURL at the deployed frontend (Vercel) via test.use() per file.
// The Render backend is free-tier and cold-starts (~30-60s) — warm it before a run:
//   curl -s https://care-sims.onrender.com/ >/dev/null
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
