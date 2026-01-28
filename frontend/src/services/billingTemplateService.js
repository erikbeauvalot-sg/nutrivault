/**
 * Billing Template Service
 * API client for billing template operations
 */

import api from './api';

/**
 * Get all billing templates
 * @param {Object} filters - Optional filters (is_active, search)
 * @returns {Promise<Object>} API response with templates
 */
export const getAllTemplates = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.is_active !== undefined) {
    params.append('is_active', filters.is_active);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }

  const queryString = params.toString();
  const url = `/billing-templates${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return response.data;
};

/**
 * Get billing template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} API response with template
 */
export const getTemplateById = async (templateId) => {
  const response = await api.get(`/billing-templates/${templateId}`);
  return response.data;
};

/**
 * Create new billing template
 * @param {Object} templateData - Template data with items
 * @returns {Promise<Object>} API response with created template
 */
export const createTemplate = async (templateData) => {
  const response = await api.post('/billing-templates', templateData);
  return response.data;
};

/**
 * Update billing template
 * @param {string} templateId - Template ID
 * @param {Object} templateData - Updated template data
 * @returns {Promise<Object>} API response with updated template
 */
export const updateTemplate = async (templateId, templateData) => {
  const response = await api.put(`/billing-templates/${templateId}`, templateData);
  return response.data;
};

/**
 * Delete billing template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} API response
 */
export const deleteTemplate = async (templateId) => {
  const response = await api.delete(`/billing-templates/${templateId}`);
  return response.data;
};

/**
 * Clone billing template
 * @param {string} templateId - Template ID to clone
 * @param {string} newName - Name for cloned template
 * @returns {Promise<Object>} API response with cloned template
 */
export const cloneTemplate = async (templateId, newName) => {
  const response = await api.post(`/billing-templates/${templateId}/clone`, {
    name: newName
  });
  return response.data;
};

/**
 * Set template as default
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} API response
 */
export const setAsDefault = async (templateId) => {
  const response = await api.post(`/billing-templates/${templateId}/set-default`);
  return response.data;
};

/**
 * Get default billing template
 * @returns {Promise<Object>} API response with default template
 */
export const getDefaultTemplate = async () => {
  const response = await api.get('/billing-templates/default');
  return response.data;
};

export default {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  setAsDefault,
  getDefaultTemplate
};
