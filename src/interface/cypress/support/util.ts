import * as dotenv from 'dotenv';

const envPath = '../../src/planscape/planscape/.env';
dotenv.config({ path: envPath });

export const baseURL: string =
  process.env['CYPRESS_TEST_BASE_URL'] ??
  Cypress.env('baseUrl') ??
  'http://localhost:4200';

export const testUser: string =
  process.env['CYPRESS_TEST_USER1'] ?? Cypress.env('testUser');

export const testPass: string =
  process.env['CYPRESS_TEST_PASS1'] ?? Cypress.env('testPass');

export const urls = {
  LOGIN: baseURL + '/login',
  SIGNUP: baseURL + '/signup',
  MAP: baseURL + '/map',
};
