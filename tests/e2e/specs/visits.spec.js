/**
 * Visit Management E2E Tests
 * Tests visit CRUD operations and status workflows
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { VisitsPage } from '../pages/VisitsPage.js';
import { getTodayDate } from '../fixtures/testData.js';

test.describe('Visit Management', () => {
  let visitsPage;

  test.beforeEach(async ({ page }) => {
    await login(page, 'nutritionist');
    visitsPage = new VisitsPage(page);
    await visitsPage.goto();
  });

  test('should display visits list page', async () => {
    await expect(visitsPage.heading).toBeVisible();
    await expect(visitsPage.createButton).toBeVisible();
  });

  test('should create a new visit', async ({ page }) => {
    await visitsPage.goToCreate();
    
    const visitData = {
      visit_date: getTodayDate(),
      visit_type: 'Initial Consultation',
      chief_complaint: 'Weight management consultation',
      notes: 'Patient interested in healthy eating plan',
      weight: 80.5,
      height: 175,
      blood_pressure_systolic: 120,
      blood_pressure_diastolic: 80
    };
    
    await visitsPage.createVisit(visitData);
    await page.waitForURL(/.*visits/, { timeout: 5000 });
    
    expect(await visitsPage.hasSuccessMessage()).toBeTruthy();
  });

  test('should validate required fields', async ({ page }) => {
    await visitsPage.goToCreate();
    await visitsPage.submitButton.click();
    
    const dateError = page.locator('text=/date.*required/i');
    await expect(dateError).toBeVisible({ timeout: 3000 });
  });

  test('should update visit status', async ({ page }) => {
    // This test assumes a visit exists
    const visitDate = getTodayDate();
    await visitsPage.changeVisitStatus(visitDate, 'completed');
    
    // Wait for update
    await page.waitForTimeout(1000);
  });
});
