import { test, expect } from '@playwright/test';
import { geomYosemite } from '../../../fixtures/test-geometries';
import { createPlanningArea, deletePlanningArea } from '../../../helpers/api-client';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import path from 'path';

const SCENARIO_SHAPEFILE = path.resolve(
  __dirname,
  '../../../assets/inside_yosemite.zip',
);

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

test('user can create a Custom Scenario', {tag: ['@smoke'] }, async ({ page }) => {

  // go to the newly created Planning Area
  if(!planId) {
    throw new Error('A planning area does not exist for the scenario test.');
  }
  const planPage = new PlanningAreaPage(page);
  await planPage.goto(planId);

  const newScenarioName = `Test Upload scenario - ${Date.now()}`;
  await page
  .locator('sg-action-card[title="Upload Project Areas"]')
  .getByText('upload Upload', { exact: true })
  .click({ timeout: 60000 });

  await page.getByRole('textbox', { name: 'Scenario name' }).click();
  await page.getByRole('textbox', { name: 'Scenario name' }).fill(newScenarioName);
  await page.getByRole('button', { name: 'more options' }).click();
  await page.locator('sg-file-upload input[type="file"]').setInputFiles(SCENARIO_SHAPEFILE);
  await page.getByRole('button', { name: 'Create' }).click();

  // TODO: confirm the new scenario via the UI and scenario name
  await planPage.goto(planId);
  await expect(page.locator(`sg-scenario-card`)).toContainText(newScenarioName);

});


