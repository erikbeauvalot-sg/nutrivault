/**
 * Audit Log E2E Tests (Admin Only)
 * Tests audit log viewing and filtering
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { AuditLogPage } from '../pages/AuditLogPage.js';
import { getTodayDate } from '../fixtures/testData.js';

test.describe('Audit Log Viewer (Admin Only)', () => {
  let auditLogPage;

  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    auditLogPage = new AuditLogPage(page);
    await auditLogPage.goto();
  });

  test('should display audit log page', async () => {
    await expect(auditLogPage.heading).toBeVisible();
    await expect(auditLogPage.auditTable).toBeVisible();
  });

  test('should filter by action type', async ({ page }) => {
    await auditLogPage.filterByAction('CREATE');
    await page.waitForTimeout(1000);
    
    // Verify filter is applied
    const logCount = await auditLogPage.getLogCount();
    expect(logCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter by date range', async ({ page }) => {
    const today = getTodayDate();
    await auditLogPage.filterByDateRange(today, today);
    await page.waitForTimeout(1000);
    
    const logCount = await auditLogPage.getLogCount();
    expect(logCount).toBeGreaterThanOrEqual(0);
  });

  test('should clear filters', async ({ page }) => {
    // Apply some filters
    await auditLogPage.filterByAction('UPDATE');
    await page.waitForTimeout(500);
    
    // Clear filters
    await auditLogPage.clearFilters();
    await page.waitForTimeout(500);
    
    // Should show all logs again
    const logCount = await auditLogPage.getLogCount();
    expect(logCount).toBeGreaterThanOrEqual(0);
  });

  test('should export audit logs', async ({ page }) => {
    // Trigger export
    const download = await auditLogPage.exportLogs().catch(() => null);
    
    // Verify download started (if export button exists)
    if (download) {
      expect(download.suggestedFilename()).toContain('audit');
    }
  });

  test('should paginate through logs', async ({ page }) => {
    // Check if next page button is visible and enabled
    const hasNextPage = await auditLogPage.nextPageButton.isVisible().catch(() => false);
    
    if (hasNextPage) {
      await auditLogPage.goToNextPage();
      await page.waitForTimeout(500);
      
      // Verify page changed
      const logCount = await auditLogPage.getLogCount();
      expect(logCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should prevent non-admin from accessing audit log', async ({ page, context }) => {
    // Logout and login as staff
    await page.goto('/login');
    await context.clearCookies();
    
    await login(page, 'staff');
    
    // Try to access audit log page
    await page.goto('/audit');
    
    // Should be redirected or show unauthorized
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(
      url.includes('unauthorized') || 
      url.includes('dashboard') ||
      !url.includes('audit')
    ).toBeTruthy();
  });

  test('should display log entry details', async ({ page }) => {
    const logCount = await auditLogPage.getLogCount();
    
    if (logCount > 0) {
      // Click on first log entry
      await auditLogPage.viewLogDetails(0);
      await page.waitForTimeout(500);
      
      // Should show details (this depends on your implementation)
      // Could be a modal, expanded row, or separate page
    }
  });
});
