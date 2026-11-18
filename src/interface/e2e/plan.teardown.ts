// plan.teardown.ts (optional, deletes the plan after all e2e tests finish)
import { test as teardown } from '@playwright/test';
import fs from 'fs';
import { deleteWorkspace } from './helpers/api-client';
import { PLAN_FILE } from './.support/paths';

teardown('delete planning area', async ({ request }) => {
    const { planId, workspaceId } = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
    await request.delete(`/api/plans/${planId}/`); // your endpoint
    await deleteWorkspace(request, workspaceId);
});
