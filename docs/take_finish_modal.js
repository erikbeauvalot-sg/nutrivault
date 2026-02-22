const { chromium } = require('/tmp/pw-tmp/node_modules/playwright');
const path = require('path');
const OUT = path.join(__dirname, 'screenshots');
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });

  await p.goto('http://localhost:5173/login');
  await p.waitForLoadState('networkidle');
  await p.fill('input[type="text"]', 'marion');
  await p.fill('input[type="password"]', 'TotoTiti99!');
  await p.click('button[type="submit"]');
  await p.waitForLoadState('networkidle');
  await wait(1000);

  // Tout faire en un seul evaluate (pas d'arguments multiples)
  const result = await p.evaluate(async () => {
    const token = localStorage.getItem('nutrivault_access_token') ||
                  sessionStorage.getItem('nutrivault_access_token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Récupérer une visite SCHEDULED
    const vRes = await fetch('http://localhost:3001/api/visits?status=SCHEDULED&limit=3', { headers });
    const vData = await vRes.json();
    const visit = vData?.data?.[0];
    if (!visit) return { error: 'No scheduled visit' };

    // Récupérer un template
    const tRes = await fetch('http://localhost:3001/api/consultation-templates?limit=3', { headers });
    const tData = await tRes.json();
    const template = tData?.data?.[0];
    if (!template) return { error: 'No template' };

    // Créer une note draft
    const nRes = await fetch('http://localhost:3001/api/consultation-notes', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        visit_id: visit.id,
        patient_id: visit.patient_id,
        template_id: template.id
      })
    });
    const nData = await nRes.json();
    return { noteId: nData?.data?.id || nData?.id, visitId: visit.id, templateId: template.id, raw: JSON.stringify(nData).slice(0, 200) };
  });

  console.log('Résultat:', result);

  if (result.noteId) {
    await p.goto(`http://localhost:5173/consultation-notes/${result.noteId}`);
    await p.waitForLoadState('networkidle');
    await wait(1500);

    const allBtns = await p.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t)
    );
    console.log('Boutons sur note draft:', allBtns);

    // Bouton Terminer
    const finishBtn = p.locator('button:has-text("Terminer"), button:has-text("Factur"), button:has-text("Finish")').first();
    if (await finishBtn.count()) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await finishBtn.screenshot({ path: path.join(OUT, '19-bouton-terminer.png') });
      console.log('📸 Bouton Terminer');
      await finishBtn.click();
      await wait(1000);
      await p.screenshot({ path: path.join(OUT, '20-modal-terminer-facturer.png') });
      console.log('📸 Modal Terminer & Facturer');
      await p.keyboard.press('Escape');
    }
  }

  await b.close();
})();
