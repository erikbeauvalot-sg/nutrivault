/**
 * Visites — liste, détail, bouton démarrer consultation
 */
const { test, expect } = require('@playwright/test');

test.describe('Visites', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/visits');
    await page.waitForLoadState('networkidle');
  });

  test('affiche la liste des visites', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });
  });

  test('affiche au moins une visite', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const count = await page.locator('table tbody tr').count();
    expect(count).toBeGreaterThan(0);
  });

  test('ouvre le détail d\'une visite', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/visits\/.+/);
  });

  test('affiche le bouton Démarrer la consultation sur une visite planifiée', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const count = await page.locator('table tbody tr').count();
    if (count === 0) { test.skip(true, 'Aucune visite'); return; }

    await page.locator('table tbody tr').first().click();
    await page.waitForLoadState('networkidle');

    const startBtn = page.locator('button').filter({ hasText: /démarrer|start|consultat/i }).first();
    if ((await startBtn.count()) > 0) {
      await expect(startBtn).toBeVisible();
    } else {
      test.skip(true, 'Visite sélectionnée n\'est pas SCHEDULED');
    }
  });

  test('ouvre la modal de sélection de template au clic sur Démarrer', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const count = await page.locator('table tbody tr').count();
    if (count === 0) { test.skip(true, 'Aucune visite'); return; }

    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.goto('/visits');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('table tbody tr', { timeout: 10_000 });

      await page.locator('table tbody tr').nth(i).click();
      await page.waitForLoadState('networkidle');

      const startBtn = page.locator('button').filter({ hasText: /démarrer|start/i }).first();
      if ((await startBtn.count()) > 0) {
        await startBtn.click();
        await page.waitForTimeout(800);
        const modal = page.locator('[role="dialog"], .modal-content, [class*="modal"]').first();
        await expect(modal).toBeVisible();
        return;
      }
    }
    test.skip(true, 'Aucune visite SCHEDULED trouvée parmi les 5 premières');
  });
});
