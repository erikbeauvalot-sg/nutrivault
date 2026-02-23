/**
 * Authentication flows
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Authentification', () => {
  test('redirige vers /login si non authentifié', async ({ browser }) => {
    // Explicitly empty storageState — no inherited tokens
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });

  test('affiche une erreur avec des identifiants incorrects', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'mauvais_user');
    await page.fill('input[type="password"]', 'mauvais_mdp');
    await page.click('button[type="submit"]');

    // Wait for the API error response (don't use networkidle — login APIs can cause hangs)
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/\/login/);
    const errorVisible =
      (await page.locator('.alert-danger, [role="alert"], .error, .invalid-feedback').count()) > 0 ||
      (await page.getByText(/incorrect|invalide|invalid|erreur|error/i).count()) > 0;
    expect(errorVisible).toBe(true);
    await ctx.close();
  });

  test('accède au dashboard avec des identifiants valides', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, '../fixtures/auth.json'),
    });
    const page = await ctx.newPage();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).not.toHaveURL(/\/login/);
    await ctx.close();
  });
});
