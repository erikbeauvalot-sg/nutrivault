/**
 * Dashboard Page Object Model
 * Encapsulates dashboard page interactions
 */

export class DashboardPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.heading = page.locator('h1, h2').filter({ hasText: 'Dashboard' });
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.logoutButton = page.locator('text="Logout"');
    
    // Navigation links
    this.patientsLink = page.locator('a[href*="/patients"]').first();
    this.visitsLink = page.locator('a[href*="/visits"]').first();
    this.billingLink = page.locator('a[href*="/billing"]').first();
    this.usersLink = page.locator('a[href*="/users"]').first();
    this.reportsLink = page.locator('a[href*="/reports"]').first();
    this.auditLogLink = page.locator('a[href*="/audit"]').first();
    
    // Dashboard stats
    this.totalPatientsCard = page.locator('text="Total Patients"').locator('..');
    this.totalVisitsCard = page.locator('text="Total Visits"').locator('..');
    this.revenueCard = page.locator('text="Revenue"').locator('..');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Check if on dashboard
   * @returns {Promise<boolean>}
   */
  async isOnDashboard() {
    return await this.heading.isVisible({ timeout: 5000 });
  }

  /**
   * Navigate to Patients page
   */
  async goToPatients() {
    await this.patientsLink.click();
  }

  /**
   * Navigate to Visits page
   */
  async goToVisits() {
    await this.visitsLink.click();
  }

  /**
   * Navigate to Billing page
   */
  async goToBilling() {
    await this.billingLink.click();
  }

  /**
   * Navigate to Users page
   */
  async goToUsers() {
    await this.usersLink.click();
  }

  /**
   * Navigate to Reports page
   */
  async goToReports() {
    await this.reportsLink.click();
  }

  /**
   * Navigate to Audit Log page
   */
  async goToAuditLog() {
    await this.auditLogLink.click();
  }

  /**
   * Logout
   */
  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }

  /**
   * Get stat value from dashboard card
   * @param {string} cardName - Card name (e.g., "Total Patients")
   * @returns {Promise<string>}
   */
  async getStatValue(cardName) {
    const card = this.page.locator(`text="${cardName}"`).locator('..');
    const value = card.locator('.h2, .display-4').first();
    return await value.textContent();
  }
}
