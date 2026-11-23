import { expect } from '@playwright/test';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { test } from '../../../fixtures/test-planningarea';
import { ScenarioWizardPage } from '../../../pages/scenariowizard.page';

test('user can create a Preset Scenario', { tag: ['@smoke'] }, async ({ page, planId, workspaceId }) => {
  test.setTimeout(60000);
  const planPage = new PlanningAreaPage(page);
  const wizard = new ScenarioWizardPage(page);
  const name = `New Test Preset Scenario - ${Date.now()}`;

  await test.step('start scenario', async () => {
    await wizard.startNewScenario('Choose Treatment Goal', 'Choose Treatment Goal Start');
    await wizard.nameAndConfigure(name);
  });

  await test.step('select treatment goal', async () => { /* ... */ });
  await test.step('include/exclude areas', async () => {
    await wizard.includeAllAreas();
    await wizard.skipExclusions();
  });
  await test.step('set target and run', () => wizard.setTreatmentTargetAndRun());
});