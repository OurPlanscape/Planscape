// plan.setup.ts
import { test as setup } from '@playwright/test';
import fs from 'fs';
import { createWorkspace, createPlanningArea } from './helpers/api-client';
import { geomYosemite } from './fixtures/test-geometries';
import { PLAN_FILE } from './.support/paths';

setup('create workspace and planning area', async ({ request }) => {
  const workspace = await createWorkspace(request, `E2E Explore ${Date.now()}`);

  const response = await createPlanningArea(
    request,
    `Test Plan from API - ${Date.now()}`,
    geomYosemite,
    workspace.id,
  );
  const plan = await response.json();

  fs.writeFileSync(
    PLAN_FILE,
    JSON.stringify({ workspaceId: workspace.id, planId: plan.id }),
  );
});
