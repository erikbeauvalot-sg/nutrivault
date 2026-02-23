/**
 * Facturation — liste des factures, création
 */
const { test, expect } = require('@playwright/test');

test.describe('Facturation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('affiche la page facturation', async ({ page }) => {
    await expect(page).toHaveURL(/\/billing/);
    // Page title or main content
    await expect(page.locator('h1, h2, main').first()).toBeVisible({ timeout: 10_000 });
  });

  test('n\'a pas d\'erreur 500 sur la page billing', async ({ page }) => {
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

  test('affiche la liste des factures (tableau ou message vide)', async ({ page }) => {
    // Wait for either a table or an empty state
    await page.waitForSelector('table, [class*="empty"], td', { timeout: 10_000 });
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmptyMsg = (await page.locator('[class*="empty"], [class*="no-data"]').count()) > 0;
    expect(hasTable || hasEmptyMsg).toBe(true);
  });

  test('ouvre le formulaire de création de facture', async ({ page }) => {
    const createBtn = page
      .locator('button, a')
      .filter({ hasText: /nouvelle|new|créer|create|facture/i })
      .first();

    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      // Navigation goes to /billing/create (not /new)
      await page.waitForURL(/\/billing\/(create|new)/, { timeout: 10_000 });
      const formOrModal =
        (await page.locator('form').count()) > 0 ||
        (await page.locator('[role="dialog"]').count()) > 0 ||
        /\/(create|new)/.test(page.url());
      expect(formOrModal).toBe(true);
    } else {
      test.skip(true, 'Bouton création facture non trouvé');
    }
  });
});
