/**
 * Templates de consultation — liste, création, édition
 */
const { test, expect } = require('@playwright/test');

test.describe('Templates de consultation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/consultation-templates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
  });

  test('affiche la liste des templates', async ({ page }) => {
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('affiche au moins un template existant', async ({ page }) => {
    const count = await page.locator('.card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('ouvre l\'éditeur de nouveau template', async ({ page }) => {
    // Button text is "Nouveau modele"
    const newBtn = page.locator('button').filter({ hasText: /nouveau modele|new/i }).first();
    await expect(newBtn).toBeVisible();
    await newBtn.click();
    await page.waitForURL(/\/consultation-templates\/new/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/consultation-templates\/new/);
  });

  test('l\'éditeur affiche les boutons Catégorie et Mesure', async ({ page }) => {
    await page.goto('/consultation-templates/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Actual buttons: "Ajouter une categorie" and "Ajouter une mesure"
    const catBtn = page.locator('button').filter({ hasText: /categ/i }).first();
    const measBtn = page.locator('button').filter({ hasText: /mesure|measure/i }).first();
    await expect(catBtn).toBeVisible({ timeout: 10_000 });
    await expect(measBtn).toBeVisible({ timeout: 10_000 });
  });

  test('ouvre la modal Catégorie', async ({ page }) => {
    await page.goto('/consultation-templates/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const catBtn = page.locator('button').filter({ hasText: /categ/i }).first();
    await catBtn.click();
    await page.waitForTimeout(800);

    const modal = page.locator('[role="dialog"], .modal-content, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  });

  test('ouvre la modal Mesure', async ({ page }) => {
    await page.goto('/consultation-templates/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const measBtn = page.locator('button').filter({ hasText: /mesure|measure/i }).first();
    await measBtn.click();
    await page.waitForTimeout(800);

    const modal = page.locator('[role="dialog"], .modal-content, [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
  });

  test('permet de saisir un nom de template', async ({ page }) => {
    await page.goto('/consultation-templates/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const nameInput = page.locator('input').first();
    await nameInput.fill('Test E2E - Template fonctionnel');
    await expect(nameInput).toHaveValue('Test E2E - Template fonctionnel');
  });

  test('ouvre l\'éditeur d\'un template existant', async ({ page }) => {
    // Wait for template cards to render (.card.h-100 are the template cards)
    await page.waitForSelector('.card.h-100', { timeout: 10_000 });

    // Click the first template card — the card itself navigates to the edit page
    const templateCard = page.locator('.card.h-100').first();
    if ((await templateCard.count()) > 0) {
      await templateCard.click();
      // Wait for URL to change to /consultation-templates/:id/edit
      await page.waitForURL(/\/consultation-templates\/.+\/edit/, { timeout: 10_000 });
      await expect(page).toHaveURL(/\/consultation-templates\/.+\/edit/);
    } else {
      test.skip(true, 'Aucun template existant trouvé');
    }
  });
});
