const { chromium } = require('/tmp/pw-tmp/node_modules/playwright');
const path = require('path');
const OUT = path.join(__dirname, 'screenshots');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });

  // Login
  await p.goto('http://localhost:5173/login');
  await p.waitForLoadState('networkidle');
  await p.fill('input[type="text"]', 'marion');
  await p.fill('input[type="password"]', 'TotoTiti99!');
  await p.click('button[type="submit"]');
  await p.waitForLoadState('networkidle');
  await wait(1000);

  // ── 1. MODAL CATÉGORIE via éditeur de template ────────────────────────────
  // Créer un nouveau template pour avoir accès aux boutons
  await p.goto('http://localhost:5173/consultation-templates/new');
  await p.waitForLoadState('networkidle');
  await wait(1500);

  // Chercher tous les boutons et leur texte
  const btns = await p.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map(b => ({ text: b.textContent.trim(), cls: b.className }))
  );
  console.log('Boutons sur /new:', btns.filter(b => b.text).map(b => b.text).slice(0, 20));

  // Cliquer sur le bouton catégorie (peu importe le texte exact)
  for (const btn of btns) {
    if (/catégor|category|categ/i.test(btn.text)) {
      console.log('Clic sur:', btn.text);
      await p.click(`button:has-text("${btn.text}")`).catch(() => {});
      await wait(1200);
      const modal = p.locator('.modal-content, [role="dialog"]').first();
      if (await modal.count()) {
        await p.screenshot({ path: path.join(OUT, '07-modal-categorie.png') });
        console.log('📸 Modal catégorie capturé');
        await p.keyboard.press('Escape');
      }
      break;
    }
  }

  // ── 2. CRÉER UNE NOTE EN DRAFT pour Terminer & Facturer ──────────────────
  // Trouver une visite SCHEDULED sans note
  const token = await p.evaluate(() =>
    localStorage.getItem('nutrivault_access_token') ||
    sessionStorage.getItem('nutrivault_access_token')
  );

  // Trouver les visites SCHEDULED
  const visits = await p.evaluate(async (tkn) => {
    const r = await fetch('http://localhost:3001/api/visits?status=SCHEDULED&limit=5', {
      headers: { Authorization: `Bearer ${tkn}` }
    });
    const d = await r.json();
    return d;
  }, token);
  console.log('Visites SCHEDULED:', JSON.stringify(visits).slice(0, 200));

  // Chercher une visite avec une note draft
  const notes = await p.evaluate(async (tkn) => {
    const r = await fetch('http://localhost:3001/api/consultation-notes?status=draft&limit=5', {
      headers: { Authorization: `Bearer ${tkn}` }
    });
    const d = await r.json();
    return d;
  }, token);
  console.log('Notes DRAFT:', JSON.stringify(notes).slice(0, 300));

  let draftNoteId = null;
  const noteList = notes?.data || (Array.isArray(notes) ? notes : []);
  if (noteList.length > 0) {
    draftNoteId = noteList[0].id;
    console.log('Draft note ID:', draftNoteId);
  }

  // Si pas de draft, en créer une via l'API
  if (!draftNoteId) {
    // Trouver des templates disponibles
    const templates = await p.evaluate(async (tkn) => {
      const r = await fetch('http://localhost:3001/api/consultation-templates?limit=5', {
        headers: { Authorization: `Bearer ${tkn}` }
      });
      const d = await r.json();
      return d;
    }, token);
    console.log('Templates:', JSON.stringify(templates).slice(0, 200));

    const tplList = templates?.data || (Array.isArray(templates) ? templates : []);
    const visitList = visits?.data || (Array.isArray(visits) ? visits : []);

    if (tplList.length > 0 && visitList.length > 0) {
      const newNote = await p.evaluate(async (tkn, visitId, patientId, templateId) => {
        const r = await fetch('http://localhost:3001/api/consultation-notes', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tkn}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ visit_id: visitId, patient_id: patientId, template_id: templateId })
        });
        const d = await r.json();
        return d;
      }, token, visitList[0].id, visitList[0].patient_id, tplList[0].id);
      console.log('Created note:', JSON.stringify(newNote).slice(0, 200));
      draftNoteId = newNote?.data?.id || newNote?.id;
    }
  }

  // Naviguer vers la note draft
  if (draftNoteId) {
    await p.goto(`http://localhost:5173/consultation-notes/${draftNoteId}`);
    await p.waitForLoadState('networkidle');
    await wait(1500);
    console.log('URL note:', p.url());

    // Bouton Terminer & Facturer
    const finishBtn = p.locator('button').filter({ hasText: /Terminer|Finish|Factur|Invoice|Complet/i }).first();
    const fCount = await finishBtn.count();
    console.log('Finish buttons found:', fCount);

    if (fCount > 0) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await finishBtn.screenshot({ path: path.join(OUT, '19-bouton-terminer.png') });
      console.log('📸 Bouton Terminer capturé');

      await finishBtn.click();
      await wait(1000);
      await p.screenshot({ path: path.join(OUT, '20-modal-terminer-facturer.png') });
      console.log('📸 Modal Terminer capturé');
      await p.keyboard.press('Escape');
    } else {
      // Lister tous les boutons
      const allBtns = await p.evaluate(() =>
        Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t)
      );
      console.log('Boutons sur la note:', allBtns);
    }
  }

  await b.close();

  const fs = require('fs');
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅ Total : ${files.length} screenshots`);
})();
