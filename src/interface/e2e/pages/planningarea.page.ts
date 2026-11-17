import { type Page, type Locator } from '@playwright/test';

export class PlanningAreaPage {

  constructor(private readonly page: Page) {
  }

  async goto(planId: number) {
    await this.page.goto(`/plan/${planId}`);
  }

}
