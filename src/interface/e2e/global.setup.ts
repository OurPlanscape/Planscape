import { request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { TEST_USER, PASSWORD_FILE, EMAIL_FILE } from './fixtures/test-users';
import { registerTestUser } from './helpers/api-client';

const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';

export default async function globalSetup() {
  // Persist email and password so worker processes can read them
  mkdirSync(dirname(PASSWORD_FILE), { recursive: true });
  writeFileSync(PASSWORD_FILE, TEST_USER.password);
  writeFileSync(EMAIL_FILE, TEST_USER.email);

  const api = await request.newContext({ baseURL });

  const res = await registerTestUser(api, TEST_USER);
  if (!res.ok()) {
    throw new Error(`Registration failed: ${res.status()} ${await res.text()}`);
  }

  await api.dispose();
}
