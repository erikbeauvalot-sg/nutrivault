/**
 * Email Template Service
 * API calls for email template management
 *
 * Sprint 5: US-5.5.2 - Email Templates
 */

import api from './api';

/**
 * Get all email templates with optional filters
 * @param {object} filters - Filter parameters (category, is_active, is_system, search)
 * @returns {Promise<object>} Templates array
 */
export const getAllTemplates = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/api/email-templates?${params.toString()}`);
  return response;
};

/**
 * Get single template by ID
 * @param {string} id - Template UUID
 * @returns {Promise<object>} Template object
 */
export const getTemplateById = async (id) => {
  const response = await api.get(`/api/email-templates/${id}`);
  return response;
};

/**
 * Create new email template
 * @param {object} templateData - Template information
 * @returns {Promise<object>} Created template
 */
export const createTemplate = async (templateData) => {
  const response = await api.post('/api/email-templates', templateData);
  return response.data;
};

/**
 * Update existing email template
 * @param {string} id - Template UUID
 * @param {object} templateData - Updated template information
 * @returns {Promise<object>} Updated template
 */
export const updateTemplate = async (id, templateData) => {
  const response = await api.put(`/api/email-templates/${id}`, templateData);
  return response.data;
};

/**
 * Delete email template (soft delete)
 * @param {string} id - Template UUID
 * @returns {Promise<void>}
 */
export const deleteTemplate = async (id) => {
  const response = await api.delete(`/api/email-templates/${id}`);
  return response.data;
};

/**
 * Duplicate an email template
 * @param {string} id - Template UUID to duplicate
 * @param {object} overrides - Fields to override in the duplicate
 * @returns {Promise<object>} New template
 */
export const duplicateTemplate = async (id, overrides = {}) => {
  const response = await api.post(`/api/email-templates/${id}/duplicate`, overrides);
  return response.data;
};

/**
 * Toggle template active status
 * @param {string} id - Template UUID
 * @returns {Promise<object>} Updated template
 */
export const toggleActive = async (id) => {
  const response = await api.patch(`/api/email-templates/${id}/toggle-active`);
  return response.data;
};

/**
 * Preview template with sample data
 * @param {string} id - Template UUID
 * @param {object} sampleData - Sample data for variables
 * @returns {Promise<object>} Rendered template (subject, html, text)
 */
export const previewTemplate = async (id, sampleData = {}) => {
  const response = await api.post(`/api/email-templates/${id}/preview`, sampleData);
  return response;
};

/**
 * Get available variables for a category
 * @param {string} category - Template category
 * @returns {Promise<object>} Available variables array
 */
export const getAvailableVariables = async (category) => {
  const response = await api.get(`/api/email-templates/categories/${category}/variables`);
  return response;
};

/**
 * Get template statistics
 * @returns {Promise<object>} Template statistics
 */
export const getTemplateStats = async () => {
  const response = await api.get('/api/email-templates/stats');
  return response;
};

export default {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  toggleActive,
  previewTemplate,
  getAvailableVariables,
  getTemplateStats
};
