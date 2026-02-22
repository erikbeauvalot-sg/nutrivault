/**
 * Playwright screenshot script — NutriVault documentation
 * Captures all screens needed for the consultation template guide
 */

const { chromium } = require('/tmp/pw-tmp/node_modules/playwright');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, 'screenshots');
const USERNAME = 'marion';
const PASSWORD = 'TotoTiti99!';

const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, filename, description) {
  console.log(`📸 ${description}`);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage: false,
  });
}

async function shotElement(page, selector, filename, description) {
  console.log(`📸 ${description}`);
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ timeout: 5000 });
    await el.screenshot({ path: path.join(OUT_DIR, filename) });
  } catch {
    // fallback to full page
    await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
  }
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // ── 1. LOGIN ──────────────────────────────────────────────────────────────
  console.log('\n🔐 Connexion...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await wait(800);

  await page.fill('input[name="username"], input[type="text"]', USERNAME);
  await page.fill('input[name="password"], input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await wait(1500);

  console.log('✅ Connecté — URL:', page.url());

  // ── 2. MENU SIDEBAR ────────────────────────────────────────────────────────
  console.log('\n📋 Captures du menu...');
  await shot(page, '01-menu-sidebar.png', 'Menu latéral');

  // ── 3. LISTE DES TEMPLATES ─────────────────────────────────────────────────
  console.log('\n📋 Navigation vers les templates...');
  // Try sidebar link
  const templateLink = page.locator('a[href*="consultation-template"], a:has-text("Template"), a:has-text("template")').first();
  try {
    await templateLink.click({ timeout: 4000 });
  } catch {
    await page.goto(`${BASE_URL}/consultation-templates`);
  }
  await page.waitForLoadState('networkidle');
  await wait(1500);

  await shot(page, '02-liste-templates.png', 'Page liste des templates');

  // Bouton nouveau template
  await shotElement(page,
    'button:has-text("Nouveau"), button:has-text("nouveau"), a:has-text("Nouveau"), button:has-text("New")',
    '03-bouton-nouveau-template.png',
    'Bouton nouveau template'
  );

  // ── 4. ÉDITEUR DE TEMPLATE (nouveau) ──────────────────────────────────────
  console.log('\n✏️ Ouverture éditeur de template...');
  try {
    await page.click('button:has-text("Nouveau"), button:has-text("nouveau"), a:has-text("Nouveau"), button:has-text("New")', { timeout: 4000 });
  } catch {
    await page.goto(`${BASE_URL}/consultation-templates/new`);
  }
  await page.waitForLoadState('networkidle');
  await wait(1500);

  await shot(page, '04-editeur-template-vide.png', 'Éditeur de template vide');

  // Section informations générales
  await shotElement(page,
    'form, .card, [class*="card"]',
    '05-section-informations.png',
    'Section informations générales'
  );

  // Remplir le formulaire pour avoir un exemple
  try {
    await page.fill('input[placeholder*="Bilan"], input[name="name"], input[placeholder*="template"], input[placeholder*="Template"]', 'Bilan nutritionnel initial');
    await wait(300);
  } catch (e) { console.log('  (champ nom non trouvé, on continue)'); }

  // Boutons d'ajout d'éléments
  await shotElement(page,
    '[class*="items"], [class*="element"], .items-section, button:has-text("Catégorie"), button:has-text("Mesure")',
    '06-boutons-ajout-elements.png',
    'Boutons d\'ajout d\'éléments'
  );

  // ── 5. MODAL CATÉGORIE ────────────────────────────────────────────────────
  console.log('\n📂 Ouverture modal catégorie...');
  try {
    await page.click('button:has-text("Catégorie"), button:has-text("catégorie"), button:has-text("Category")', { timeout: 4000 });
    await wait(1000);
    await shot(page, '07-modal-categorie.png', 'Modal sélection catégorie');

    // Fermer modal
    await page.keyboard.press('Escape');
    await wait(500);
  } catch (e) { console.log('  (modal catégorie non trouvée)'); }

  // ── 6. MODAL MESURE ───────────────────────────────────────────────────────
  console.log('\n📏 Ouverture modal mesure...');
  try {
    await page.click('button:has-text("Mesure"), button:has-text("mesure"), button:has-text("Measure")', { timeout: 4000 });
    await wait(1000);
    await shot(page, '08-modal-mesure.png', 'Modal sélection mesure');
    await page.keyboard.press('Escape');
    await wait(500);
  } catch (e) { console.log('  (modal mesure non trouvée)'); }

  // ── 7. TEMPLATE EXISTANT (si disponible) ──────────────────────────────────
  console.log('\n📝 Retour liste + ouverture template existant...');
  await page.goto(`${BASE_URL}/consultation-templates`);
  await page.waitForLoadState('networkidle');
  await wait(1500);

  // Cliquer sur le premier template existant (modifier)
  try {
    const editBtn = page.locator('button:has-text("Modifier"), a:has-text("Modifier"), [title="Modifier"], button[aria-label*="edit"], a[href*="edit"]').first();
    await editBtn.click({ timeout: 4000 });
    await page.waitForLoadState('networkidle');
    await wait(1500);

    await shot(page, '09-editeur-template-rempli.png', 'Éditeur template avec éléments');

    // Aperçu
    try {
      await page.click('button:has-text("Aperçu"), button:has-text("Preview")', { timeout: 3000 });
      await wait(800);
      await shot(page, '10-editeur-avec-apercu.png', 'Éditeur avec panneau aperçu');
    } catch { console.log('  (bouton aperçu non trouvé)'); }

    // Element instruction visible
    try {
      const instrEl = page.locator('[class*="instruction"], [class*="Instruction"]').first();
      await instrEl.waitFor({ timeout: 3000 });
      await instrEl.screenshot({ path: path.join(OUT_DIR, '11-element-instruction.png') });
    } catch { console.log('  (élément instruction non visible)'); }

  } catch (e) {
    console.log('  (pas de template existant ou bouton modifier non trouvé)');
  }

  // ── 8. LISTE DES VISITES ──────────────────────────────────────────────────
  console.log('\n🏥 Navigation vers les visites...');
  try {
    await page.click('a[href*="visit"], a:has-text("Consultation"), a:has-text("Visite")' , { timeout: 4000 });
  } catch {
    await page.goto(`${BASE_URL}/visits`);
  }
  await page.waitForLoadState('networkidle');
  await wait(1500);

  // Cliquer sur une visite pour voir le détail
  try {
    const firstRow = page.locator('tr.visit-row, .visit-card, table tbody tr').first();
    await firstRow.click({ timeout: 4000 });
    await page.waitForLoadState('networkidle');
    await wait(1500);

    await shot(page, '12-detail-visite.png', 'Détail d\'une visite');

    // Bouton démarrer consultation
    try {
      const startBtn = page.locator('button:has-text("Démarrer"), button:has-text("Consultation"), button:has-text("Start")').first();
      await startBtn.waitFor({ timeout: 4000 });
      await startBtn.screenshot({ path: path.join(OUT_DIR, '13-bouton-demarrer-consultation.png') });

      // Cliquer pour ouvrir le modal
      await startBtn.click();
      await wait(1000);
      await shot(page, '14-modal-selection-template.png', 'Modal sélection template');

      // Fermer
      await page.keyboard.press('Escape');
      await wait(500);
    } catch { console.log('  (bouton démarrer consultation non trouvé)'); }
  } catch (e) { console.log('  (pas de visite disponible)'); }

  // ── 9. ÉDITEUR DE NOTE DE CONSULTATION ────────────────────────────────────
  console.log('\n📓 Recherche d\'une note de consultation existante...');
  await page.goto(`${BASE_URL}/consultation-notes`);
  await page.waitForLoadState('networkidle');
  await wait(1500);

  // Essayer de naviguer vers une note existante
  try {
    const firstNote = page.locator('tr, .card, [class*="note"]').first();
    await firstNote.click({ timeout: 4000 });
    await page.waitForLoadState('networkidle');
    await wait(1500);

    if (page.url().includes('consultation-notes/')) {
      await shot(page, '15-editeur-note-vue-ensemble.png', 'Éditeur note de consultation — vue d\'ensemble');

      // En-tête avec auto-save
      await shotElement(page,
        'header, .sticky, [style*="sticky"], .navbar, h2',
        '16-entete-avec-autosave.png',
        'En-tête avec statut auto-save'
      );

      // Carte catégorie
      try {
        const catCard = page.locator('[class*="card"]:has([class*="category"]), [class*="card"]:has([class*="categor"])').first();
        await catCard.screenshot({ path: path.join(OUT_DIR, '17-carte-categorie.png') });
      } catch {}

      // Carte instruction
      try {
        const instrCard = page.locator('[style*="yellow"], [style*="f39c12"], [class*="instruction"]').first();
        await instrCard.screenshot({ path: path.join(OUT_DIR, '18-carte-instruction.png') });
      } catch {}

      // Bouton terminer & facturer
      try {
        const finishBtn = page.locator('button:has-text("Terminer"), button:has-text("Finish"), button:has-text("Invoice")').first();
        await finishBtn.screenshot({ path: path.join(OUT_DIR, '19-bouton-terminer-facturer.png') });

        // Ouvrir modal
        await finishBtn.click();
        await wait(800);
        await shot(page, '20-modal-terminer-facturer.png', 'Modal Terminer & Facturer');
        await page.keyboard.press('Escape');
      } catch { console.log('  (bouton terminer non trouvé)'); }
    }
  } catch (e) {
    console.log('  (pas de note disponible via /consultation-notes)');

    // Essayer via les visites récentes
    await page.goto(`${BASE_URL}/visits`);
    await page.waitForLoadState('networkidle');
    await wait(1000);
  }

  // ── 10. GESTION TEMPLATES — DUPLIQUER ─────────────────────────────────────
  console.log('\n🔁 Retour liste templates pour dupliquer...');
  await page.goto(`${BASE_URL}/consultation-templates`);
  await page.waitForLoadState('networkidle');
  await wait(1500);

  await shot(page, '21-liste-templates-actions.png', 'Liste templates avec actions');

  // ── FIN ───────────────────────────────────────────────────────────────────
  await browser.close();

  const fs = require('fs');
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n✅ ${files.length} screenshot(s) capturé(s) dans docs/screenshots/`);
  files.forEach(f => console.log(`   • ${f}`));
})();
