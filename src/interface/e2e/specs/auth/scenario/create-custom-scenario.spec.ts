import { test, expect } from '@playwright/test';
import { Geometry } from 'geojson';

// Near Yosemite - TODO: move to a fixture
const test_geom : Geometry = {
		"coordinates": [
			[
				[
					[
						-119.65779327,
						37.710779973
					],
					[
						-119.710478955,
						37.712069036
					],
					[
						-119.793037924,
						37.612315309
					],
					[
						-119.631178844,
						37.575734048
					],
					[
						-119.531239053,
						37.666938478
					],
					[
						-119.65779327,
						37.710779973
					]
				]
			]
		],
		"type": "MultiPolygon"
	}


const PLANNING_AREA_URL = 'planscape-backend/v2/planningareas/'

let planId: number | null = null;

  // 1. SETUP: Create a planning area record via API
  test.beforeAll(async ({ request }) => {
    const response = await request.post(PLANNING_AREA_URL, {
      data: { name: `Test Plan - ${Date.now()}`, geometry: test_geom  } // Unique name using timestamp
    });
    expect(response.ok()).toBeTruthy();

    const plan = await response.json();
    console.log('we have a plan?', plan);
    planId = plan.id;
  });

  // 2. TEARDOWN: Delete the planning area record via API (Runs even if tests fail)
  test.afterAll(async ({ request }) => {
    if (planId) {
      const response = await request.delete(PLANNING_AREA_URL + '/' + planId);
      expect(response.ok()).toBeTruthy();
    }
  });


  test('user can create a scenario', async ({ page }) => {

    // create a planning area
    await page.goto('/plan/' + planId);

  const newScenarioName = `New test scenario - ${Date.now()}`;


    // create scenario

  await page.getByText('add New Scenario').first().click();
  await page.getByRole('textbox').click();
  await page.getByRole('textbox').fill('new scenario');
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.getByText('Optimize Project Areas Would').click();
  await page.getByRole('combobox', { name: 'Stand Size' }).locator('span').click();
  await page.getByRole('option', { name: 'Medium (100 acres)' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByText('Prioritize Areas with High Expected Tree Volume Loss from Wildfire').click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('button').nth(3).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('textbox', { name: 'Min:' }).fill('100');
  await page.getByRole('textbox', { name: 'Min:' }).press('Tab');
  await page.locator('#mat-input-3').fill('10');
  await page.getByRole('button', { name: 'Save & Run Scenario' }).click();
  await page.getByRole('button', { name: 'Run Scenario' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('button')).toBeVisible();
});
