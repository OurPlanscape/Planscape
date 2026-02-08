import { test as setup, request } from '@playwright/test';
import { TEST_USER } from './fixtures/test-users';
import { loginTestUser } from './helpers/api-client';

const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';
const authFile = 'e2e/.auth/user.json';

setup('login via API and save auth cookies for authenticated tests', async ({}) => {
  const api = await request.newContext({ baseURL });
  await loginTestUser(api, TEST_USER);
  await api.storageState({ path: authFile });
  await api.dispose();
});
