import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { test } from '../../../fixtures/test-planningarea';
import { ScenarioPage } from '../../../pages/scenariowizard.page';

test('user can create a Preset Scenario', { tag: ['@smoke'] }, async ({ page, planId, workspaceId }) => {
  test.setTimeout(60000);
  const planPage = new PlanningAreaPage(page);
  const wizard = new ScenarioPage(page);
  const name = `New Test Preset Scenario - ${Date.now()}`;

  await test.step('start scenario', async () => {
    await planPage.goto(workspaceId, planId);
    await wizard.startNewScenario('Choose Treatment Goal', 'Choose Treatment Goal Start');
    await wizard.nameAndConfigure(name);
  });


  await test.step('select treatment goal', async () => {
    await page.getByText('Prioritize Areas with High Expected Tree Volume Loss from Wildfire').click();
    await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });
  });

  await test.step('include/exclude areas', async () => {
    await wizard.includeAllAreas();
    await wizard.skipExclusions();
  });

  await test.step('Set Stand Level Constraints', async () => {
    await page.getByRole('button', { name: 'Save & Continue' }).click({ timeout: 60000 });
  });


  await test.step('set target and run', () => wizard.setTreatmentTargetAndRun());
});