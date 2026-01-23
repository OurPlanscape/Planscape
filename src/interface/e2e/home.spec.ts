import { expect, test } from '@playwright/test';

test.describe('Home', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  });

  test('renders the public home welcome view', async ({ page }) => {
    await expect(page.getByTestId('home-welcome')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Welcome to Planscape' })
    ).toBeVisible();
  });

  test('shows primary CTAs', async ({ page }) => {
    const explore = page.getByTestId('cta-explore');
    const signIn = page.getByTestId('cta-sign-in');
    const createAccount = page.getByTestId('cta-create-account');

    await expect(explore).toBeVisible();
    await expect(explore).toHaveAttribute('href', '/explore');

    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', '/login');

    await expect(createAccount).toBeVisible();
    await expect(createAccount).toHaveAttribute('href', '/signup');
  });
});
