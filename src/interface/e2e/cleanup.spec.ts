import { test, expect } from '@playwright/test';

test('destroy e2e test user', async ({ request }) => {
  const res = await request.post('/planscape-backend/users/e2e/destroy/');
  expect(res.ok(), `Failed to destroy test user: ${res.status()} ${await res.text()}`).toBeTruthy();
});
