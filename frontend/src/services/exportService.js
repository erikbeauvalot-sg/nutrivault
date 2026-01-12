/**
 * Export Service
 * API wrapper for data export endpoints
 */

import api from './api';

/**
 * Export patients data
 * @param {string} format - Export format: 'csv', 'excel', or 'pdf'
 * @returns {Promise} API response with file download
 */
export const exportPatients = async (format = 'csv') => {
  const response = await api.get(`/api/export/patients?format=${format}`, {
    responseType: 'blob' // Important for file downloads
  });
  return response;
};

/**
 * Export visits data
 * @param {string} format - Export format: 'csv', 'excel', or 'pdf'
 * @returns {Promise} API response with file download
 */
export const exportVisits = async (format = 'csv') => {
  const response = await api.get(`/api/export/visits?format=${format}`, {
    responseType: 'blob' // Important for file downloads
  });
  return response;
};

/**
 * Export billing data
 * @param {string} format - Export format: 'csv', 'excel', or 'pdf'
 * @returns {Promise} API response with file download
 */
export const exportBilling = async (format = 'csv') => {
  const response = await api.get(`/api/export/billing?format=${format}`, {
    responseType: 'blob' // Important for file downloads
  });
  return response;
};

/**
 * Helper function to download blob as file
 * @param {Blob} blob - File blob from API response
 * @param {string} filename - Desired filename
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Generate filename with timestamp
 * @param {string} type - Data type (patients, visits, billing)
 * @param {string} format - File format (csv, excel, pdf)
 * @returns {string} Generated filename
 */
export const generateFilename = (type, format) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const extension = format === 'excel' ? 'xlsx' : format;
  return `nutrivault-${type}-${timestamp}.${extension}`;
};

export default {
  exportPatients,
  exportVisits,
  exportBilling,
  downloadBlob,
  generateFilename
};