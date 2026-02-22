/**
 * Final screenshot pass — uses exact selectors from debug
 */
const { chromium } = require('/tmp/pw-tmp/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001/api';
const OUT_DIR = path.join(__dirname, 'screenshots');

async function shot(page, filename, desc, fullPage = false) {
  console.log(`📸 ${desc}`);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage });
}

async function el(page, selector, filename, desc) {
  console.log(`📸 ${desc}`);
  try {
    const loc = page.locator(selector).first();
    await loc.waitFor({ timeout: 4000 });
    await loc.screenshot({ path: path.join(OUT_DIR, filename) });
  } catch (e) {
    console.log(`  ⚠️  Element not found: ${selector.slice(0, 60)}`);
  }
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── LOGIN ────────────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await wait(600);
  await page.fill('input[type="text"]', 'marion');
  await page.fill('input[type="password"]', 'TotoTiti99!');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await wait(1200);

  // Récupérer le token via localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('nutrivault_access_token') ||
           sessionStorage.getItem('nutrivault_access_token');
  });
  console.log('Token récupéré:', token ? '✅' : '❌');

  // ── 1. MENU SIDEBAR ───────────────────────────────────────────────────────
  await shot(page, '01-menu-sidebar.png', 'Menu latéral (dashboard)');

  // ── 2. LISTE DES TEMPLATES ────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/consultation-templates`);
  await page.waitForLoadState('networkidle');
  await wait(1500);
  await shot(page, '02-liste-templates.png', 'Liste des templates');

  // Zoom sur le bouton "Nouveau modele"
  await el(page, 'button:has-text("Nouveau modele")', '03-bouton-nouveau-template.png', 'Bouton Nouveau modele');

  // ── 3. ÉDITEUR DE TEMPLATE (nouveau) ─────────────────────────────────────
  await page.click('button:has-text("Nouveau modele")');
  await page.waitForLoadState('networkidle');
  await wait(1500);
  await shot(page, '04-editeur-template-vide.png', 'Éditeur template vide');

  // Section informations
  await el(page, '.card', '05-section-informations.png', 'Section informations générales');

  // Remplir nom pour l'exemple
  const nameInput = page.locator('input').first();
  if (await nameInput.count()) {
    await nameInput.fill('Bilan nutritionnel initial');
    await wait(300);
  }

  // Zone des boutons d'ajout
  const addBtns = page.locator('button').filter({ hasText: /Catégorie|Mesure|Instruction/i }).first();
  if (await addBtns.count()) {
    await addBtns.screenshot({ path: path.join(OUT_DIR, '06-boutons-ajout-elements.png') });
    console.log('📸 Boutons d\'ajout d\'éléments');
  }

  // Modal catégorie
  const catBtn = page.locator('button').filter({ hasText: /Catégorie/i }).first();
  if (await catBtn.count()) {
    await catBtn.click();
    await wait(1000);
    const modal = page.locator('.modal-content, [role="dialog"], [class*="modal"]').first();
    if (await modal.count()) {
      await shot(page, '07-modal-categorie.png', 'Modal sélection catégorie');
      await page.keyboard.press('Escape');
      await wait(500);
    }
  }

  // Modal mesure
  const mesureBtn = page.locator('button').filter({ hasText: /Mesure/i }).first();
  if (await mesureBtn.count()) {
    await mesureBtn.click();
    await wait(1000);
    const modal = page.locator('.modal-content, [role="dialog"], [class*="modal"]').first();
    if (await modal.count()) {
      await shot(page, '08-modal-mesure.png', 'Modal sélection mesure');
      await page.keyboard.press('Escape');
      await wait(500);
    }
  }

  // ── 4. TEMPLATE EXISTANT — ÉDITEUR REMPLI ────────────────────────────────
  await page.goto(`${BASE_URL}/consultation-templates`);
  await page.waitForLoadState('networkidle');
  await wait(1500);

  // Les boutons edit (outline-secondary sans texte = icône crayon, index 0 = 1er template)
  // Il y a 2 templates, chacun a 2 boutons outline-secondary + 1 danger
  // On cherche le premier bouton qui n'est pas danger
  const iconBtns = page.locator('.btn-outline-secondary.btn-sm').first();
  if (await iconBtns.count()) {
    await iconBtns.click();
    await page.waitForLoadState('networkidle');
    await wait(1500);
    console.log('URL après click edit:', page.url());

    if (page.url().includes('edit') || page.url().includes('consultation-template')) {
      await shot(page, '09-editeur-template-rempli.png', 'Éditeur template avec éléments');

      // Bouton aperçu "📋 Aperçu"
      const previewBtn = page.locator('button').filter({ hasText: /Aperçu|Preview/i }).first();
      if (await previewBtn.count()) {
        await previewBtn.click();
        await wait(800);
        await shot(page, '10-editeur-avec-apercu.png', 'Éditeur avec panneau aperçu ouvert');
      }

      // Instruction element
      const instrEl = page.locator('[class*="instruction"], [class*="Instruction"], .instruction').first();
      if (await instrEl.count()) {
        await instrEl.screenshot({ path: path.join(OUT_DIR, '11-element-instruction.png') });
        console.log('📸 Élément instruction');
      }

      // Bouton save
      const saveBtn = page.locator('button').filter({ hasText: /Enregistrer|Save/i }).first();
      if (await saveBtn.count()) {
        await saveBtn.screenshot({ path: path.join(OUT_DIR, '23-bouton-enregistrer.png') });
        console.log('📸 Bouton Enregistrer');
      }
    }
  }

  // ── 5. DÉTAIL VISITE avec "Démarrer la consultation" ─────────────────────
  // Visit 1 = 52b7fcad-52cc-405b-b04e-f66a5bc6453a
  await page.goto(`${BASE_URL}/visits/52b7fcad-52cc-405b-b04e-f66a5bc6453a`);
  await page.waitForLoadState('networkidle');
  await wait(1500);
  await shot(page, '12-detail-visite.png', 'Détail d\'une visite');

  // Bouton Démarrer la consultation
  const startBtn = page.locator('button:has-text("Demarrer la consultation")').first();
  if (await startBtn.count()) {
    await startBtn.screenshot({ path: path.join(OUT_DIR, '13-bouton-demarrer-consultation.png') });
    console.log('📸 Bouton Démarrer la consultation');
    await startBtn.click();
    await wait(1000);
    await shot(page, '14-modal-selection-template.png', 'Modal sélection template');
    await page.keyboard.press('Escape');
    await wait(500);
  }

  // ── 6. NOTE DE CONSULTATION EXISTANTE via API ─────────────────────────────
  // Récupérer les notes via fetch dans le browser
  const notesData = await page.evaluate(async (apiUrl) => {
    try {
      const token = localStorage.getItem('nutrivault_access_token') ||
                    sessionStorage.getItem('nutrivault_access_token');
      const res = await fetch(`${apiUrl}/consultation-notes?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data;
    } catch (e) { return { error: e.message }; }
  }, API_URL);

  console.log('Notes API response:', JSON.stringify(notesData).slice(0, 300));

  let noteId = null;
  if (notesData && notesData.data && notesData.data.length > 0) {
    noteId = notesData.data[0].id;
  } else if (Array.isArray(notesData) && notesData.length > 0) {
    noteId = notesData[0].id;
  }

  if (noteId) {
    console.log('Note ID:', noteId);
    await page.goto(`${BASE_URL}/consultation-notes/${noteId}`);
    await page.waitForLoadState('networkidle');
    await wait(1500);

    if (page.url().includes('consultation-notes/')) {
      await shot(page, '15-editeur-note-vue-ensemble.png', 'Éditeur note de consultation — vue d\'ensemble');

      // En-tête sticky
      const stickyRow = page.locator('[style*="sticky"]').first();
      if (await stickyRow.count()) {
        await stickyRow.screenshot({ path: path.join(OUT_DIR, '16-entete-autosave.png') });
        console.log('📸 En-tête sticky avec statuts');
      }

      // Cartes dans la note
      await page.evaluate(() => window.scrollBy(0, 200));
      await wait(400);
      const cards = page.locator('.card');
      const cardCount = await cards.count();
      console.log(`  Cards in note: ${cardCount}`);
      if (cardCount > 1) {
        await cards.nth(1).screenshot({ path: path.join(OUT_DIR, '17-carte-categorie-note.png') });
        console.log('📸 Carte catégorie dans note');
      }

      // Zone résumé (bas de page)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await wait(500);
      await shot(page, '22-zone-resume.png', 'Zone résumé en bas de page');

      // Bouton Terminer
      await page.evaluate(() => window.scrollTo(0, 0));
      await wait(300);
      const finishBtn = page.locator('button').filter({ hasText: /Terminer|Finish|Factur/i }).first();
      if (await finishBtn.count()) {
        await finishBtn.screenshot({ path: path.join(OUT_DIR, '19-bouton-terminer.png') });
        console.log('📸 Bouton Terminer & Facturer');
        await finishBtn.click();
        await wait(800);
        await shot(page, '20-modal-terminer-facturer.png', 'Modal Terminer & Facturer');
        await page.keyboard.press('Escape');
        await wait(300);
      }

      // Déclencher auto-save visible
      const textareas = page.locator('textarea');
      if (await textareas.count()) {
        await textareas.first().click();
        await page.keyboard.press('End');
        await page.keyboard.type(' .');
        await wait(800);
        await page.evaluate(() => window.scrollTo(0, 0));
        await shot(page, '16b-autosave-saving.png', 'Auto-save en cours');
        await wait(3500);
        await shot(page, '16c-autosave-saved.png', 'Auto-save confirmé');
      }
    }
  } else {
    console.log('⚠️  Aucune note de consultation trouvée pour Marion');
  }

  // ── 7. LISTE TEMPLATES — actions visibles ─────────────────────────────────
  await page.goto(`${BASE_URL}/consultation-templates`);
  await page.waitForLoadState('networkidle');
  await wait(1500);
  await shot(page, '21-liste-templates-actions.png', 'Liste templates avec boutons d\'action');

  // ── FIN ───────────────────────────────────────────────────────────────────
  await browser.close();

  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅ Total : ${files.length} screenshots`);
  files.forEach(f => console.log(`   • ${f}`));
})();
