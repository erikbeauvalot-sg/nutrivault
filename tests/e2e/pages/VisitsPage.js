/**
 * Visits Page Object Model
 * Encapsulates visit management page interactions
 */

export class VisitsPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.heading = page.locator('h1, h2').filter({ hasText: /Visits?/i });
    this.createButton = page.locator('a[href*="/visits/new"], button:has-text("Create Visit"), button:has-text("Add Visit")');
    this.searchInput = page.locator('[placeholder*="Search"]');
    this.visitsTable = page.locator('table');
    
    // Form fields
    this.patientSelect = page.locator('[name="patient_id"]');
    this.visitDateInput = page.locator('[name="visit_date"]');
    this.visitTypeSelect = page.locator('[name="visit_type"]');
    this.chiefComplaintInput = page.locator('[name="chief_complaint"]');
    this.notesTextarea = page.locator('[name="notes"]');
    this.weightInput = page.locator('[name="weight"]');
    this.heightInput = page.locator('[name="height"]');
    this.bpSystolicInput = page.locator('[name="blood_pressure_systolic"]');
    this.bpDiastolicInput = page.locator('[name="blood_pressure_diastolic"]');
    this.statusSelect = page.locator('[name="status"]');
    
    this.submitButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.successMessage = page.locator('.alert-success, .toast-success');
  }

  /**
   * Navigate to visits list
   */
  async goto() {
    await this.page.goto('/visits');
  }

  /**
   * Navigate to create visit page
   */
  async goToCreate() {
    await this.createButton.click();
  }

  /**
   * Create a new visit
   * @param {object} visitData - Visit data
   */
  async createVisit(visitData) {
    if (visitData.patient_id) {
      await this.patientSelect.selectOption(visitData.patient_id);
    }
    
    await this.visitDateInput.fill(visitData.visit_date);
    
    if (visitData.visit_type) {
      await this.visitTypeSelect.selectOption(visitData.visit_type);
    }
    
    if (visitData.chief_complaint) {
      await this.chiefComplaintInput.fill(visitData.chief_complaint);
    }
    
    if (visitData.notes) {
      await this.notesTextarea.fill(visitData.notes);
    }
    
    // Measurements
    if (visitData.weight) {
      await this.weightInput.fill(visitData.weight.toString());
    }
    if (visitData.height) {
      await this.heightInput.fill(visitData.height.toString());
    }
    if (visitData.blood_pressure_systolic) {
      await this.bpSystolicInput.fill(visitData.blood_pressure_systolic.toString());
    }
    if (visitData.blood_pressure_diastolic) {
      await this.bpDiastolicInput.fill(visitData.blood_pressure_diastolic.toString());
    }
    
    await this.submitButton.click();
  }

  /**
   * Change visit status
   * @param {string} visitId - Visit ID or identifier
   * @param {string} newStatus - New status
   */
  async changeVisitStatus(visitId, newStatus) {
    const row = this.page.locator(`tr:has-text("${visitId}")`);
    await row.locator('button:has-text("Edit"), a:has-text("Edit")').click();
    await this.statusSelect.selectOption(newStatus);
    await this.submitButton.click();
  }

  /**
   * View visit details
   * @param {string} visitIdentifier - Visit identifier (date or ID)
   */
  async viewVisitDetails(visitIdentifier) {
    await this.page.locator(`tr:has-text("${visitIdentifier}")`).click();
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
   * Check if visit exists in table
   * @param {string} identifier - Visit identifier
   * @returns {Promise<boolean>}
   */
  async visitExists(identifier) {
    const row = this.page.locator(`tr:has-text("${identifier}")`);
    return await row.count() > 0;
  }
}
