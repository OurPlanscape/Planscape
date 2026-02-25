import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.locator('[formControlName="email"]');
    this.passwordInput = page.locator('[formControlName="password"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/dj-rest-auth/login/'),
    );
    await this.submitButton.click();
    await responsePromise;
  }
}
