import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { TEST_USER } from './fixtures/test-users';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_USER.email, TEST_USER.password);
  await page.waitForURL('**/home', { timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
