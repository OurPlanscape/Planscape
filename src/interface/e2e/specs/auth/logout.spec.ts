import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { NavigationPage } from '../../pages/navigation.page';
import { TEST_USER } from '../../fixtures/test-users';

test('user can log out via menu', { tag: ['@smoke'] }, async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL(/\/home/);

  const nav = new NavigationPage(page);
  await nav.logout();

  await expect(page).toHaveURL(/\/home/);
  await expect(nav.userMenuTrigger).toContainText('Sign In');
});
