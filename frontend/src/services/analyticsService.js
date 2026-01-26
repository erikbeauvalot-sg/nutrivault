import api from './api';

/**
 * Analytics Service
 * Sprint 6: Advanced Data Visualization
 */

/**
 * Get health trends analytics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date filter (optional)
 * @param {string} params.endDate - End date filter (optional)
 */
export const getHealthTrends = async (params = {}) => {
  const response = await api.get('/analytics/health-trends', { params });
  return response.data;
};

/**
 * Get financial metrics analytics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date filter (optional)
 * @param {string} params.endDate - End date filter (optional)
 */
export const getFinancialMetrics = async (params = {}) => {
  const response = await api.get('/analytics/financial-metrics', { params });
  return response.data;
};

/**
 * Get communication effectiveness analytics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date filter (optional)
 * @param {string} params.endDate - End date filter (optional)
 */
export const getCommunicationEffectiveness = async (params = {}) => {
  const response = await api.get('/analytics/communication-effectiveness', { params });
  return response.data;
};

/**
 * Get patient health score
 * @param {string} patientId - Patient UUID
 */
export const getPatientHealthScore = async (patientId) => {
  const response = await api.get(`/analytics/patient-health-score/${patientId}`);
  return response.data;
};

export default {
  getHealthTrends,
  getFinancialMetrics,
  getCommunicationEffectiveness,
  getPatientHealthScore
};
