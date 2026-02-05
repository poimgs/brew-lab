import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5174',
      url: 'http://localhost:5174',
      cwd: '../frontend',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        VITE_API_PORT: '8081',
      },
    },
    {
      command: 'go run ./cmd/server',
      url: 'http://localhost:8081/health',
      cwd: '../backend',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        PORT: '8081',
        DATABASE_URL: 'postgres://coffee:coffee123@localhost:5432/coffee_tracker_test?sslmode=disable',
        JWT_SECRET: 'test-jwt-secret-for-e2e-testing',
      },
    },
  ],
});
