import { expect, test } from '@playwright/test';
import { createWorkspace, deleteWorkspace } from '../../../helpers/api-client';

// The map viewer belongs to a workspace, so every test needs one.
let workspaceId: number;

test.beforeEach(async ({ request }) => {
  const workspace = await createWorkspace(request, `E2E Explore ${Date.now()}`);
  workspaceId = workspace.id;
});

test.afterEach(async ({ request }) => {
  await deleteWorkspace(request, workspaceId);
});

test('navigates to the map viewer from the workspace', async ({ page }) => {
  await page.goto(`/workspace/${workspaceId}`);

  await page.locator('sg-card-link .overlay-navigation').click();

  await expect(page).toHaveURL(
    new RegExp(`/map-viewer/workspace/${workspaceId}`)
  );
});

test('map-viewer page has data layers panel and map', async ({ page }) => {
  await page.goto(`/map-viewer/workspace/${workspaceId}`);
  // Data Layers tab is visible
  await expect(page.getByText('Data Layers')).toBeVisible();
  // Search bar is visible
  await expect(
    page.getByPlaceholder('Search by dataset, metric, category, org...')
  ).toBeVisible();
  // Map canvas is rendered
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
});

test('basemap switcher changes the rendered map', async ({ page }) => {
  await page.goto(`/map-viewer/workspace/${workspaceId}`);

  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1000);

  const screenshotBefore = await canvas.screenshot();

  // dispatchEvent avoids the matTooltip CDK overlay that intercepts click() in headless CI
  const trigger = page
    .locator('app-map-base-dropdown img.base-map-icon')
    .first();
  await expect(trigger).toBeVisible();
  await trigger.dispatchEvent('click');

  await page.locator('.base-map-option', { hasText: 'Satellite' }).click();
  await page.waitForTimeout(2000);

  const screenshotAfter = await canvas.screenshot();
  expect(screenshotBefore.equals(screenshotAfter)).toBe(false);
});

test('map count switcher toggles between 1, 2, and 4 maps', async ({
  page,
}) => {
  await page.goto(`/map-viewer/workspace/${workspaceId}`);

  const mapControl = page.locator('app-multi-map-control');
  const buttons = mapControl.locator('button');
  const maps = page.locator('app-synced-map');

  // Default: 1 map
  await expect(buttons.nth(0)).toHaveClass(/active/);
  await expect(maps).toHaveCount(1);

  // Switch to 2 maps
  await buttons.nth(1).click();
  await expect(buttons.nth(1)).toHaveClass(/active/);
  await expect(maps).toHaveCount(2);

  // Switch to 4 maps
  await buttons.nth(2).click();
  await expect(buttons.nth(2)).toHaveClass(/active/);
  await expect(maps).toHaveCount(4);

  // Back to 1 map
  await buttons.nth(0).click();
  await expect(buttons.nth(0)).toHaveClass(/active/);
  await expect(maps).toHaveCount(1);
});
