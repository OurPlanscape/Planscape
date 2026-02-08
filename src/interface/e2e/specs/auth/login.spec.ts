import { test, expect } from '@playwright/test';

test('user is redirected to /home after login', { tag: ['@smoke'] }, async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home/);
});
