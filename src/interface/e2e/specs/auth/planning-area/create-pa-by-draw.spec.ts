import { expect, test } from '@playwright/test';
import { createWorkspace, deleteWorkspace } from '../../../helpers/api-client';
import { waitForMapIdle } from '../../../helpers/map';

test('user can create planning area by drawing on the map', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  const planningAreaName = `E2E Draw Plan ${Date.now()}`;
  const workspace = await createWorkspace(request, `E2E Draw ${Date.now()}`);
  const map = page.getByRole('region', { name: 'Map' });
  const canvas = page.locator('.maplibregl-canvas').first();

  await page.goto(`/map-viewer/workspace/${workspace.id}`);
  await expect(map).toBeVisible();
  await expect(canvas).toBeVisible();

  // Zoom in
  await canvas.hover({ position: { x: 320, y: 320 } });
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -700);
  await waitForMapIdle(page);

  await page.getByRole('button', { name: 'Planning Area' }).click();
  await page.getByRole('menuitem', { name: 'Draw' }).click();
  await expect(page.locator('button.check-button')).toBeVisible();

  await map.click({ position: { x: 223, y: 351 } });
  await map.click({ position: { x: 330, y: 337 } });
  await map.click({ position: { x: 343, y: 398 } });
  await map.click({ position: { x: 212, y: 424 } });
  await map.click({ position: { x: 223, y: 355 } });

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
