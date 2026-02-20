import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';

export default defineConfig({
  globalSetup: './e2e/global.setup.ts',
  globalTeardown: './e2e/global.teardown.ts',
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
    ...(process.env['CI']
      ? [['json', { outputFile: 'e2e-results.json' }] as const]
      : []),
  ],
  outputDir: 'e2e-results',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },

  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'authenticated',
      testDir: './e2e/specs',
      testIgnore: /\/public\//,
      dependencies: ['auth-setup'],
      use: {
        storageState: 'e2e/.auth/user.json',
      },
    },
    {
      name: 'public',
      testDir: './e2e/specs/public',
    },
    {
      name: 'cleanup',
      testMatch: /cleanup\.spec\.ts/,
      dependencies: ['authenticated'],
      use: {
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],

  webServer: process.env['E2E_BASE_URL']
    ? undefined
    : {
        command: 'npx ng serve',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
});
