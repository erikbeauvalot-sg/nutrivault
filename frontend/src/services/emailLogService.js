/**
 * Email Log Service
 * API client for email communication history
 */

import api from './api';

/**
 * Get email logs for a patient
 * @param {string} patientId - Patient ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Email logs with pagination
 */
export const getPatientEmailLogs = async (patientId, options = {}) => {
  const params = new URLSearchParams();

  if (options.email_type) params.append('email_type', options.email_type);
  if (options.status) params.append('status', options.status);
  if (options.startDate) params.append('startDate', options.startDate);
  if (options.endDate) params.append('endDate', options.endDate);
  if (options.limit) params.append('limit', options.limit);
  if (options.offset) params.append('offset', options.offset);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const queryString = params.toString();
  const url = `/api/patients/${patientId}/email-logs${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return response.data;
};

/**
 * Get a single email log by ID
 * @param {string} id - Email log ID
 * @returns {Promise<Object>} Email log details
 */
export const getEmailLog = async (id) => {
  const response = await api.get(`/api/email-logs/${id}`);
  return response.data;
};

/**
 * Get email statistics for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Email statistics
 */
export const getPatientEmailStats = async (patientId) => {
  const response = await api.get(`/api/patients/${patientId}/email-stats`);
  return response.data;
};

/**
 * Get available email types
 * @returns {Promise<Array>} Email types
 */
export const getEmailTypes = async () => {
  const response = await api.get('/api/email-logs/types');
  return response.data;
};

export default {
  getPatientEmailLogs,
  getEmailLog,
  getPatientEmailStats,
  getEmailTypes
};
