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

export const getRevenue = async (params = {}) => {
  const response = await api.get('/finance/revenue', { params });
  return response;
};

export const getForecast = async (params = {}) => {
  const response = await api.get('/finance/forecast', { params });
  return response;
};

export const sendReminders = async (invoiceIds) => {
  const response = await api.post('/finance/send-reminders', { invoice_ids: invoiceIds });
  return response.data;
};

/**
 * Download the accounting workbook (.xlsx) for a given year and trigger a
 * browser download. Data is generated fresh from the server on each call.
 */
export const downloadComptaExport = async (year) => {
  const response = await api.get('/finance/compta-export', {
    params: { year },
    responseType: 'blob'
  });
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Comptabilite_${year}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  // Surface the mode + any capacity warnings returned via headers.
  const mode = response.headers?.['x-compta-mode'] || 'clean';
  let warnings = [];
  const rawWarnings = response.headers?.['x-compta-warnings'];
  if (rawWarnings) {
    try { warnings = JSON.parse(decodeURIComponent(rawWarnings)); } catch { warnings = []; }
  }
  return { mode, warnings };
};

/**
 * Ask the server to (re)write Compta/Comptabilité_<year>.xlsx on disk.
 */
export const writeComptaToDisk = async (year) => {
  const response = await api.post('/finance/compta-export/write', { year });
  return response.data;
};
