import { test, expect } from '@playwright/test';

test('navigate to explore from home', async ({ page }) => {
  await page.goto('/home');
  await page.click('a[routerLink="/explore"]');
  await expect(page).toHaveURL(/\/explore/);
});

test('explore page has data layers panel and map', async ({ page }) => {
  await page.goto('/explore');
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
  await page.goto('/explore');

  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1000);

  const screenshotBefore = await canvas.screenshot();

  // dispatchEvent avoids the matTooltip CDK overlay that intercepts click() in headless CI
  const trigger = page.locator('app-map-base-dropdown img.base-map-icon').first();
  await expect(trigger).toBeVisible();
  await trigger.dispatchEvent('click');

  await page.locator('.base-map-option', { hasText: 'Satellite' }).click();
  await page.waitForTimeout(2000);

  const screenshotAfter = await canvas.screenshot();
  expect(screenshotBefore.equals(screenshotAfter)).toBe(false);
});

test('map count switcher toggles between 1, 2, and 4 maps', async ({ page }) => {
  await page.goto('/explore');

  const mapControl = page.locator('app-multi-map-control');
  const buttons = mapControl.locator('button');
  const maps = page.locator('app-explore-map');

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
