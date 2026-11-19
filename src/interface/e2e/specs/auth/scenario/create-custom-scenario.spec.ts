import { expect } from '@playwright/test';
import { geomYosemite } from '../../../fixtures/test-geometries';
import { createPlanningArea, deletePlanningArea } from '../../../helpers/api-client';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { test } from '../../../fixtures/test-planningarea';

test('user can create a Custom Scenario', { tag: ['@smoke'] }, async ({ page, workspaceId, planId }) => {
  test.setTimeout(60000);
  // go to the newly created Planning Area
  await page.goto(`/workspace/${workspaceId}/plan/${planId}`); // whatever your existing navigation is
  // go to the newly created Planning Area
  if (!planId) {
    throw new Error('A planning area does not exist for the scenario test.');
  }
  const planPage = new PlanningAreaPage(page);
  await planPage.goto(workspaceId, planId);

  const newScenarioName = `New Test Custom Scenario - ${Date.now()}`;

  /// Await New Scenario button(s), and proceed
  // Note that here, we might have a screen without any existing scenarios
  const buttonWithNoScenarioYet = page.locator('sg-action-card[title="Create Custom Scenario"]').getByText('add New Scenario');
  const buttonWithExistingScenarios = page.getByRole('button', { name: 'New Scenario' });

  await expect(buttonWithNoScenarioYet.or(buttonWithExistingScenarios)).toBeVisible();   // wait for either

  if (await buttonWithNoScenarioYet.isVisible()) {
    buttonWithNoScenarioYet.click({ timeout: 60000 });
  } else {
    buttonWithExistingScenarios.click();
    await page.getByRole('menuitem', { name: 'Choose Custom Scenario Build' });
    page.getByRole('menuitem', { name: 'Choose Custom Scenario Build' }).click({ timeout: 60000 });
  }

  // create scenario
  await page.getByRole('textbox').fill(newScenarioName);


  // scenario has a name
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.getByText('Optimize Project Areas Would').click();
  await page.getByRole('combobox', { name: 'Stand Size' }).locator('span').click();
  await page.getByRole('option', { name: 'Medium (100 acres)' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();


  // Step 1. Select Priority Objectives
  await page.getByRole('combobox', { name: 'Search in data layers' }).click();
  await page.getByRole('combobox', { name: 'Search in data layers' }).fill('land');
  await page.locator('#mat-mdc-checkbox-47-input').check();
  await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });

  // Step 2. Select Co-Benefits
  await expect(page.getByRole('region', { name: 'SELECT CO-BENEFITS (OPTIONAL' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Search in data layers' }).click();
  await page.getByRole('combobox', { name: 'Search in data layers' }).click();
  await page.getByRole('combobox', { name: 'Search in data layers' }).fill('land');
  await page.locator('div:nth-child(13) > .mat-mdc-tooltip-trigger').click();
  await page.locator('div:nth-child(13) > .mat-mdc-tooltip-trigger').click();
  await page.locator('#mat-mdc-checkbox-126-input').check();
  await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });

  // Step: Select Areas to Include
  await expect(page.getByRole('region', { name: 'Select Areas To Include * 0' })).toBeVisible();
  await page.getByRole('button', { name: 'Select All' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });

  // Step. Select Areas to Exclude
  await expect(page.getByRole('region', { name: 'Select Areas To Exclude (' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save & Continue' })).toBeVisible();
  await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });

  // Step 4. Stand Level Constraints (slope, roads)
  await page.getByRole('spinbutton', { name: 'Max Slope' }).click();
  await page.getByRole('spinbutton', { name: 'Max Slope' }).fill('99');
  await page.getByRole('spinbutton', { name: 'Max Slope' }).press('Tab');
  await page.getByRole('textbox', { name: 'Max Distance From Roads' }).fill('100000');
  await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });

  // Step 4. Apply Treatment Target
  await page.getByRole('textbox', { name: 'Min:' }).click();
  await page.getByRole('textbox', { name: 'Min:' }).fill('100');
  await page.getByRole('textbox', { name: 'Min:' }).press('Tab');
  await page.locator('#mat-input-3').fill('10');
  await page.getByRole('button', { name: 'Save & Run Scenario' }).click({ timeout: 60000 });

  // Confirmation Modal
  await expect(page.getByText('Ready to run the scenario?')).toBeVisible();
  await page.getByRole('button', { name: 'Run Scenario' }).click();

  // After creation - close confirmation
  await expect(page.getByText('Your Scenario Analysis is in')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click({ timeout: 60000 });
  await expect(page.getByText('Running')).toBeVisible();

  // Confirm that the scenario was created
  await planPage.goto(workspaceId, planId);
  await expect(page.getByText(newScenarioName));


});
