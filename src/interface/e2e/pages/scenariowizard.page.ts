// pages/scenario-wizard.page.ts
import { expect, Page } from '@playwright/test';

export class ScenarioWizardPage {
  constructor(private page: Page) {}

  public saveAndContinue(timeout = 60000) {
    return this.page.getByRole('button', { name: 'Save & Continue' }).click({ timeout });
  }

  /** Works whether or not the plan already has scenarios. */
  async startNewScenario(cardTitle: string, menuItemName: string) {
    const noScenariosYet = this.page
      .locator(`sg-action-card[title="${cardTitle}"]`)
      .getByText('add New Scenario');
    const existingScenarios = this.page.getByRole('button', { name: 'New Scenario' });

    await expect(noScenariosYet.or(existingScenarios)).toBeVisible();

    if (await noScenariosYet.isVisible()) {
      await noScenariosYet.click();
    } else {
      await existingScenarios.click();
      await this.page.getByRole('menuitem', { name: menuItemName }).click();
    }
  }

  async nameAndConfigure(name: string) {
    await this.page.getByRole('textbox').fill(name);
    await this.page.getByRole('button', { name: 'Get Started' }).click();
    await this.page.getByText('Optimize Project Areas Would').click();
    await this.page.getByRole('combobox', { name: 'Stand Size' }).locator('span').click();
    await this.page.getByRole('option', { name: 'Medium (100 acres)' }).click();
    await this.saveAndContinue();
  }

  async includeAllAreas() {
    await expect(this.page.getByRole('region', { name: 'Select Areas To Include * 0' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Select All' }).click();
    await this.saveAndContinue();
  }

  async skipExclusions() {
    await expect(this.page.getByRole('region', { name: 'Select Areas To Exclude (' })).toBeVisible();
    await this.saveAndContinue();
  }

  async setTreatmentTargetAndRun() {
    const min = this.page.getByRole('textbox', { name: 'Min:' });
    await min.fill('100');
    await min.press('Tab');
    await this.page.locator('#mat-input-3').fill('10');
    await this.page.getByRole('button', { name: 'Save & Run Scenario' }).click();

    await expect(this.page.getByText('Ready to run the scenario?')).toBeVisible();
    await this.page.getByRole('button', { name: 'Run Scenario' }).click();
    await expect(this.page.getByText('Your Scenario Analysis is in')).toBeVisible();
    await this.page.getByRole('button', { name: 'Close' }).click();
  }

  async expectScenarioRunningOrDone(name: string) {
    const card = this.page
      .locator('sg-scenario-card')
      .filter({ has: this.page.locator('.scenario-name', { hasText: name }) });
    await expect(card).toBeVisible();
    await expect(card.locator('sg-status-chip')).toHaveText(/^\s*(Running|Done)\s*$/);
  }
}
