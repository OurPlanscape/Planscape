import { test as base } from '@playwright/test';
import fs from 'fs';
import { PLAN_FILE } from '../.support/paths';

export const test = base.extend<{ planId: number; workspaceId: number }>({
  planId: async ({}, use) => {
    await use(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')).planId);
  },
  workspaceId: async ({}, use) => {
    await use(JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8')).workspaceId);
  },
});