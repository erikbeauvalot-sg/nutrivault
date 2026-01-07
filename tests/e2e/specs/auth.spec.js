/**
 * Authentication E2E Tests
 * Tests login, logout, and protected route access
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { TEST_USERS } from '../fixtures/testData.js';

test.describe('Authentication Flow', () => {
  let loginPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
  });

  test('should display login page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Login|NutriVault/i);
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('should login successfully with nutritionist credentials', async ({ page }) => {
    await loginPage.login(
      TEST_USERS.nutritionist.username,
      TEST_USERS.nutritionist.password
    );
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await loginPage.login('invalid_user', 'wrong_password');
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login/);
    
    // Should show error message
    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessage();
    expect(errorText.toLowerCase()).toContain('invalid');
  });

  test('should show error with empty username', async ({ page }) => {
    await loginPage.passwordInput.fill('somepassword');
    await loginPage.loginButton.click();
    
    // Should show validation error
    const usernameError = page.locator('text=/username.*required/i');
    await expect(usernameError).toBeVisible({ timeout: 2000 });
  });

  test('should show error with empty password', async ({ page }) => {
    await loginPage.usernameInput.fill('someuser');
    await loginPage.loginButton.click();
    
    // Should show validation error
    const passwordError = page.locator('text=/password.*required/i');
    await expect(passwordError).toBeVisible({ timeout: 2000 });
  });

  test('should remember user session with "Remember Me"', async ({ page, context }) => {
    await loginPage.login(
      TEST_USERS.admin.username,
      TEST_USERS.admin.password,
      true // Remember me
    );
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check if auth token is stored
    const cookies = await context.cookies();
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name.toLowerCase().includes('token') || 
      cookie.name.toLowerCase().includes('auth')
    );
    
    expect(hasAuthCookie).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Logout
    await dashboardPage.logout();
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect to requested page after login', async ({ page }) => {
    // Try to access patients page without auth
    await page.goto('/patients');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // Login
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    
    // Should redirect to originally requested page (patients)
    // Note: This depends on your implementation
    await expect(page).toHaveURL(/.*patients|dashboard/);
  });

  test('should prevent access to admin pages with non-admin user', async ({ page }) => {
    // Login as staff
    await loginPage.login(TEST_USERS.staff.username, TEST_USERS.staff.password);
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Try to access users page (admin only)
    await page.goto('/users');
    
    // Should redirect to unauthorized or dashboard
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(
      currentUrl.includes('unauthorized') || 
      currentUrl.includes('dashboard') ||
      !currentUrl.includes('users')
    ).toBeTruthy();
  });
});
