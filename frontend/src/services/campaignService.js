/**
 * Campaign Service
 * API calls for email campaign management
 */

import api from './api';
import { extractData, extractPagination } from '../utils/apiResponse';

/**
 * Get all campaigns with optional filters
 * @param {object} filters - Filter parameters
 * @returns {Promise<{data: Array, pagination: object|null}>}
 */
export const getCampaigns = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/campaigns?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Get campaign by ID
 * @param {string} id - Campaign UUID
 * @returns {Promise<object>}
 */
export const getCampaignById = async (id) => {
  const response = await api.get(`/campaigns/${id}`);
  return extractData(response);
};

/**
 * Create new campaign
 * @param {object} campaignData - Campaign information
 * @returns {Promise<object>}
 */
export const createCampaign = async (campaignData) => {
  const response = await api.post('/campaigns', campaignData);
  return extractData(response);
};

/**
 * Update campaign
 * @param {string} id - Campaign UUID
 * @param {object} campaignData - Updated campaign information
 * @returns {Promise<object>}
 */
export const updateCampaign = async (id, campaignData) => {
  const response = await api.put(`/campaigns/${id}`, campaignData);
  return extractData(response);
};

/**
 * Delete campaign (soft delete)
 * @param {string} id - Campaign UUID
 * @returns {Promise<object>}
 */
export const deleteCampaign = async (id) => {
  const response = await api.delete(`/campaigns/${id}`);
  return response.data;
};

/**
 * Duplicate campaign
 * @param {string} id - Campaign UUID to duplicate
 * @returns {Promise<object>}
 */
export const duplicateCampaign = async (id) => {
  const response = await api.post(`/campaigns/${id}/duplicate`);
  return extractData(response);
};

/**
 * Preview audience for a campaign
 * @param {string} id - Campaign UUID
 * @returns {Promise<object>}
 */
export const previewCampaignAudience = async (id) => {
  const response = await api.post(`/campaigns/${id}/preview-audience`);
  return extractData(response);
};

/**
 * Preview audience for criteria (without saving campaign)
 * @param {object} criteria - Audience criteria
 * @returns {Promise<object>}
 */
export const previewAudienceCriteria = async (criteria) => {
  const response = await api.post('/campaigns/preview-audience', { criteria });
  return extractData(response);
};

/**
 * Send campaign immediately
 * @param {string} id - Campaign UUID
 * @returns {Promise<object>}
 */
export const sendCampaign = async (id) => {
  const response = await api.post(`/campaigns/${id}/send`);
  return extractData(response);
};

/**
 * Schedule campaign for later
 * @param {string} id - Campaign UUID
 * @param {string} scheduledAt - ISO date string
 * @returns {Promise<object>}
 */
export const scheduleCampaign = async (id, scheduledAt) => {
  const response = await api.post(`/campaigns/${id}/schedule`, { scheduled_at: scheduledAt });
  return extractData(response);
};

/**
 * Cancel a scheduled or sending campaign
 * @param {string} id - Campaign UUID
 * @returns {Promise<object>}
 */
export const cancelCampaign = async (id) => {
  const response = await api.post(`/campaigns/${id}/cancel`);
  return extractData(response);
};

/**
 * Get campaign statistics
 * @param {string} id - Campaign UUID
 * @returns {Promise<object>}
 */
export const getCampaignStats = async (id) => {
  const response = await api.get(`/campaigns/${id}/stats`);
  return extractData(response);
};

/**
 * Get campaign recipients
 * @param {string} id - Campaign UUID
 * @param {object} filters - Filter parameters
 * @returns {Promise<{data: Array, pagination: object|null}>}
 */
export const getCampaignRecipients = async (id, filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/campaigns/${id}/recipients?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Get available segment fields for audience builder
 * @returns {Promise<object>}
 */
export const getSegmentFields = async () => {
  const response = await api.get('/campaigns/segment-fields');
  return extractData(response);
};

export default {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  previewCampaignAudience,
  previewAudienceCriteria,
  sendCampaign,
  scheduleCampaign,
  cancelCampaign,
  getCampaignStats,
  getCampaignRecipients,
  getSegmentFields
};
