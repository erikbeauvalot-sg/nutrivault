/**
 * Dashboard Service
 * API calls for dashboard-related endpoints
 */

import api from './api';

/**
 * Get practice overview KPIs
 */
export const getOverview = async () => {
  const response = await api.get('/dashboard/overview');
  return response.data;
};

/**
 * Get revenue chart data
 * @param {string} period - 'monthly' or 'quarterly'
 */
export const getRevenueChart = async (period = 'monthly') => {
  const response = await api.get(`/dashboard/revenue-chart?period=${period}`);
  return response.data;
};

/**
 * Get practice health score
 */
export const getHealthScore = async () => {
  const response = await api.get('/dashboard/health-score');
  return response.data;
};

/**
 * Get activity feed
 * @param {number} limit - Number of activities to return
 */
export const getActivityFeed = async (limit = 20) => {
  const response = await api.get(`/dashboard/activity?limit=${limit}`);
  return response.data;
};

/**
 * Get activity summary
 */
export const getActivitySummary = async () => {
  const response = await api.get('/dashboard/activity-summary');
  return response.data;
};

/**
 * Get what's new / changelog
 * @param {string} language - 'fr' or 'en'
 */
export const getWhatsNew = async (language = 'fr') => {
  const response = await api.get(`/dashboard/whats-new?language=${language}`);
  return response.data;
};

/**
 * Get all changelogs
 * @param {string} language - 'fr' or 'en'
 * @param {number} limit - Number of changelogs to return
 */
export const getAllChangelogs = async (language = 'fr', limit = 5) => {
  const response = await api.get(`/dashboard/changelogs?language=${language}&limit=${limit}`);
  return response.data;
};

/**
 * Get recent journal entries across the dietitian's patients
 * @param {number} limit - Number of entries to return
 */
export const getRecentJournal = async (limit = 10) => {
  const response = await api.get(`/dashboard/recent-journal?limit=${limit}`);
  return response.data;
};

export default {
  getOverview,
  getRevenueChart,
  getHealthScore,
  getActivityFeed,
  getActivitySummary,
  getWhatsNew,
  getAllChangelogs,
  getRecentJournal
};
