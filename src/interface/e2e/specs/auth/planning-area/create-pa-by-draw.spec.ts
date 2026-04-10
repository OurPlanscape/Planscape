import { expect, test } from '@playwright/test';

test('user can create planning area by drawing on the map', async ({ page }) => {
  const planningAreaName = `E2E Draw Plan ${Date.now()}`;
  const map = page.getByRole('region', { name: 'Map' });
  const canvas = page.locator('.maplibregl-canvas').first();

  await page.goto('/map-viewer');
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
  await page.waitForTimeout(400);

  await map.click({ position: { x: 404, y: 337 } });
  await page.waitForTimeout(250);
  await map.click({ position: { x: 200, y: 361 } });
  await page.waitForTimeout(250);
  await map.click({ position: { x: 276, y: 384 } });
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Planning Area' }).click();
  await page.getByRole('menuitem', { name: 'Draw' }).click();
  await page.waitForTimeout(500);

  await map.click({ position: { x: 223, y: 351 } });
  await page.waitForTimeout(250);
  await map.click({ position: { x: 330, y: 337 } });
  await page.waitForTimeout(250);
  await map.click({ position: { x: 343, y: 398 } });
  await page.waitForTimeout(250);
  await map.click({ position: { x: 212, y: 424 } });
  await page.waitForTimeout(250);
  await map.click({ position: { x: 223, y: 355 } });
  await page.waitForTimeout(400);

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
  await row.getByLabel('more options').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
});
