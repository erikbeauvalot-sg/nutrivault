const { chromium } = require('/tmp/pw-tmp/node_modules/playwright');

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
  await new Promise(r => setTimeout(r, 1000));

  // Templates
  await p.goto('http://localhost:5173/consultation-templates');
  await p.waitForLoadState('networkidle');
  await new Promise(r => setTimeout(r, 1500));

  // All clickable elements text
  const allBtns = await p.evaluate(() =>
    Array.from(document.querySelectorAll('button, [class*="btn"]'))
      .map(e => ({ tag: e.tagName, text: e.textContent.trim().slice(0, 40), cls: e.className.slice(0, 60) }))
  );
  console.log('All buttons/btn-class:', JSON.stringify(allBtns.slice(0, 30), null, 2));

  // Try clicking the first template card and track navigation
  p.on('request', req => {
    if (req.url().includes('consultation-template')) {
      console.log('Request:', req.url());
    }
  });

  // First card
  const cards = await p.locator('.card, [class*="card"]').all();
  console.log('Card count:', cards.length);
  if (cards.length > 0) {
    // Click first card and track URL
    await cards[0].click().catch(() => {});
    await p.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 800));
    console.log('After first card click, URL:', p.url());
    await p.goBack();
    await p.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 800));
  }

  // Visits to find notes
  await p.goto('http://localhost:5173/visits');
  await p.waitForLoadState('networkidle');
  await new Promise(r => setTimeout(r, 1500));
  const visitRows = await p.locator('table tbody tr, tr.visit-row, .visit-card').all();
  console.log('Visit rows:', visitRows.length);

  for (let i = 0; i < Math.min(visitRows.length, 3); i++) {
    await visitRows[i].click().catch(() => {});
    await p.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 1000));
    const url = p.url();
    console.log(`Visit ${i} -> URL:`, url);

    // Look for consultation notes
    const noteAnchors = await p.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(e => e.href)
        .filter(h => h.includes('consultation'))
    );
    console.log(`  Note anchors on visit ${i}:`, noteAnchors.slice(0, 5));

    // Check for "Démarrer consultation" or start button text
    const btnTexts = await p.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map(e => e.textContent.trim())
        .filter(t => t.length > 0)
    );
    console.log(`  Buttons on visit page:`, btnTexts.filter(t => t.length < 40).slice(0, 15));

    await p.goBack();
    await p.waitForLoadState('networkidle');
    await new Promise(r => setTimeout(r, 800));
  }

  await b.close();
})().catch(e => console.error(e.message));
