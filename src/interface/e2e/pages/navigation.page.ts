import { type Page, type Locator } from '@playwright/test';

export class NavigationPage {
  readonly userMenuTrigger: Locator;
  readonly logoutButton: Locator;

  constructor(private readonly page: Page) {
    this.userMenuTrigger = page.locator('[data-id="menu-trigger"]');
    this.logoutButton = page.locator('[data-id="logout"]');
  }

  async logout() {
    await this.userMenuTrigger.click();
    await this.logoutButton.click();
  }
}
