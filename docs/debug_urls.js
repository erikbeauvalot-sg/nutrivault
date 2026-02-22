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

  // Template links
  await p.goto('http://localhost:5173/consultation-templates');
  await p.waitForLoadState('networkidle');
  await new Promise(r => setTimeout(r, 1500));
  const tplLinks = await p.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map(e => e.href)
      .filter(h => h.includes('consultation-template'))
  );
  console.log('Template links:', tplLinks.slice(0, 6));

  // Buttons on template list
  const btns = await p.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map(b => b.textContent.trim())
      .filter(t => t.length > 0)
  );
  console.log('Buttons on template list:', btns.slice(0, 20));

  // Note links
  await p.goto('http://localhost:5173/consultation-notes');
  await p.waitForLoadState('networkidle');
  await new Promise(r => setTimeout(r, 1500));
  const noteLinks = await p.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map(e => e.href)
      .filter(h => h.includes('consultation-note'))
  );
  console.log('Note links:', noteLinks.slice(0, 6));

  // Current URL after navigate
  console.log('After /consultation-notes, URL:', p.url());

  await b.close();
})().catch(e => console.error(e.message));
