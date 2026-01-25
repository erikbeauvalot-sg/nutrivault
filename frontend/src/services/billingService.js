/**
 * Billing Service
 * API calls for invoice and payment management
 */

import api from './api';

/**
 * Get all invoices with optional filters
 * @param {object} filters - Filter parameters (patient_id, status, search, start_date, end_date, page, limit)
 * @returns {Promise<object>} Invoices array and pagination info
 */
export const getInvoices = async (filters = {}) => {
  const response = await api.get('/api/billing', { params: filters });
  return response;
};

/**
 * Get single invoice by ID
 * @param {string} id - Invoice UUID
 * @returns {Promise<object>} Invoice object
 */
export const getInvoiceById = async (id) => {
  const response = await api.get(`/api/billing/${id}`);
  return response;
};

/**
 * Create new invoice
 * @param {object} invoiceData - Invoice information
 * @returns {Promise<object>} Created invoice
 */
export const createInvoice = async (invoiceData) => {
  const response = await api.post('/api/billing', invoiceData);
  return response.data;
};

/**
 * Update existing invoice
 * @param {string} id - Invoice UUID
 * @param {object} invoiceData - Updated invoice information
 * @returns {Promise<object>} Updated invoice
 */
export const updateInvoice = async (id, invoiceData) => {
  const response = await api.put(`/api/billing/${id}`, invoiceData);
  return response.data;
};

/**
 * Record payment for invoice
 * @param {string} id - Invoice UUID
 * @param {object} paymentData - Payment information (amount, payment_method, payment_date, notes)
 * @returns {Promise<object>} Updated invoice
 */
export const recordPayment = async (id, paymentData) => {
  const response = await api.post(`/api/billing/${id}/payment`, paymentData);
  return response.data;
};

/**
 * Delete invoice (soft delete)
 * @param {string} id - Invoice UUID
 * @returns {Promise<void>}
 */
export const deleteInvoice = async (id) => {
  const response = await api.delete(`/api/billing/${id}`);
  return response.data;
};

/**
 * Send invoice by email to patient
 * @param {string} id - Invoice UUID
 * @returns {Promise<object>} Response with success message
 */
export const sendInvoiceEmail = async (id) => {
  const response = await api.post(`/api/billing/${id}/send-email`);
  return response.data;
};

/**
 * Mark invoice as paid (quick action)
 * @param {string} id - Invoice UUID
 * @returns {Promise<object>} Updated invoice
 */
export const markAsPaid = async (id) => {
  const response = await api.post(`/api/billing/${id}/mark-paid`);
  return response.data;
};

/**
 * Export invoices to CSV
 * @param {object} filters - Filter parameters (start_date, end_date, status)
 * @returns {Promise<Blob>} CSV file as blob
 */
export const exportInvoicesCSV = async (filters = {}) => {
  const response = await api.get('/api/billing/export/csv', {
    params: filters,
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Send multiple invoices by email (batch operation)
 * @param {Array<string>} invoiceIds - Array of invoice UUIDs
 * @returns {Promise<object>} Results with successful and failed arrays
 */
export const sendInvoiceBatch = async (invoiceIds) => {
  const response = await api.post('/api/billing/batch/send-invoices', {
    invoice_ids: invoiceIds
  });
  return response.data;
};

/**
 * Send payment reminders for multiple invoices (batch operation)
 * @param {Array<string>} invoiceIds - Array of invoice UUIDs
 * @returns {Promise<object>} Results with successful and failed arrays
 */
export const sendReminderBatch = async (invoiceIds) => {
  const response = await api.post('/api/billing/batch/send-reminders', {
    invoice_ids: invoiceIds
  });
  return response.data;
};

/**
 * Change invoice status (admin override)
 * Allows changing invoice status even if already PAID
 * @param {string} id - Invoice UUID
 * @param {string} status - New status (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
 * @returns {Promise<object>} Updated invoice
 */
export const changeInvoiceStatus = async (id, status) => {
  const response = await api.patch(`/api/billing/${id}/status`, { status });
  return response.data;
};

/**
 * Update payment amount (admin override)
 * Updates amount_paid and recalculates amount_due and status
 * @param {string} id - Invoice UUID
 * @param {number} amountPaid - New total amount paid
 * @returns {Promise<object>} Updated invoice
 */
export const updatePaymentAmount = async (id, amountPaid) => {
  const response = await api.patch(`/api/billing/${id}/payment-amount`, { amount_paid: amountPaid });
  return response.data;
};

/**
 * Change payment status (PAID/CANCELLED)
 * Changes payment status and recalculates invoice amounts
 * @param {string} paymentId - Payment UUID
 * @param {string} status - New status (PAID, CANCELLED)
 * @returns {Promise<object>} Updated payment and invoice
 */
export const changePaymentStatus = async (paymentId, status) => {
  const response = await api.patch(`/api/billing/payments/${paymentId}/status`, { status });
  return response.data;
};

/**
 * Download invoice as customized PDF
 * Generates PDF with user's branding customization (logo, colors, contact info)
 * @param {string} id - Invoice UUID
 * @returns {Promise<Blob>} PDF file as blob
 */
export const downloadInvoicePDF = async (id) => {
  const response = await api.get(`/api/billing/${id}/pdf`, {
    responseType: 'blob'
  });
  return response;
};