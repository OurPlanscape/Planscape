import { request } from '@playwright/test';
import { TEST_USER } from './fixtures/test-users';
import { registerTestUser } from './helpers/api-client';

const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';

export default async function globalSetup() {
  const api = await request.newContext({ baseURL });

  const res = await registerTestUser(api, TEST_USER);
  if (!res.ok() && res.status() !== 400) {
    throw new Error(`Registration failed: ${res.status()} ${await res.text()}`);
  }

  await api.dispose();
}
