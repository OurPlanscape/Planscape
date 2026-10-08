import { expect, Page } from '@playwright/test';

/**
 * Resolves once the map has stopped repainting. The map viewer only wires the
 * drawing tools in once MapLibre finishes loading, so acting before that
 * silently does nothing.
 */
export async function waitForMapIdle(page: Page) {
  await expect(page.locator('.maplibregl-canvas').first()).toBeVisible();
  await page.waitForFunction(() => {
    return new Promise<boolean>((resolve) => {
      const canvas = document.querySelector(
        '.maplibregl-canvas'
      ) as HTMLCanvasElement;
      if (!canvas) return resolve(false);
      const snap = canvas.toDataURL();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(canvas.toDataURL() === snap);
        });
      });
    });
  });
}
