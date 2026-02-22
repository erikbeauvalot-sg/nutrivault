/**
 * Second pass — captures manquantes
 */
const { chromium } = require('/tmp/pw-tmp/node_modules/playwright');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, 'screenshots');
const USERNAME = 'marion';
const PASSWORD = 'TotoTiti99!';

async function shot(page, filename, description) {
  console.log(`📸 ${description}`);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // LOGIN
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await wait(600);
  await page.fill('input[type="text"], input[name="username"]', USERNAME);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await wait(1200);
  console.log('✅ Connecté —', page.url());

  // ── A. ÉDITEUR TEMPLATE EXISTANT ─────────────────────────────────────────
  await page.goto(`${BASE_URL}/consultation-templates`);
  await page.waitForLoadState('networkidle');
  await wait(1200);

  // Ouvrir le premier template en modification
  const editBtns = page.locator('a[href*="edit"], button[title*="odif"], button:has-text("Modifier")');
  const count = await editBtns.count();
  console.log(`  Templates modifiables trouvés : ${count}`);
  if (count > 0) {
    await editBtns.first().click();
    await page.waitForLoadState('networkidle');
    await wait(1500);

    // Screenshot éditeur rempli (full page pour voir tous les éléments)
    await page.screenshot({ path: path.join(OUT_DIR, '09b-editeur-template-rempli-full.png'), fullPage: true });
    console.log('📸 Éditeur template rempli (full page)');

    // Chercher bouton aperçu avec différents textes possibles
    const previewBtnSelectors = [
      'button:has-text("Aperçu")',
      'button:has-text("Preview")',
      'button:has-text("Voir")',
      '[class*="preview"]',
    ];
    for (const sel of previewBtnSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.count() > 0) {
        await btn.click();
        await wait(800);
        await shot(page, '10-editeur-avec-apercu.png', 'Éditeur avec panneau aperçu ouvert');
        break;
      }
    }

    // Capture de la section d'ajout d'éléments (boutons + items existants)
    const itemsSection = page.locator('[class*="item"], [class*="element"], .template-items').first();
    if (await itemsSection.count() > 0) {
      await itemsSection.screenshot({ path: path.join(OUT_DIR, '06b-section-elements.png') });
      console.log('📸 Section éléments du template');
    }

    // Modal catégorie
    const catBtns = [
      'button:has-text("+ Catégorie")',
      'button:has-text("Catégorie")',
      'button:has-text("Category")',
      'button:has-text("Ajouter une catégorie")',
    ];
    for (const sel of catBtns) {
      const btn = page.locator(sel).first();
      if (await btn.count() > 0) {
        await btn.click();
        await wait(1000);
        // Si un modal est visible
        const modal = page.locator('[class*="modal"], [role="dialog"], .modal-content').first();
        if (await modal.count() > 0) {
          await shot(page, '07-modal-categorie.png', 'Modal sélection catégorie');
          await page.keyboard.press('Escape');
          await wait(500);
        }
        break;
      }
    }

    // Trouver un élément instruction dans les items
    const instrItems = page.locator('[class*="instruction"], [class*="Instruction"]');
    if (await instrItems.count() > 0) {
      await instrItems.first().screenshot({ path: path.join(OUT_DIR, '11-element-instruction.png') });
      console.log('📸 Élément instruction');
    }
  }

  // ── B. NOTE DE CONSULTATION EXISTANTE ────────────────────────────────────
  // Aller sur la liste des notes
  await page.goto(`${BASE_URL}/consultation-notes`);
  await page.waitForLoadState('networkidle');
  await wait(1200);

  const noteLinks = page.locator('tr, .card, a[href*="consultation-notes/"]');
  const noteCount = await noteLinks.count();
  console.log(`  Notes trouvées : ${noteCount}`);

  // Essayer de naviguer vers la première note via les visites
  await page.goto(`${BASE_URL}/visits`);
  await page.waitForLoadState('networkidle');
  await wait(1200);

  const visitRows = page.locator('tr.visit-row, .visit-card, table tbody tr');
  for (let i = 0; i < Math.min(await visitRows.count(), 5); i++) {
    try {
      await visitRows.nth(i).click();
      await page.waitForLoadState('networkidle');
      await wait(1000);

      const noteLinks2 = page.locator('a[href*="consultation-notes/"]');
      if (await noteLinks2.count() > 0) {
        const href = await noteLinks2.first().getAttribute('href');
        console.log('  Note trouvée via visite:', href);

        await noteLinks2.first().click();
        await page.waitForLoadState('networkidle');
        await wait(1500);

        if (page.url().includes('consultation-notes/')) {
          await shot(page, '15-editeur-note-vue-ensemble.png', 'Éditeur note — vue d\'ensemble');

          // En-tête sticky
          const header = page.locator('[style*="sticky"], .sticky-top, header').first();
          if (await header.count() > 0) {
            await header.screenshot({ path: path.join(OUT_DIR, '16-entete-autosave.png') });
            console.log('📸 En-tête avec auto-save');
          }

          // Scroll pour voir les cartes
          await page.evaluate(() => window.scrollBy(0, 300));
          await wait(500);
          await shot(page, '15b-editeur-note-cartes.png', 'Éditeur note — cartes de champs');

          // Chercher carte catégorie
          const catCards = page.locator('.card, [class*="card"]');
          if (await catCards.count() > 1) {
            await catCards.nth(1).screenshot({ path: path.join(OUT_DIR, '17-carte-categorie-note.png') });
            console.log('📸 Carte catégorie dans note');
          }

          // Chercher zone de résumé (summary textarea)
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await wait(500);
          await shot(page, '22-zone-resume.png', 'Zone de résumé en bas de page');

          // Bouton Terminer & Facturer
          const finishBtn = page.locator('button:has-text("Terminer"), button:has-text("Finish"), button:has-text("Invoice"), button:has-text("Complet")').first();
          if (await finishBtn.count() > 0) {
            await page.evaluate(() => window.scrollTo(0, 0));
            await wait(400);
            await finishBtn.screenshot({ path: path.join(OUT_DIR, '19-bouton-terminer.png') });
            console.log('📸 Bouton Terminer & Facturer');
            await finishBtn.click();
            await wait(800);
            await shot(page, '20-modal-terminer-facturer.png', 'Modal Terminer & Facturer');
            await page.keyboard.press('Escape');
          }
        }
        break;
      }

      await page.goBack();
      await wait(800);
    } catch (e) {
      console.log(`  Visite ${i} ignorée:`, e.message.slice(0, 60));
    }
  }

  // ── C. AUTO-SAVE EN ACTION ────────────────────────────────────────────────
  // Si on est sur une note, déclencher l'auto-save en tapant quelque chose
  if (page.url().includes('consultation-notes/')) {
    const textareas = page.locator('textarea');
    if (await textareas.count() > 0) {
      await textareas.first().click();
      await textareas.first().type('Test auto-save...');
      // Attendre l'indicateur de sauvegarde
      await wait(1000);
      await page.evaluate(() => window.scrollTo(0, 0));
      const spinner = page.locator('.spinner-border, [class*="spinner"]').first();
      if (await spinner.count() > 0) {
        await shot(page, '16b-autosave-en-cours.png', 'Auto-save en cours (spinner)');
      }
      await wait(4000); // attendre saved
      const savedText = page.locator('text=Sauvegarde auto, text=Auto-saved').first();
      if (await savedText.count() > 0) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await shot(page, '16c-autosave-confirme.png', 'Auto-save confirmé (vert)');
      }
    }
  }

  await browser.close();

  const fs = require('fs');
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅ Total : ${files.length} screenshots dans docs/screenshots/`);
  files.forEach(f => console.log(`   • ${f}`));
})();
