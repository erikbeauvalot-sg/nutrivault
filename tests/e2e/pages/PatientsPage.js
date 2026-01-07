/**
 * Patients Page Object Model
 * Encapsulates patient management page interactions
 */

export class PatientsPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.heading = page.locator('h1, h2').filter({ hasText: /Patients?/i });
    this.createButton = page.locator('a[href*="/patients/new"], button:has-text("Create Patient"), button:has-text("Add Patient")');
    this.searchInput = page.locator('[placeholder*="Search"]');
    this.searchButton = page.locator('button:has-text("Search")');
    this.patientsTable = page.locator('table');
    
    // Form fields (for create/edit)
    this.firstNameInput = page.locator('[name="first_name"]');
    this.lastNameInput = page.locator('[name="last_name"]');
    this.dateOfBirthInput = page.locator('[name="date_of_birth"]');
    this.genderSelect = page.locator('[name="gender"]');
    this.emailInput = page.locator('[name="email"]');
    this.phoneInput = page.locator('[name="phone"]');
    this.addressInput = page.locator('[name="address"]');
    this.cityInput = page.locator('[name="city"]');
    this.stateInput = page.locator('[name="state"]');
    this.zipCodeInput = page.locator('[name="zip_code"]');
    this.emergencyContactNameInput = page.locator('[name="emergency_contact_name"]');
    this.emergencyContactPhoneInput = page.locator('[name="emergency_contact_phone"]');
    
    this.submitButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.successMessage = page.locator('.alert-success, .toast-success');
    this.errorMessage = page.locator('.alert-danger, .toast-error');
  }

  /**
   * Navigate to patients list
   */
  async goto() {
    await this.page.goto('/patients');
  }

  /**
   * Navigate to create patient page
   */
  async goToCreate() {
    await this.createButton.click();
  }

  /**
   * Search for patient
   * @param {string} searchTerm - Search term
   */
  async searchPatient(searchTerm) {
    await this.searchInput.fill(searchTerm);
    await this.searchButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Create a new patient
   * @param {object} patientData - Patient data
   */
  async createPatient(patientData) {
    await this.firstNameInput.fill(patientData.first_name);
    await this.lastNameInput.fill(patientData.last_name);
    await this.dateOfBirthInput.fill(patientData.date_of_birth);
    
    if (patientData.gender) {
      await this.genderSelect.selectOption(patientData.gender);
    }
    
    await this.emailInput.fill(patientData.email);
    await this.phoneInput.fill(patientData.phone);
    
    if (patientData.address) {
      await this.addressInput.fill(patientData.address);
    }
    if (patientData.city) {
      await this.cityInput.fill(patientData.city);
    }
    if (patientData.state) {
      await this.stateInput.fill(patientData.state);
    }
    if (patientData.zip_code) {
      await this.zipCodeInput.fill(patientData.zip_code);
    }
    if (patientData.emergency_contact_name) {
      await this.emergencyContactNameInput.fill(patientData.emergency_contact_name);
    }
    if (patientData.emergency_contact_phone) {
      await this.emergencyContactPhoneInput.fill(patientData.emergency_contact_phone);
    }
    
    await this.submitButton.click();
  }

  /**
   * Click on a patient row by email
   * @param {string} email - Patient email
   */
  async clickPatientRow(email) {
    await this.page.locator(`tr:has-text("${email}")`).click();
  }

  /**
   * Delete patient by email
   * @param {string} email - Patient email
   */
  async deletePatient(email) {
    const row = this.page.locator(`tr:has-text("${email}")`);
    await row.locator('button:has-text("Delete")').click();
    
    // Confirm deletion
    await this.page.locator('button:has-text("Confirm"), button:has-text("Delete")').last().click();
    await this.page.waitForTimeout(500);
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
   * Check if patient exists in table
   * @param {string} email - Patient email
   * @returns {Promise<boolean>}
   */
  async patientExists(email) {
    const row = this.page.locator(`tr:has-text("${email}")`);
    return await row.count() > 0;
  }
}
