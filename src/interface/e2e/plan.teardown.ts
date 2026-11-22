import { test as teardown } from '@playwright/test';
import fs from 'fs';
import { deletePlanningArea, deleteWorkspace } from './helpers/api-client';
import { PLAN_FILE } from './.support/paths';

teardown('delete planning area', async ({ request }) => {
    const { planId, workspaceId } = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
    await deletePlanningArea(request, planId);
    await deleteWorkspace(request, workspaceId);
});
