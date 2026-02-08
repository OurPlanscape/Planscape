import { request } from '@playwright/test';
import { TEST_USER } from './fixtures/test-users';
import { loginTestUser, destroyTestUser } from './helpers/api-client';

const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';

export default async function globalTeardown() {
  const api = await request.newContext({ baseURL });

  await loginTestUser(api, TEST_USER);
  await destroyTestUser(api);

  await api.dispose();
}
