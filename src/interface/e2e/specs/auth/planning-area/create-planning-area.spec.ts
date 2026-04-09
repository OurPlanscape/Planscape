import { expect, test } from '@playwright/test';
import path from 'path';

const SHAPEFILE_ZIP = path.resolve(
  __dirname,
  '../../../assets/simple-polygon-4326.zip',
);

test(
  'user can create planning area by uploading area',
  { tag: ['@smoke'] },
  async ({ page }, testInfo) => {
    const planningAreaName = `E2E Upload Plan ${Date.now()}`;
    const debugLines: string[] = [];

    const isPlanningAreaRequest = (url: string) =>
      url.includes('/planscape-backend/v2/planningareas/');

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!isPlanningAreaRequest(url)) {
        return;
      }
      debugLines.push(
        `REQUEST FAILED ${request.method()} ${url} ${request.failure()?.errorText ?? 'unknown'}`
      );
    });

    page.on('response', (response) => {
      const url = response.url();
      if (!isPlanningAreaRequest(url)) {
        return;
      }
      debugLines.push(`RESPONSE ${response.status()} ${response.request().method()} ${url}`);
    });

    page.on('pageerror', (error) => {
      debugLines.push(`PAGE ERROR ${error.message}`);
    });

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        debugLines.push(`CONSOLE ${message.type().toUpperCase()} ${message.text()}`);
      }
    });

    try {
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

      const createPlanResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          isPlanningAreaRequest(response.url()) &&
          response.url().endsWith('/planscape-backend/v2/planningareas/')
      );

      await page.getByRole('button', { name: 'Create' }).click();

      const createPlanResponse = await createPlanResponsePromise;
      let createdPlanId: number | null = null;
      try {
        const payload = await createPlanResponse.json();
        createdPlanId = payload?.id ?? null;
        debugLines.push(
          `CREATE PAYLOAD id=${createdPlanId ?? 'unknown'} name=${payload?.name ?? 'unknown'}`
        );
      } catch {
        debugLines.push('CREATE PAYLOAD could not be parsed as JSON');
      }

      await expect(page).toHaveURL(/\/plan\/\d+$/);

      if (createdPlanId !== null) {
        const getPlanResponse = await page.waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes(
              `/planscape-backend/v2/planningareas/${createdPlanId}/`
            )
        );
        debugLines.push(
          `DETAIL FETCH ${getPlanResponse.status()} ${getPlanResponse.url()}`
        );
      }

      const overlayLoader = page.locator('sg-overlay-loader');
      await expect(overlayLoader).toHaveCount(0, { timeout: 15000 });

      const resourceUnavailable = page.locator('app-resource-unavailable');
      const planningAreaDetailsCard = page.locator('app-planning-area-details-card');
      debugLines.push(`FINAL URL ${page.url()}`);
      debugLines.push(
        `RESOURCE UNAVAILABLE COUNT ${await resourceUnavailable.count()}`
      );
      debugLines.push(`PLAN CARD COUNT ${await planningAreaDetailsCard.count()}`);

      await expect(resourceUnavailable).toHaveCount(0, { timeout: 15000 });
      await expect(planningAreaDetailsCard).toBeVisible({ timeout: 15000 });
      await expect(planningAreaDetailsCard).toContainText('Planning Area Overview', {
        timeout: 15000,
      });
      await expect(planningAreaDetailsCard).toContainText(planningAreaName, {
        timeout: 15000,
      });

      await page.goto('/home');

      // Clean up
      const row = page.getByRole('row', { name: new RegExp(planningAreaName) });
      await expect(row).toBeVisible();
      await row.locator('button.more-menu-button').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(row).toHaveCount(0);
    } finally {
      const bodyText = await page
        .locator('body')
        .innerText()
        .catch(() => 'Unable to capture body text');

      await testInfo.attach('planning-area-network-log', {
        body: Buffer.from(debugLines.join('\n') || 'No planning area network events captured'),
        contentType: 'text/plain',
      });
      await testInfo.attach('plan-page-text', {
        body: Buffer.from(bodyText),
        contentType: 'text/plain',
      });
    }
  }
);
