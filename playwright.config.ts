import { defineConfig } from '@playwright/test';

// M6 admin smoke (mock mode). Uses the system Chrome (preinstalled on the box and on GitHub's
// ubuntu runners), so no browser download. Supabase env vars are blanked: always mock mode.
const PORT = 5181;
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/admin.html`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_STRIPE_PUBLISHABLE_KEY: '' },
  },
});
