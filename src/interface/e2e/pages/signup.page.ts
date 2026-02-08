import { type Page, type Locator } from '@playwright/test';

export class SignupPage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly password1Input: Locator;
  readonly password2Input: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.firstNameInput = page.locator('[formControlName="firstName"]');
    this.lastNameInput = page.locator('[formControlName="lastName"]');
    this.emailInput = page.locator('[formControlName="email"]');
    this.password1Input = page.locator('[formControlName="password1"]');
    this.password2Input = page.locator('[formControlName="password2"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/signup');
  }

  async signup(firstName: string, lastName: string, email: string, password: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.emailInput.fill(email);
    await this.password1Input.fill(password);
    await this.password2Input.fill(password);
    // Form uses updateOn:'blur' — blur the last field to trigger validation
    await this.password2Input.press('Tab');
    await this.submitButton.click();
  }
}
