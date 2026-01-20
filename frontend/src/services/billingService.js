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