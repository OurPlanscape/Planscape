import { test, expect } from '@playwright/test';
import { LoginPage } from '../../../pages/login.page';
import { TEST_USER } from '../../../fixtures/test-users';

test('user can log in with valid credentials', { tag: ['@smoke'] }, async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USER.email, TEST_USER.password);
  await expect(page).toHaveURL(/\/home/);
});

test('shows error with invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USER.email, 'WrongPassword999!');

  // Should stay on login page and show some error
  await expect(page).toHaveURL(/\/login/);
  const error = page.locator('app-form-message, mat-error, .mat-mdc-snack-bar-container');
  await expect(error.first()).toBeVisible();
});
