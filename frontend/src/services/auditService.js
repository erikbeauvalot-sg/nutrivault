import api from './api';

/**
 * Get audit logs with optional filters
 * @param {Object} filters - Filter parameters
 * @param {string} filters.startDate - Start date (ISO string)
 * @param {string} filters.endDate - End date (ISO string)
 * @param {number} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.resourceType - Filter by resource type
 * @param {string} filters.status - Filter by status (success/failure)
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 50)
 * @returns {Promise} Response with audit logs
 */
export const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  const params = {
    page,
    limit,
    ...filters
  };

  // Remove undefined/empty values
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined || params[key] === '') {
      delete params[key];
    }
  });

  const response = await api.get('/audit-logs', { params });
  return response.data;
};

/**
 * Get audit log details by ID
 * @param {number} id - Audit log ID
 * @returns {Promise} Response with audit log details
 */
export const getAuditLogById = async (id) => {
  const response = await api.get(`/audit-logs/${id}`);
  return response.data;
};

/**
 * Export audit logs to CSV
 * @param {Object} filters - Filter parameters (same as getAuditLogs)
 * @returns {Promise} Response with CSV data
 */
export const exportAuditLogs = async (filters = {}) => {
  const params = { ...filters };

  // Remove undefined/empty values
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined || params[key] === '') {
      delete params[key];
    }
  });

  const response = await api.get('/audit-logs/export', {
    params,
    responseType: 'blob'
  });
  return response.data;
};
