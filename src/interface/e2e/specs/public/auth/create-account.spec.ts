import { test, expect } from '@playwright/test';
import { SignupPage } from '../../../pages/signup.page';
import { LoginPage } from '../../../pages/login.page';
import { createSignupUser } from '../../../fixtures/test-users';
import { loginTestUser, destroyTestUser } from '../../../helpers/api-client';

const signupUser = createSignupUser();

test('user can create an account and log in', { tag: ['@smoke'] }, async ({ page }) => {
  // 1. Sign up via UI
  const signupPage = new SignupPage(page);
  await signupPage.goto();
  await signupPage.signup(
    signupUser.firstName,
    signupUser.lastName,
    signupUser.email,
    signupUser.password,
  );
  await expect(page).toHaveURL(/\/thankyou/);

  // 2. Log in via UI with the new account
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(signupUser.email, signupUser.password);
  await expect(page).toHaveURL(/\/home/);
});

test.afterAll(async ({ request }) => {
  // Cleanup: login via API then destroy the user (best-effort)
  try {
    await loginTestUser(request, signupUser);
    await destroyTestUser(request);
  } catch {
    // User may not have been created if signup failed
  }
});
