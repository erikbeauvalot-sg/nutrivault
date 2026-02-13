/**
 * Finance Service
 * API calls for finance dashboard, aging report, cash flow
 */

import api from './api';

export const getDashboard = async (params = {}) => {
  const response = await api.get('/finance/dashboard', { params });
  return response;
};

export const getAgingReport = async (params = {}) => {
  const response = await api.get('/finance/aging-report', { params });
  return response;
};

export const getCashFlow = async (params = {}) => {
  const response = await api.get('/finance/cash-flow', { params });
  return response;
};

export const sendReminders = async (invoiceIds) => {
  const response = await api.post('/finance/send-reminders', { invoice_ids: invoiceIds });
  return response.data;
};
