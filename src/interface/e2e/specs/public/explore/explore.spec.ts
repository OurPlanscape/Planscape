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
