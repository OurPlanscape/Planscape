import { test as teardown } from '@playwright/test';
import fs from 'fs';
import { deleteScenario, getScenariosForPlan } from './helpers/api-client';
import { PLAN_FILE } from './.support/paths';


teardown('delete associated scenarios areas', async ({ request }) => {
  const { planId } = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));

  const scenarioResults = await getScenariosForPlan(request, planId);

  for (const id of scenarioResults.map(scenario => scenario.id)) {
    console.log('deleting scenario: ', id);
    await deleteScenario(request, id);
  }
});
