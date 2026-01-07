import api from './api';

/**
 * Report Service
 * Handles all report and dashboard statistics API calls
 */

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Dashboard stats (patients, visits, revenue, invoices)
 */
export const getDashboardStats = async () => {
  const response = await api.get('/reports/dashboard');
  return response.data;
};

/**
 * Get revenue report for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Revenue report data
 */
export const getRevenueReport = async (startDate, endDate) => {
  const response = await api.get('/reports/revenue', {
    params: { startDate, endDate }
  });
  return response.data;
};

/**
 * Get patient summary report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Patient report data
 */
export const getPatientReport = async (startDate, endDate) => {
  const response = await api.get('/reports/patients', {
    params: { startDate, endDate }
  });
  return response.data;
};

/**
 * Get visit summary report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Visit report data
 */
export const getVisitReport = async (startDate, endDate) => {
  const response = await api.get('/reports/visits', {
    params: { startDate, endDate }
  });
  return response.data;
};

/**
 * Get revenue trend data for charts (last N months)
 * @param {number} months - Number of months to fetch (default: 6)
 * @returns {Promise<Object>} Revenue trend data
 */
export const getRevenueTrend = async (months = 6) => {
  const response = await api.get('/reports/revenue-trend', {
    params: { months }
  });
  return response.data;
};

/**
 * Get visit trend data for charts (last N months)
 * @param {number} months - Number of months to fetch (default: 6)
 * @returns {Promise<Object>} Visit trend data
 */
export const getVisitTrend = async (months = 6) => {
  const response = await api.get('/reports/visit-trend', {
    params: { months }
  });
  return response.data;
};

/**
 * Get recent visits for dashboard
 * @param {number} limit - Number of visits to fetch (default: 5)
 * @returns {Promise<Array>} Recent visits
 */
export const getRecentVisits = async (limit = 5) => {
  const response = await api.get('/visits', {
    params: { limit, sort: 'visit_date:desc' }
  });
  return response.data;
};

/**
 * Get recent invoices for dashboard
 * @param {number} limit - Number of invoices to fetch (default: 5)
 * @returns {Promise<Array>} Recent invoices
 */
export const getRecentInvoices = async (limit = 5) => {
  const response = await api.get('/billing', {
    params: { limit, sort: 'invoice_date:desc' }
  });
  return response.data;
};

/**
 * Get upcoming appointments for dashboard
 * @param {number} limit - Number of appointments to fetch (default: 5)
 * @returns {Promise<Array>} Upcoming appointments
 */
export const getUpcomingAppointments = async (limit = 5) => {
  const response = await api.get('/visits', {
    params: {
      limit,
      status: 'scheduled',
      sort: 'visit_date:asc',
      futureOnly: true
    }
  });
  return response.data;
};

/**
 * Export report data to CSV
 * @param {string} reportType - Type of report (patients, visits, revenue)
 * @param {Object} params - Report parameters (startDate, endDate, etc.)
 * @returns {Promise<Blob>} CSV file blob
 */
export const exportReportCSV = async (reportType, params) => {
  const response = await api.get(`/reports/${reportType}/export`, {
    params,
    responseType: 'blob'
  });
  return response.data;
};

export default {
  getDashboardStats,
  getRevenueReport,
  getPatientReport,
  getVisitReport,
  getRevenueTrend,
  getVisitTrend,
  getRecentVisits,
  getRecentInvoices,
  getUpcomingAppointments,
  exportReportCSV
};
