import { expect, test } from '@playwright/test';
import path from 'path';

const SHAPEFILE_ZIP = path.resolve(
  __dirname,
  '../../../assets/simple_polygon_4326.zip',
);

test('user can create planning area by uploading area', async ({ page }) => {
  const planningAreaName = `E2E Upload Plan ${Date.now()}`;

  await page.goto('/map-viewer');

  // Upload a real zipped shapefile
  await page.getByRole('button', { name: /planning area/i }).click();
  await page.getByRole('menuitem', { name: 'Upload' }).click();

  await page.locator('sg-file-upload input[type="file"]').setInputFiles(SHAPEFILE_ZIP);
  await expect(page.locator('app-upload-planning-area-box')).toHaveCount(0);

  await page.locator('button.check-button').click();

  await expect(page.getByText('Name your Planning Area')).toBeVisible();
  const planNameInput = page.getByRole('textbox', { name: 'Plan Name' });
  await planNameInput.fill(planningAreaName);
  await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page).toHaveURL(/\/plan\/\d+$/);
  await expect(page.getByText('Planning Area Overview')).toBeVisible();
  await expect(page.getByText(planningAreaName, { exact: true })).toBeVisible();

  await page.goto('/home');

  // Clean up
  const row = page.getByRole('row', { name: new RegExp(planningAreaName) });
  await expect(row).toBeVisible();
  await row.locator('button.more-menu-button').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
});
