import { expect } from '@playwright/test';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { test } from '../../../fixtures/test-planningarea';

import path from 'path';

const SCENARIO_SHAPEFILE = path.resolve(
  __dirname,
  '../../../assets/inside_yosemite.zip',
);

test('user can upload a project area', { tag: ['@smoke'] }, async ({ page, planId, workspaceId }) => {

  // go to the newly created Planning Area
  if (!planId) {
    throw new Error('A planning area does not exist for the scenario test.');
  }
  const planPage = new PlanningAreaPage(page);
  await planPage.goto(workspaceId, planId);

  const newScenarioName = `Test Uploaded Project Areas - ${Date.now()}`;


  const buttonWithNoScenarioYet = page
    .getByText('upload Upload', { exact: true });
  const buttonWithExistingScenarios = page.getByRole('button', { name: 'Upload Project Areas' });

  if (await page
    .locator('sg-action-card[title="Upload Project Areas"]')
    .getByText('upload Upload', { exact: true }).isVisible()) {
    buttonWithNoScenarioYet.click({ timeout: 60000 });
  } else {
    buttonWithExistingScenarios.click();

  }

  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill(newScenarioName);
  await page.getByRole('button', { name: 'more options' }).click();
  await page.locator('sg-file-upload input[type="file"]').setInputFiles(SCENARIO_SHAPEFILE);
  await page.getByRole('button', { name: 'Create' }).click();

  // Confirm the new scenario via the UI and scenario name
  await planPage.goto(workspaceId, planId);
  await expect(page.getByText(newScenarioName));

});
