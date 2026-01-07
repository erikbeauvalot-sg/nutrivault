/**
 * Authentication Helper
 * Provides reusable authentication functions for E2E tests
 */

import { TEST_USERS } from '../fixtures/testData.js';

/**
 * Login as a specific user
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} userType - Type of user (admin, nutritionist, staff)
 */
export async function login(page, userType = 'admin') {
  const user = TEST_USERS[userType];
  
  if (!user) {
    throw new Error(`Unknown user type: ${userType}`);
  }

  await page.goto('/login');
  await page.fill('[name="username"]', user.username);
  await page.fill('[name="password"]', user.password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL('**/dashboard', { timeout: 5000 });
}

/**
 * Login with custom credentials
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} username - Username
 * @param {string} password - Password
 */
export async function loginWithCredentials(page, username, password) {
  await page.goto('/login');
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
}

/**
 * Logout the current user
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function logout(page) {
  // Click on user dropdown in navbar
  await page.click('[data-testid="user-menu"]', { timeout: 3000 }).catch(() => {
    // Try alternative selectors
    return page.click('text="Logout"');
  });
  
  // Wait for redirect to login
  await page.waitForURL('**/login', { timeout: 5000 });
}

/**
 * Check if user is logged in
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get authentication state storage (cookies/localStorage)
 * Useful for reusing auth state across tests
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} userType - Type of user to authenticate
 * @returns {Promise<object>} Storage state
 */
export async function getAuthState(page, userType = 'admin') {
  await login(page, userType);
  return await page.context().storageState();
}
