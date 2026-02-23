/**
 * Dashboard — navigation et widgets
 */
const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('charge le dashboard sans erreur 500', async ({ page }) => {
    const errors = [];
    page.on('response', res => {
      if (res.url().includes('/api/') && res.status() >= 500) {
        errors.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('affiche la sidebar de navigation', async ({ page }) => {
    // Actual class is "sidebar" (plain div)
    const sidebar = page.locator('.sidebar').first();
    await expect(sidebar).toBeVisible();
  });

  test('navigue vers Patients depuis la sidebar', async ({ page }) => {
    const patientsLink = page.locator('.sidebar a[href="/patients"]').first();
    await expect(patientsLink).toBeVisible();
    await patientsLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/patients/);
  });

  test('navigue vers Visites depuis la sidebar', async ({ page }) => {
    const visitsLink = page.locator('.sidebar a[href="/visits"]').first();
    await expect(visitsLink).toBeVisible();
    await visitsLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/visits/);
  });

  test('navigue vers Facturation depuis la sidebar', async ({ page }) => {
    const billingLink = page.locator('.sidebar a[href="/billing"]').first();
    await expect(billingLink).toBeVisible();
    await billingLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/billing/);
  });
});
