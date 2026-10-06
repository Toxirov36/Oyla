import { defineConfig, devices } from '@playwright/test';
import { browserEnvironment } from './scripts/browser-environment';

const environment = browserEnvironment();
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run start -w @oyla/api',
      url: 'http://127.0.0.1:3101/api/v1/health',
      env: { OYLA_ENV_FILE: environment.envPath },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev -w @oyla/web -- --port 5180',
      url: 'http://localhost:5180',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
