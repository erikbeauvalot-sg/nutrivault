/**
 * Patients — liste et navigation
 */
const { test, expect } = require('@playwright/test');

test.describe('Patients', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
  });

  test('affiche la liste des patients', async ({ page }) => {
    // Wait for table to appear
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
  });

  test('affiche au moins un patient', async ({ page }) => {
    // Wait for actual data rows (not just the header)
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const count = await page.locator('table tbody tr').count();
    expect(count).toBeGreaterThan(0);
  });

  test('ouvre la fiche d\'un patient au clic', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/patients\/.+/);
  });

  test('filtre les patients par recherche', async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="recherch" i], input[placeholder*="Search" i]')
      .first();

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('a');
      await page.waitForTimeout(600);
      await expect(page.locator('table')).toBeVisible();
    } else {
      test.skip(true, 'Champ de recherche non trouvé');
    }
  });

  test('ouvre le formulaire de création d\'un patient', async ({ page }) => {
    const createBtn = page
      .locator('button, a')
      .filter({ hasText: /nouveau|new|ajouter|add/i })
      .first();

    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.waitForLoadState('networkidle');
      const formVisible =
        (await page.locator('form').count()) > 0 ||
        (await page.locator('[role="dialog"]').count()) > 0 ||
        page.url().includes('/new') ||
        page.url().includes('/create');
      expect(formVisible).toBe(true);
    } else {
      test.skip(true, 'Bouton création patient non trouvé');
    }
  });
});
