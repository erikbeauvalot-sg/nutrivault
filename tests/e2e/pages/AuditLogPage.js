/**
 * Audit Log Page Object Model
 * Encapsulates audit log viewer interactions (Admin only)
 */

export class AuditLogPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.heading = page.locator('h1, h2').filter({ hasText: /Audit Log/i });
    this.auditTable = page.locator('table');
    
    // Filters
    this.actionFilter = page.locator('select[name="action_filter"], select[name="action"]');
    this.userFilter = page.locator('select[name="user_filter"], select[name="user_id"]');
    this.startDateInput = page.locator('[name="start_date"]');
    this.endDateInput = page.locator('[name="end_date"]');
    this.applyFilterButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
    this.clearFilterButton = page.locator('button:has-text("Clear")');
    
    // Export
    this.exportButton = page.locator('button:has-text("Export")');
    
    // Pagination
    this.nextPageButton = page.locator('button:has-text("Next")');
    this.prevPageButton = page.locator('button:has-text("Previous")');
    this.pageInfo = page.locator('[class*="pagination"]');
  }

  /**
   * Navigate to audit log page
   */
  async goto() {
    await this.page.goto('/audit');
  }

  /**
   * Filter by action type
   * @param {string} action - Action type (e.g., 'CREATE', 'UPDATE', 'DELETE')
   */
  async filterByAction(action) {
    await this.actionFilter.selectOption(action);
    await this.applyFilterButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by user
   * @param {string} userId - User ID or username
   */
  async filterByUser(userId) {
    await this.userFilter.selectOption(userId);
    await this.applyFilterButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  async filterByDateRange(startDate, endDate) {
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);
    await this.applyFilterButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    await this.clearFilterButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Export audit logs
   */
  async exportLogs() {
    // Wait for download
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * Go to next page
   */
  async goToNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Go to previous page
   */
  async goToPreviousPage() {
    await this.prevPageButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if log entry exists
   * @param {string} action - Action to search for
   * @param {string} entity - Entity type
   * @returns {Promise<boolean>}
   */
  async logEntryExists(action, entity) {
    const row = this.page.locator(`tr:has-text("${action}"):has-text("${entity}")`);
    return await row.count() > 0;
  }

  /**
   * Get log entry count
   * @returns {Promise<number>}
   */
  async getLogCount() {
    const rows = this.auditTable.locator('tbody tr');
    return await rows.count();
  }

  /**
   * View log entry details
   * @param {number} rowIndex - Row index (0-based)
   */
  async viewLogDetails(rowIndex) {
    const rows = this.auditTable.locator('tbody tr');
    await rows.nth(rowIndex).click();
  }
}
