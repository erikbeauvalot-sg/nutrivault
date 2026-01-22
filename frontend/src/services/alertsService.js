/**
 * Alerts Service
 * API wrapper for alerts endpoints
 */

import api from './api';

/**
 * Get all alerts for current user
 * @returns {Promise} API response with categorized alerts
 */
export const getAlerts = async () => {
  const response = await api.get('/api/alerts');
  return response;
};

export default {
  getAlerts
};
