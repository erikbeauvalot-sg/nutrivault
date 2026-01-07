/**
 * Login Page Object Model
 * Encapsulates login page interactions
 */

export class LoginPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.usernameInput = page.locator('[name="username"]');
    this.passwordInput = page.locator('[name="password"]');
    this.rememberMeCheckbox = page.locator('[name="rememberMe"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.alert-danger, [role="alert"]');
    this.forgotPasswordLink = page.locator('text="Forgot Password"');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Perform login
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {boolean} rememberMe - Remember me checkbox
   */
  async login(username, password, rememberMe = false) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    
    await this.loginButton.click();
  }

  /**
   * Get error message text
   * @returns {Promise<string>}
   */
  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }

  /**
   * Check if error is displayed
   * @returns {Promise<boolean>}
   */
  async hasError() {
    return await this.errorMessage.isVisible();
  }

  /**
   * Clear login form
   */
  async clearForm() {
    await this.usernameInput.clear();
    await this.passwordInput.clear();
  }
}
