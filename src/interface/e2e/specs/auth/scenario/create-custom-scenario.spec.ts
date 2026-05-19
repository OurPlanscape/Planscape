import { test, expect } from '@playwright/test';
import path from 'path';
import { PlanningAreaPage } from '../../../pages/planningarea.page';
import { Geometry } from 'geojson';
import { HttpClient } from '@angular/common/http';

const SHAPEFILE_ZIP = path.resolve(
  __dirname,
  '../../../assets/simple_polygon_4326.zip',
);


interface CreatePlanPayload {
  geometry: Geometry;
  name: string;
}


const http: HttpClient;
let planId : number | null = null;

function createPlan(payload: CreatePlanPayload) {
    await http.post('plan', payload, {
      withCredentials: true,
    });


// 1. SETUP: Create a planning area record via API

// TODO: use a geometry json fixture here
  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/plans', {
      data: { name: `Test Plan - ${Date.now()}` } // Unique name using timestamp
    });
    expect(response.ok()).toBeTruthy();
    
    const plan = await response.json();
    planId = plan.id; 
  });

  // 2. TEARDOWN: Delete the planning area record via API (Runs even if tests fail)
  test.afterAll(async ({ request }) => {
    if (planId) {
      const response = await request.delete(`/api/plans/${planId}`);
      expect(response.ok()).toBeTruthy();
    }
  });


test('user can create a scenario', async ({ page }) => {

// login

// create a planning area

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



// create scenario

  await page.getByText('add New Scenario').first().click({ timeout: 10000 });
  await page.getByRole('textbox').fill('new scenario');
  await page.getByRole('textbox').press('Enter');


  await page.getByRole('menuitem', { name: 'Choose Treatment Goal Start' }).click();
  await page.getByRole('textbox').fill('Treatment Goal Test');
  await page.getByText('Cancel Get Started').click();
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.getByText('Optimize Project Areas Would').click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByText('Stand size is required').click();
  await page.getByRole('combobox', { name: 'Stand Size' }).locator('span').click();
  await page.getByRole('option', { name: 'Medium (100 acres)' }).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByText('Prioritize Areas with High Expected Tree Volume Loss from Wildfire').click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('button').nth(3).click();
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('spinbutton', { name: 'Max Slope' }).click();
  await page.getByRole('spinbutton', { name: 'Max Slope' }).fill('10');
  await page.getByRole('spinbutton', { name: 'Max Slope' }).press('Tab');
  await page.getByRole('textbox', { name: 'Max Distance From Roads' }).fill('10');
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await page.getByRole('textbox', { name: 'Min:' }).click();
  await page.getByRole('textbox', { name: 'Min:' }).fill('1001');
  await page.locator('#mat-input-5').click();
  await page.locator('#mat-input-5').fill('84');
  await page.getByRole('button', { name: 'Save & Run Scenario' }).click();
  await page.getByRole('button', { name: 'Save & Run Scenario' }).click();
  await page.locator('#mat-input-5').click();
  await page.locator('#mat-input-5').press('ArrowRight');
  await page.locator('#mat-input-5').press('ArrowRight');
  await page.locator('#mat-input-5').fill('8');
  await page.getByRole('button', { name: 'Save & Run Scenario' }).click();
  await page.getByRole('button', { name: 'Run Scenario' }).click();
  await page.getByRole('button', { name: 'Close' }).click();





  // Clean up planning area
  const row = page.getByRole('row', { name: new RegExp(planningAreaName) });
  await expect(row).toBeVisible();
  await row.locator('button.more-menu-button').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);



});


/// TODO: test various validations
// test various behaviors, like adding/removing tags
// test that map elements appear and can be removed
//...