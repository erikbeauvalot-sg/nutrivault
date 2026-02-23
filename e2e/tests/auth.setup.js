/**
 * Global auth setup — runs once before all tests.
 * Logs in as 'marion' (admin), copies tokens to localStorage
 * (sessionStorage is not reliably persisted by storageState),
 * then saves the full browser storage state.
 */
const { test: setup, expect } = require('@playwright/test');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '../fixtures/auth.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="text"]', 'marion');
  await page.fill('input[type="password"]', 'TotoTiti99!');
  await page.click('button[type="submit"]');

  // Wait for redirect away from /login
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 10_000 });
  await page.waitForLoadState('networkidle');

  // The app stores tokens in sessionStorage when rememberMe=false.
  // storageState() does not reliably persist sessionStorage across test contexts,
  // so we copy the tokens to localStorage before saving the state.
  await page.evaluate(() => {
    const KEYS = [
      'nutrivault_access_token',
      'nutrivault_refresh_token',
      'nutrivault_user',
    ];
    for (const key of KEYS) {
      const val = sessionStorage.getItem(key);
      if (val) localStorage.setItem(key, val);
    }
    // Mark as "remembered" so the app reads from localStorage
    localStorage.setItem('nutrivault_remember_me', 'true');
  });

  // Verify tokens are now in localStorage
  const token = await page.evaluate(() => localStorage.getItem('nutrivault_access_token'));
  if (!token) throw new Error('Auth setup failed: no access token found after login');

  await expect(page).not.toHaveURL(/\/login/);

  // Save full browser storage state (localStorage + cookies)
  await page.context().storageState({ path: AUTH_FILE });
});
