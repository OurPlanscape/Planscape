import path from 'path';
import { expect } from '@playwright/test';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { ScenarioPage } from '../../../pages/scenariowizard.page';
import { test } from '../../../fixtures/test-planningarea';

const SCENARIO_SHAPEFILE = path.resolve(__dirname, '../../../assets/inside_yosemite.zip');

test('user can upload a project area', { tag: ['@smoke'] }, async ({ page, planId, workspaceId }) => {
  const planPage = new PlanningAreaPage(page);
  const scenarios = new ScenarioPage(page);
  const name = `Test Uploaded Project Areas - ${Date.now()}`;

  await test.step('open upload dialog', async () => {
    await planPage.goto(workspaceId, planId);
    const emptyState = page
      .locator('sg-action-card[title="Upload Project Areas"]')
      .getByText('upload Upload', { exact: true });
    const existing = page.getByRole('button', { name: 'Upload Project Areas' });
    await emptyState.or(existing).click();
  });

  await test.step('fill in details and upload file', async () => {
    await page.getByRole('textbox', { name: 'Name' }).fill(name);
    await page.getByRole('button', { name: 'more options' }).click();
    await page.locator('sg-file-upload input[type="file"]').setInputFiles(SCENARIO_SHAPEFILE);
    await page.getByRole('button', { name: 'Create' }).click();
  });

  await test.step('verify project area exists', async () => {
    await scenarios.expectScenarioVisible(name);
    await planPage.goto(workspaceId, planId);
    await expect(page.getByText(name)).toBeVisible();
  });
});

