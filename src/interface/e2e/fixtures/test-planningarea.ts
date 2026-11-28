import { test as base } from '@playwright/test';
import fs from 'fs';
import { PLAN_FILE } from '../helpers/paths';


export const test = base.extend<{ planId: number; workspaceId: number }>({
  planId: async ({}, use) => {
    await use(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')).planId);
  },
  workspaceId: async ({}, use) => {
    await use(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')).workspaceId);
  },
  // overrides martin requests
  page: async ({ page }, use) => {
    await page.route('**/tiles/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.mapbox-vector-tile',
        body: '', // Mock tiles so we don't need to contact Martin
      });
    });
    await use(page);
  },
});
