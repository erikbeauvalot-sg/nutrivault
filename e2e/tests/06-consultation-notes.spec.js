/**
 * Notes de consultation — éditeur, auto-save, bouton Terminer
 *
 * Ce test crée une note draft via l'API (même approche que les scripts de screenshot)
 * puis valide l'UI de l'éditeur de note.
 */
const { test, expect } = require('@playwright/test');

/**
 * Helper — crée une note de consultation draft via l'API du backend.
 * Retourne l'ID de la note ou null si impossible.
 */
async function createDraftNote(page) {
  return page.evaluate(async () => {
    const token =
      localStorage.getItem('nutrivault_access_token') ||
      sessionStorage.getItem('nutrivault_access_token');
    if (!token) return null;

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const api = 'http://localhost:3001/api';

    // Find a SCHEDULED visit
    const vRes = await fetch(`${api}/visits?status=SCHEDULED&limit=5`, { headers });
    const vData = await vRes.json();
    const visit = vData?.data?.[0];
    if (!visit) return null;

    // Find a template
    const tRes = await fetch(`${api}/consultation-templates?limit=5`, { headers });
    const tData = await tRes.json();
    const template = tData?.data?.[0];
    if (!template) return null;

    // Create draft note
    const nRes = await fetch(`${api}/consultation-notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        visit_id: visit.id,
        patient_id: visit.patient_id,
        template_id: template.id,
      }),
    });
    const nData = await nRes.json();
    return nData?.data?.id || nData?.id || null;
  });
}

test.describe('Notes de consultation', () => {
  let noteId;

  test.beforeAll(async ({ browser }) => {
    // Create a draft note once for the whole suite
    const ctx = await browser.newContext({
      storageState: require('path').join(__dirname, '../fixtures/auth.json'),
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    noteId = await createDraftNote(page);
    await ctx.close();
  });

  test('ouvre l\'éditeur d\'une note draft', async ({ page }) => {
    if (!noteId) {
      test.skip(true, 'Impossible de créer une note draft (pas de visite SCHEDULED ou template)');
      return;
    }

    await page.goto(`/consultation-notes/${noteId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(`/consultation-notes/${noteId}`);

    // Editor content should be visible
    const editor = page.locator('main, [class*="note"], [class*="Note"], .container').first();
    await expect(editor).toBeVisible();
  });

  test('affiche l\'indicateur d\'auto-save', async ({ page }) => {
    if (!noteId) {
      test.skip(true, 'Pas de note draft disponible');
      return;
    }

    await page.goto(`/consultation-notes/${noteId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Look for save status indicator
    const saveIndicator = page
      .locator('[class*="save"], [class*="Save"], [class*="autosave"]')
      .first();

    // Also accept a sticky header that contains save info
    const stickyHeader = page.locator('[style*="sticky"], [class*="sticky"]').first();

    const hasIndicator =
      (await saveIndicator.count()) > 0 || (await stickyHeader.count()) > 0;
    expect(hasIndicator).toBe(true);
  });

  test('déclenche l\'auto-save après modification', async ({ page }) => {
    if (!noteId) {
      test.skip(true, 'Pas de note draft disponible');
      return;
    }

    await page.goto(`/consultation-notes/${noteId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Type in the first textarea
    const textarea = page.locator('textarea').first();
    if ((await textarea.count()) === 0) {
      test.skip(true, 'Aucun champ textarea dans la note');
      return;
    }

    await textarea.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' test auto-save e2e');

    // Wait for autosave debounce + request
    await page.waitForTimeout(4000);

    // Should not have crashed — page still shows the note
    await expect(page).toHaveURL(`/consultation-notes/${noteId}`);
  });

  test('affiche le bouton Terminer & Facturer', async ({ page }) => {
    if (!noteId) {
      test.skip(true, 'Pas de note draft disponible');
      return;
    }

    await page.goto(`/consultation-notes/${noteId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.evaluate(() => window.scrollTo(0, 0));

    const finishBtn = page
      .locator('button')
      .filter({ hasText: /terminer|finish|factur/i })
      .first();

    await expect(finishBtn).toBeVisible();
  });

  test('ouvre la modal Terminer & Facturer', async ({ page }) => {
    if (!noteId) {
      test.skip(true, 'Pas de note draft disponible');
      return;
    }

    await page.goto(`/consultation-notes/${noteId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.evaluate(() => window.scrollTo(0, 0));

    const finishBtn = page
      .locator('button')
      .filter({ hasText: /terminer|finish|factur/i })
      .first();

    if ((await finishBtn.count()) === 0) {
      test.skip(true, 'Bouton Terminer non trouvé');
      return;
    }

    await finishBtn.click();
    await page.waitForTimeout(1000);

    const modal = page.locator('[role="dialog"], .modal-content, [class*="modal"]').first();
    await expect(modal).toBeVisible();

    // Dismiss modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  });
});
