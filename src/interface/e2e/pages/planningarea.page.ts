import { type Page, type Locator } from '@playwright/test';

export class PlanningAreaPage {

  constructor(private readonly page: Page) {
  }

  async goto(workspaceId: number, planId: number) {
    await this.page.goto(`/workspace/${workspaceId}/plan/${planId}`);
  }

}
