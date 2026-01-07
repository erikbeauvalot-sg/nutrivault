/**
 * User Management E2E Tests (Admin Only)
 * Tests user CRUD operations and RBAC
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { UsersPage } from '../pages/UsersPage.js';
import { generateUniqueUsername, generateUniqueEmail } from '../fixtures/testData.js';

test.describe('User Management (Admin Only)', () => {
  let usersPage;
  let testUsername;
  let testEmail;

  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    usersPage = new UsersPage(page);
    await usersPage.goto();
    
    testUsername = generateUniqueUsername();
    testEmail = generateUniqueEmail('user');
  });

  test('should display users list page', async () => {
    await expect(usersPage.heading).toBeVisible();
    await expect(usersPage.createButton).toBeVisible();
  });

  test('should create a new user', async ({ page }) => {
    await usersPage.goToCreate();
    
    const userData = {
      username: testUsername,
      email: testEmail,
      password: 'Test123!@#',
      first_name: 'Test',
      last_name: 'User',
      role: 'staff',
      is_active: true
    };
    
    await usersPage.createUser(userData);
    await page.waitForURL(/.*users/, { timeout: 5000 });
    
    // Verify user appears in list
    await usersPage.searchUser(testUsername);
    const exists = await usersPage.userExists(testUsername);
    expect(exists).toBeTruthy();
  });

  test('should validate password requirements', async ({ page }) => {
    await usersPage.goToCreate();
    
    await usersPage.usernameInput.fill(testUsername);
    await usersPage.emailInput.fill(testEmail);
    await usersPage.passwordInput.fill('weak'); // Weak password
    await usersPage.firstNameInput.fill('Test');
    await usersPage.lastNameInput.fill('User');
    
    await usersPage.submitButton.click();
    
    // Should show password validation error
    await expect(usersPage.errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('should change user role', async ({ page }) => {
    // First create a user
    await usersPage.goToCreate();
    await usersPage.createUser({
      username: testUsername,
      email: testEmail,
      password: 'Test123!@#',
      first_name: 'Role',
      last_name: 'Change',
      role: 'staff',
      is_active: true
    });
    
    await page.waitForURL(/.*users/);
    
    // Change role to nutritionist
    await usersPage.changeUserRole(testUsername, 'nutritionist');
    await page.waitForTimeout(1000);
  });

  test('should deactivate user', async ({ page }) => {
    // First create a user
    await usersPage.goToCreate();
    await usersPage.createUser({
      username: testUsername,
      email: testEmail,
      password: 'Test123!@#',
      first_name: 'Deactivate',
      last_name: 'Test',
      role: 'staff',
      is_active: true
    });
    
    await page.waitForURL(/.*users/);
    
    // Deactivate user
    await usersPage.searchUser(testUsername);
    await usersPage.deactivateUser(testUsername);
    
    await page.waitForTimeout(1000);
  });

  test('should prevent non-admin from accessing users page', async ({ page, context }) => {
    // Logout and login as staff
    await page.goto('/login');
    await context.clearCookies();
    
    await login(page, 'staff');
    
    // Try to access users page
    await page.goto('/users');
    
    // Should be redirected or show unauthorized
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(
      url.includes('unauthorized') || 
      url.includes('dashboard') ||
      !url.includes('users')
    ).toBeTruthy();
  });
});
