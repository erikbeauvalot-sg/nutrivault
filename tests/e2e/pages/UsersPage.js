/**
 * Users Page Object Model
 * Encapsulates user management page interactions (Admin only)
 */

export class UsersPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.heading = page.locator('h1, h2').filter({ hasText: /Users?/i });
    this.createButton = page.locator('a[href*="/users/new"], button:has-text("Create User"), button:has-text("Add User")');
    this.searchInput = page.locator('[placeholder*="Search"]');
    this.usersTable = page.locator('table');
    
    // Form fields
    this.usernameInput = page.locator('[name="username"]');
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.confirmPasswordInput = page.locator('[name="confirm_password"]');
    this.firstNameInput = page.locator('[name="first_name"]');
    this.lastNameInput = page.locator('[name="last_name"]');
    this.roleSelect = page.locator('[name="role"]');
    this.isActiveCheckbox = page.locator('[name="is_active"]');
    
    this.submitButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.successMessage = page.locator('.alert-success, .toast-success');
    this.errorMessage = page.locator('.alert-danger, .toast-error');
  }

  /**
   * Navigate to users list
   */
  async goto() {
    await this.page.goto('/users');
  }

  /**
   * Navigate to create user page
   */
  async goToCreate() {
    await this.createButton.click();
  }

  /**
   * Create a new user
   * @param {object} userData - User data
   */
  async createUser(userData) {
    await this.usernameInput.fill(userData.username);
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    
    if (this.confirmPasswordInput) {
      await this.confirmPasswordInput.fill(userData.password);
    }
    
    await this.firstNameInput.fill(userData.first_name);
    await this.lastNameInput.fill(userData.last_name);
    
    if (userData.role) {
      await this.roleSelect.selectOption(userData.role);
    }
    
    if (userData.is_active !== undefined) {
      if (userData.is_active) {
        await this.isActiveCheckbox.check();
      } else {
        await this.isActiveCheckbox.uncheck();
      }
    }
    
    await this.submitButton.click();
  }

  /**
   * Search for user
   * @param {string} searchTerm - Search term
   */
  async searchUser(searchTerm) {
    await this.searchInput.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit user
   * @param {string} username - Username
   */
  async editUser(username) {
    const row = this.page.locator(`tr:has-text("${username}")`);
    await row.locator('button:has-text("Edit"), a:has-text("Edit")').click();
  }

  /**
   * Deactivate user
   * @param {string} username - Username
   */
  async deactivateUser(username) {
    const row = this.page.locator(`tr:has-text("${username}")`);
    await row.locator('button:has-text("Deactivate")').click();
    
    // Confirm deactivation
    await this.page.locator('button:has-text("Confirm")').click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Delete user
   * @param {string} username - Username
   */
  async deleteUser(username) {
    const row = this.page.locator(`tr:has-text("${username}")`);
    await row.locator('button:has-text("Delete")').click();
    
    // Confirm deletion
    await this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').last().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Change user role
   * @param {string} username - Username
   * @param {string} newRole - New role
   */
  async changeUserRole(username, newRole) {
    await this.editUser(username);
    await this.roleSelect.selectOption(newRole);
    await this.submitButton.click();
  }

  /**
   * Check if success message is shown
   * @returns {Promise<boolean>}
   */
  async hasSuccessMessage() {
    try {
      await this.successMessage.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if user exists in table
   * @param {string} username - Username
   * @returns {Promise<boolean>}
   */
  async userExists(username) {
    const row = this.page.locator(`tr:has-text("${username}")`);
    return await row.count() > 0;
  }

  /**
   * Get user role
   * @param {string} username - Username
   * @returns {Promise<string>}
   */
  async getUserRole(username) {
    const row = this.page.locator(`tr:has-text("${username}")`);
    const roleBadge = row.locator('.badge, [class*="role"]');
    return await roleBadge.textContent();
  }
}
