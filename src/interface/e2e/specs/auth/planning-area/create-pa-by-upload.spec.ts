import { expect, test } from '@playwright/test';
import path from 'path';
import { createWorkspace, deleteWorkspace } from '../../../helpers/api-client';
import { waitForMapIdle } from '../../../helpers/map';

const SHAPEFILE_ZIP = path.resolve(
  __dirname,
  '../../../assets/simple_polygon_4326.zip'
);

test('user can create planning area by uploading area', async ({
  page,
  request,
}) => {
  const planningAreaName = `E2E Upload Plan ${Date.now()}`;
  const workspace = await createWorkspace(request, `E2E Upload ${Date.now()}`);

  await page.goto(`/map-viewer/workspace/${workspace.id}`);
  // the shape is dropped if it lands before the map wires up the drawing tools
  await waitForMapIdle(page);

  // Upload a real zipped shapefile
  await page.getByRole('button', { name: /planning area/i }).click();
  await page.getByRole('menuitem', { name: 'Upload' }).click();

  // wait for the box before uploading: asserting it is gone straight away
  // passes before it even renders, and the shape would not be on the map yet
  const uploadBox = page.locator('app-upload-planning-area-box');
  await expect(uploadBox).toBeVisible();

  await page
    .locator('sg-file-upload input[type="file"]')
    .setInputFiles(SHAPEFILE_ZIP);
  // the box closes once the shape has been parsed and placed on the map
  await expect(uploadBox).toHaveCount(0);

  await page.locator('button.check-button').click();

  await expect(page.getByText('Name your Planning Area')).toBeVisible();
  const planNameInput = page.getByRole('textbox', { name: 'Plan Name' });
  await planNameInput.fill(planningAreaName);
  await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page).toHaveURL(/\/plan\/\d+$/);
  // scoped to the card: the creation success modal also mentions the overview
  await expect(
    page.locator('sg-details-card').getByText('Planning Area Overview')
  ).toBeVisible();
  await expect(page.getByText(planningAreaName, { exact: true })).toBeVisible();

  // Clean up: the workspace takes the planning area with it
  await deleteWorkspace(request, workspace.id);
});
