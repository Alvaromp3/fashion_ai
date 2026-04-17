import { defineConfig, devices } from '@playwright/test';

const reuse = !process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    navigationTimeout: 30000
  },
  webServer: process.env.E2E_SKIP_SERVERS
    ? undefined
    : {
        command:
          'npx concurrently -k -n BE,FE -c blue,green "cd backend && node server.js" "cd frontend && npm run dev -- --host 127.0.0.1 --port 3000 --strictPort"',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: reuse,
        timeout: 180000
      }
});
