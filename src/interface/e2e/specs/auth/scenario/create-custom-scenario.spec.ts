import { expect } from '@playwright/test';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { ScenarioPage } from '../../../pages/scenariowizard.page';
import { test } from '../../../fixtures/test-planningarea';

test('user can create a Custom Scenario', { tag: ['@smoke'] }, async ({ page, workspaceId, planId }) => {
  test.setTimeout(180_000); // whole flow, not a single step

  const planPage = new PlanningAreaPage(page);
  const wizard = new ScenarioPage(page);
  const name = `New Test Custom Scenario - ${Date.now()}`;

  await test.step('open planning area and start a custom scenario', async () => {
    await planPage.goto(workspaceId, planId);
    await wizard.startNewScenario('Create Custom Scenario', 'Choose Custom Scenario Build');
    await wizard.nameAndConfigure(name);
  });

  await test.step('select priority objectives', async () => {
    const search = page.getByRole('combobox', { name: 'Search in data layers' });
    await search.fill('land');
    await page.locator('#mat-mdc-checkbox-47-input').check(); // TODO: replace generated ID
    await wizard.saveAndContinue();
  });

  await test.step('select co-benefits', async () => {
    await expect(page.getByRole('region', { name: 'SELECT CO-BENEFITS (OPTIONAL' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Search in data layers' }).fill('land');
    await page.locator('#mat-mdc-checkbox-126-input').check(); // TODO: replace generated ID
    await wizard.saveAndContinue();
  });

  await test.step('include and exclude areas', async () => {
    await wizard.includeAllAreas();
    await wizard.skipExclusions();
  });

  await test.step('set stand-level constraints', async () => {
    const slope = page.getByRole('spinbutton', { name: 'Max Slope' });
    await slope.fill('99');
    await slope.press('Tab');
    await page.getByRole('textbox', { name: 'Max Distance From Roads' }).fill('100000');
    await wizard.saveAndContinue();
  });

  await test.step('set treatment target and run', async () => {
    await wizard.setTreatmentTargetAndRun();
  });

  await test.step('verify scenario was created', async () => {
    await wizard.expectScenarioRunningOrDone(name);
    await planPage.goto(workspaceId, planId);
    await expect(page.getByText(name)).toBeVisible();
  });
});
