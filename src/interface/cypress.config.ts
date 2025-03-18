import { defineConfig } from 'cypress';
import * as dotenv from 'dotenv';

const envPath = '../../.env';
dotenv.config({ path: envPath });

export default defineConfig({
  env: {
    testUser: process.env['CYPRESS_TEST_USER1'],
    testPass: process.env['CYPRESS_TEST_PASS1'],
    baseUrl: process.env['CYPRESS_TEST_BASE_URL'] ?? 'http://localhost:4200',
  },
  e2e: {
    baseUrl: process.env['CYPRESS_TEST_BASE_URL'] ?? 'http://localhost:4200',
  },
  screenshotOnRunFailure: false,
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: '**/*.cy.ts',
  },
});
