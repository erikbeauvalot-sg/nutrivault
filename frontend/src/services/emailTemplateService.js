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

  const response = await api.get(`/email-templates?${params.toString()}`);
  return response;
};

/**
 * Get single template by ID
 * @param {string} id - Template UUID
 * @returns {Promise<object>} Template object
 */
export const getTemplateById = async (id) => {
  const response = await api.get(`/email-templates/${id}`);
  return response;
};

/**
 * Create new email template
 * @param {object} templateData - Template information
 * @returns {Promise<object>} Created template
 */
export const createTemplate = async (templateData) => {
  const response = await api.post('/email-templates', templateData);
  return response.data;
};

/**
 * Update existing email template
 * @param {string} id - Template UUID
 * @param {object} templateData - Updated template information
 * @returns {Promise<object>} Updated template
 */
export const updateTemplate = async (id, templateData) => {
  const response = await api.put(`/email-templates/${id}`, templateData);
  return response.data;
};

/**
 * Delete email template (soft delete)
 * @param {string} id - Template UUID
 * @returns {Promise<void>}
 */
export const deleteTemplate = async (id) => {
  const response = await api.delete(`/email-templates/${id}`);
  return response.data;
};

/**
 * Duplicate an email template
 * @param {string} id - Template UUID to duplicate
 * @param {object} overrides - Fields to override in the duplicate
 * @returns {Promise<object>} New template
 */
export const duplicateTemplate = async (id, overrides = {}) => {
  const response = await api.post(`/email-templates/${id}/duplicate`, overrides);
  return response.data;
};

/**
 * Toggle template active status
 * @param {string} id - Template UUID
 * @returns {Promise<object>} Updated template
 */
export const toggleActive = async (id) => {
  const response = await api.patch(`/email-templates/${id}/toggle-active`);
  return response.data;
};

/**
 * Preview template with sample data
 * @param {string} id - Template UUID
 * @param {object} sampleData - Sample data for variables
 * @returns {Promise<object>} Rendered template (subject, html, text)
 */
export const previewTemplate = async (id, sampleData = {}) => {
  const response = await api.post(`/email-templates/${id}/preview`, sampleData);
  return response;
};

/**
 * Get available variables for a category
 * @param {string} category - Template category
 * @returns {Promise<object>} Available variables array
 */
export const getAvailableVariables = async (category) => {
  const response = await api.get(`/email-templates/categories/${category}/variables`);
  return response;
};

/**
 * Get template statistics
 * @returns {Promise<object>} Template statistics
 */
export const getTemplateStats = async () => {
  const response = await api.get('/email-templates/stats');
  return response;
};

// ==========================================
// Translation Functions - US-5.5.6
// ==========================================

/**
 * Get all translations for a template
 * @param {string} templateId - Template UUID
 * @returns {Promise<object>} Translations object keyed by language code
 */
export const getTranslations = async (templateId) => {
  const response = await api.get(`/email-templates/${templateId}/translations`);
  return response;
};

/**
 * Get translation for a specific language
 * @param {string} templateId - Template UUID
 * @param {string} languageCode - Language code (e.g., 'fr')
 * @returns {Promise<object>} Translation object
 */
export const getTranslation = async (templateId, languageCode) => {
  const response = await api.get(`/email-templates/${templateId}/translations/${languageCode}`);
  return response;
};

/**
 * Save translation for a language
 * @param {string} templateId - Template UUID
 * @param {string} languageCode - Language code
 * @param {object} translationData - Translation fields (subject, body_html, body_text)
 * @returns {Promise<object>} Saved translation
 */
export const saveTranslation = async (templateId, languageCode, translationData) => {
  const response = await api.post(`/email-templates/${templateId}/translations/${languageCode}`, translationData);
  return response;
};

/**
 * Delete translation for a language
 * @param {string} templateId - Template UUID
 * @param {string} languageCode - Language code
 * @returns {Promise<void>}
 */
export const deleteTranslation = async (templateId, languageCode) => {
  const response = await api.delete(`/email-templates/${templateId}/translations/${languageCode}`);
  return response;
};

/**
 * Get base template content (for copying to translation)
 * @param {string} templateId - Template UUID
 * @returns {Promise<object>} Base template content
 */
export const getBaseContent = async (templateId) => {
  const response = await api.get(`/email-templates/${templateId}/base-content`);
  return response;
};

/**
 * Get supported languages list
 * @returns {Promise<Array>} Supported languages
 */
export const getSupportedLanguages = async () => {
  const response = await api.get('/email-templates/supported-languages');
  return response;
};

/**
 * Preview template in a specific language
 * @param {string} templateId - Template UUID
 * @param {string} languageCode - Language code
 * @param {object} sampleData - Sample data for variables
 * @returns {Promise<object>} Rendered template
 */
export const previewTranslation = async (templateId, languageCode, sampleData = {}) => {
  const response = await api.post(
    `/email-templates/${templateId}/preview-translation?languageCode=${languageCode}`,
    sampleData
  );
  return response;
};

// ==========================================
// Export/Import Functions
// ==========================================

/**
 * Export email templates with translations
 * @param {Array<string>} categories - Categories to export (empty = all)
 * @returns {Promise<object>} Export data
 */
export const exportTemplates = async (categories = []) => {
  const response = await api.post('/email-templates/export', { categories });
  return response.data;
};

/**
 * Import email templates with translations
 * @param {object} importData - Import data with templates array
 * @param {object} options - { skipExisting, updateExisting }
 * @returns {Promise<object>} Import results
 */
export const importTemplates = async (importData, options = {}) => {
  const response = await api.post('/email-templates/import', { importData, options });
  return response.data;
};

/**
 * Customize a system template (create user override)
 * @param {string} id - System template UUID to clone
 * @returns {Promise<object>} New user-owned template
 */
export const customizeTemplate = async (id) => {
  const response = await api.post(`/email-templates/${id}/customize`);
  return response.data;
};

/**
 * Reset a user template override to system default
 * @param {string} id - User template UUID to delete
 * @returns {Promise<void>}
 */
export const resetToDefault = async (id) => {
  const response = await api.delete(`/email-templates/${id}/reset-to-default`);
  return response.data;
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
  getTemplateStats,
  // Translation functions
  getTranslations,
  getTranslation,
  saveTranslation,
  deleteTranslation,
  getBaseContent,
  getSupportedLanguages,
  previewTranslation,
  // Export/Import functions
  exportTemplates,
  importTemplates,
  // Customize functions
  customizeTemplate,
  resetToDefault
};
