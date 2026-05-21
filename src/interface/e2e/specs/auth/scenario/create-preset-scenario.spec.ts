import { test, expect } from '@playwright/test';
import { geomYosemite } from '../../../fixtures/test-geometries';
import { createPlanningArea, deletePlanningArea } from '../../../helpers/api-client';
import { PlanningAreaPage } from '../../../pages/planningarea.page';


let planId: number | null = null;

test.beforeAll(async ({ request }) => {
  const testName = `Test Plan - ${Date.now()}`;
  const response = await createPlanningArea(request, testName, geomYosemite);
  const plan = await response.json();
  planId = plan.id;
});

test.afterAll(async ({ request }) => {
  if (planId) {
    await deletePlanningArea(request, planId);
  }
});

test('user can create a Preset Scenario', {tag: ['@smoke'] }, async ({ page }) => {

  // go to the newly created Planning Area
  if(!planId) {
    throw new Error('A planning area does not exist for the scenario test.');
  }
  const planPage = new PlanningAreaPage(page);
  await planPage.goto(planId);

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


  // Step 2. Select Areas to Exclude
  await expect(page.locator('#mat-mdc-checkbox-1')).toContainText('Protection Status 1 – Wilderness areas (natural processes occur freely)');
  const selectionButton = await page.getByRole('button').nth(3);
  // TODO: expect that this button is now a '-' 
  selectionButton.click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();

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

  // Confirm that the scenario was created
  await planPage.goto(planId);
  await expect(page.locator(`sg-scenario-card`)).toContainText(newScenarioName);

});
