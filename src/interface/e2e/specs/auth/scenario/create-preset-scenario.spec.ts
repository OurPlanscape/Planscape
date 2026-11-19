import { expect } from '@playwright/test';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { test } from '../../../fixtures/test-planningarea';

test('user can create a Preset Scenario', { tag: ['@smoke'] }, async ({ page, planId, workspaceId }) => {
  test.setTimeout(60_000);
  // go to the newly created Planning Area
  await page.goto(`/workspace/${workspaceId}/plan/${planId}`); // whatever your existing navigation is

  // go to the newly created Planning Area
  if(!planId) {
    throw new Error('A planning area does not exist for the scenario test.');
  }
  const planPage = new PlanningAreaPage(page);
  await planPage.goto(workspaceId, planId);

  const newScenarioName = `New test scenario - ${Date.now()}`;
  await page
  .locator('sg-action-card[title="Choose Treatment Goal"]')
  .getByText('add New Scenario')
  .click({ timeout: 60000 });

  // create scenario
  await page.getByRole('textbox').fill(newScenarioName);
  
  // scenario has a name
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.getByText('Optimize Project Areas Would').click();
  await page.getByRole('combobox', { name: 'Stand Size' }).locator('span').click();
  await page.getByRole('option', { name: 'Medium (100 acres)' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();

  // Step 1. Select Treatment Goal
  await page.getByText('Prioritize Areas with High Expected Tree Volume Loss from Wildfire').click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();

    // Step: Select Areas to Include
    await expect(page.getByRole('region', { name: 'Select Areas To Include * 0' })).toBeVisible();
  await page.getByRole('button', { name: 'Select All' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();


  // Step. Select Areas to Exclude
  await expect(page.getByRole('region', { name: 'Select Areas To Exclude (' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });

  // Step 3. Stand Level Constraints (slope, roads)
  await page.getByRole('button', { name: 'Save & Continue' }).click();

  // Step 4. Apply Treatment Target
  // TODO: assert that the acres per project area validation works for this scenario
  await page.getByRole('textbox', { name: 'Min:' }).fill('100');
  await page.getByRole('textbox', { name: 'Min:' }).press('Tab');
  await page.locator('#mat-input-3').fill('10');
  await page.getByRole('button', { name: 'Save & Run Scenario' }).click();

  // Confirmation Modal
  await expect(page.getByText('Ready to run the scenario?')).toBeVisible();
  await page.getByRole('button', { name: 'Run Scenario' }).click();

  // After creation - close confirmation
  await expect(page.getByText('Your Scenario Analysis is in')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Running')).toBeVisible();

  // Confirm that the scenario was created
  await planPage.goto(workspaceId, planId);
  await expect(page.locator(`sg-scenario-card`)).toContainText(newScenarioName);

});
