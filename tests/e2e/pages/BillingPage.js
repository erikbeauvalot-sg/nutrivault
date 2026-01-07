/**
 * Billing Page Object Model
 * Encapsulates billing/invoice management page interactions
 */

export class BillingPage {
  constructor(page) {
    this.page = page;
    
    // Locators
    this.heading = page.locator('h1, h2').filter({ hasText: /Billing|Invoices?/i });
    this.createButton = page.locator('a[href*="/billing/new"], button:has-text("Create Invoice"), button:has-text("Add Invoice")');
    this.searchInput = page.locator('[placeholder*="Search"]');
    this.billingTable = page.locator('table');
    
    // Form fields
    this.patientSelect = page.locator('[name="patient_id"]');
    this.visitSelect = page.locator('[name="visit_id"]');
    this.serviceDescriptionInput = page.locator('[name="service_description"]');
    this.amountInput = page.locator('[name="amount"]');
    this.paymentStatusSelect = page.locator('[name="payment_status"]');
    this.dueDateInput = page.locator('[name="due_date"]');
    this.notesTextarea = page.locator('[name="notes"]');
    
    // Payment fields
    this.paymentAmountInput = page.locator('[name="payment_amount"]');
    this.paymentMethodSelect = page.locator('[name="payment_method"]');
    this.paymentDateInput = page.locator('[name="payment_date"]');
    this.recordPaymentButton = page.locator('button:has-text("Record Payment")');
    
    this.submitButton = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.successMessage = page.locator('.alert-success, .toast-success');
    
    // Filters
    this.statusFilter = page.locator('select[name="status_filter"]');
    this.applyFilterButton = page.locator('button:has-text("Apply")');
  }

  /**
   * Navigate to billing list
   */
  async goto() {
    await this.page.goto('/billing');
  }

  /**
   * Navigate to create invoice page
   */
  async goToCreate() {
    await this.createButton.click();
  }

  /**
   * Create a new invoice
   * @param {object} invoiceData - Invoice data
   */
  async createInvoice(invoiceData) {
    if (invoiceData.patient_id) {
      await this.patientSelect.selectOption(invoiceData.patient_id);
    }
    
    if (invoiceData.visit_id) {
      await this.visitSelect.selectOption(invoiceData.visit_id);
    }
    
    await this.serviceDescriptionInput.fill(invoiceData.service_description);
    await this.amountInput.fill(invoiceData.amount.toString());
    
    if (invoiceData.payment_status) {
      await this.paymentStatusSelect.selectOption(invoiceData.payment_status);
    }
    
    if (invoiceData.due_date) {
      await this.dueDateInput.fill(invoiceData.due_date);
    }
    
    if (invoiceData.notes) {
      await this.notesTextarea.fill(invoiceData.notes);
    }
    
    await this.submitButton.click();
  }

  /**
   * Record payment for an invoice
   * @param {string} invoiceIdentifier - Invoice identifier
   * @param {object} paymentData - Payment data
   */
  async recordPayment(invoiceIdentifier, paymentData) {
    // Click on invoice row
    await this.page.locator(`tr:has-text("${invoiceIdentifier}")`).click();
    
    // Fill payment form
    await this.paymentAmountInput.fill(paymentData.amount.toString());
    
    if (paymentData.method) {
      await this.paymentMethodSelect.selectOption(paymentData.method);
    }
    
    if (paymentData.date) {
      await this.paymentDateInput.fill(paymentData.date);
    }
    
    await this.recordPaymentButton.click();
  }

  /**
   * Filter invoices by status
   * @param {string} status - Status to filter by
   */
  async filterByStatus(status) {
    await this.statusFilter.selectOption(status);
    await this.applyFilterButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * View invoice details
   * @param {string} invoiceIdentifier - Invoice identifier
   */
  async viewInvoiceDetails(invoiceIdentifier) {
    await this.page.locator(`tr:has-text("${invoiceIdentifier}")`).click();
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
   * Check if invoice exists in table
   * @param {string} identifier - Invoice identifier
   * @returns {Promise<boolean>}
   */
  async invoiceExists(identifier) {
    const row = this.page.locator(`tr:has-text("${identifier}")`);
    return await row.count() > 0;
  }

  /**
   * Get invoice status
   * @param {string} invoiceIdentifier - Invoice identifier
   * @returns {Promise<string>}
   */
  async getInvoiceStatus(invoiceIdentifier) {
    const row = this.page.locator(`tr:has-text("${invoiceIdentifier}")`);
    const statusBadge = row.locator('.badge, [class*="status"]');
    return await statusBadge.textContent();
  }
}
