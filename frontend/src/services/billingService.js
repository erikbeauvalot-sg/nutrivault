/**
 * Billing Service
 * Handles all billing-related API calls
 */

import api from './api';

/**
 * Get all invoices with optional filters
 */
export const getInvoices = async (filters = {}, page = 1, limit = 25) => {
  const params = new URLSearchParams();

  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.status) {
    params.append('status', filters.status);
  }
  if (filters.patientId) {
    params.append('patient_id', filters.patientId);
  }
  if (filters.startDate) {
    params.append('start_date', filters.startDate);
  }
  if (filters.endDate) {
    params.append('end_date', filters.endDate);
  }
  if (page) {
    params.append('page', page);
  }
  if (limit) {
    params.append('limit', limit);
  }

  const response = await api.get(`/billing?${params.toString()}`);
  return response.data;
};

/**
 * Get a single invoice by ID
 */
export const getInvoice = async (id) => {
  const response = await api.get(`/billing/${id}`);
  return response.data;
};

/**
 * Create a new invoice
 */
export const createInvoice = async (data) => {
  const response = await api.post('/billing', data);
  return response.data;
};

/**
 * Update an existing invoice
 */
export const updateInvoice = async (id, data) => {
  const response = await api.put(`/billing/${id}`, data);
  return response.data;
};

/**
 * Record a payment for an invoice
 */
export const recordPayment = async (id, paymentData) => {
  const response = await api.post(`/billing/${id}/mark-paid`, paymentData);
  return response.data;
};

/**
 * Delete an invoice
 */
export const deleteInvoice = async (id) => {
  const response = await api.delete(`/billing/${id}`);
  return response.data;
};

/**
 * Get billing statistics
 */
export const getBillingStats = async () => {
  const response = await api.get('/billing/stats');
  return response.data;
};

export default {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  recordPayment,
  deleteInvoice,
  getBillingStats
};
