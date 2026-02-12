import { test, expect } from '@playwright/test';
import { NavigationPage } from '../../pages/navigation.page';

test('user can log out via menu', { tag: ['@smoke'] }, async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home/);

  const nav = new NavigationPage(page);
  await nav.logout();

  await expect(page).toHaveURL(/\/home/);

  // The menu trigger text changes to "Sign In" when logged out
  await expect(nav.userMenuTrigger).toContainText('Sign In');
});
