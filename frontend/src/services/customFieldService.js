/**
 * Custom Field Service
 * API calls for custom field management (categories, definitions, and patient values)
 */

import api from './api';

// ===========================================
// Category API Calls
// ===========================================

/**
 * Get all categories
 * @param {object} filters - Filter parameters (is_active, language, etc.)
 * @returns {Promise<Array>} Array of categories
 */
export const getCategories = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const queryString = params.toString();
  const response = await api.get(`/api/custom-fields/categories${queryString ? '?' + queryString : ''}`);
  return response.data.data || response.data;
};

/**
 * Get category by ID
 * @param {string} id - Category UUID
 * @param {string} language - Optional language code for translations
 * @returns {Promise<object>} Category object
 */
export const getCategoryById = async (id, language = null) => {
  const url = `/api/custom-fields/categories/${id}`;
  const params = language ? { language } : {};
  const response = await api.get(url, { params });
  return response.data.data || response.data;
};

/**
 * Create a new category
 * @param {object} categoryData - Category information
 * @returns {Promise<object>} Created category
 */
export const createCategory = async (categoryData) => {
  const response = await api.post('/api/custom-fields/categories', categoryData);
  return response.data;
};

/**
 * Update existing category
 * @param {string} id - Category UUID
 * @param {object} categoryData - Updated category information
 * @returns {Promise<object>} Updated category
 */
export const updateCategory = async (id, categoryData) => {
  const response = await api.put(`/api/custom-fields/categories/${id}`, categoryData);
  return response.data;
};

/**
 * Delete category (soft delete)
 * @param {string} id - Category UUID
 * @returns {Promise<void>}
 */
export const deleteCategory = async (id) => {
  const response = await api.delete(`/api/custom-fields/categories/${id}`);
  return response.data;
};

/**
 * Reorder categories
 * @param {Array} order - Array of {id, display_order} objects
 * @returns {Promise<void>}
 */
export const reorderCategories = async (order) => {
  const response = await api.post('/api/custom-fields/categories/reorder', { order });
  return response.data;
};

// ===========================================
// Field Definition API Calls
// ===========================================

/**
 * Get all active field definitions
 * @param {string} language - Optional language code for translations
 * @returns {Promise<Array>} Array of field definitions
 */
export const getDefinitions = async (language = null) => {
  const params = language ? { language } : {};
  const response = await api.get('/api/custom-fields/definitions', { params });
  return response.data.data || response.data;
};

/**
 * Get definitions by category
 * @param {string} categoryId - Category UUID
 * @param {string} language - Optional language code for translations
 * @returns {Promise<Array>} Array of field definitions
 */
export const getDefinitionsByCategory = async (categoryId, language = null) => {
  const params = language ? { language } : {};
  const response = await api.get(`/api/custom-fields/definitions/category/${categoryId}`, { params });
  return response.data.data || response.data;
};

/**
 * Get definition by ID
 * @param {string} id - Definition UUID
 * @param {string} language - Optional language code for translations
 * @returns {Promise<object>} Definition object
 */
export const getDefinitionById = async (id, language = null) => {
  const params = language ? { language } : {};
  const response = await api.get(`/api/custom-fields/definitions/${id}`, { params });
  return response.data.data || response.data;
};

/**
 * Create a new field definition
 * @param {object} definitionData - Definition information
 * @returns {Promise<object>} Created definition
 */
export const createDefinition = async (definitionData) => {
  const response = await api.post('/api/custom-fields/definitions', definitionData);
  return response.data;
};

/**
 * Update existing field definition
 * @param {string} id - Definition UUID
 * @param {object} definitionData - Updated definition information
 * @returns {Promise<object>} Updated definition
 */
export const updateDefinition = async (id, definitionData) => {
  const response = await api.put(`/api/custom-fields/definitions/${id}`, definitionData);
  return response.data;
};

/**
 * Delete field definition (soft delete)
 * @param {string} id - Definition UUID
 * @returns {Promise<void>}
 */
export const deleteDefinition = async (id) => {
  const response = await api.delete(`/api/custom-fields/definitions/${id}`);
  return response.data;
};

/**
 * Reorder field definitions
 * @param {Array} order - Array of {id, display_order} objects
 * @returns {Promise<void>}
 */
export const reorderFields = async (order) => {
  const response = await api.post('/api/custom-fields/definitions/reorder', { order });
  return response.data;
};

// ===========================================
// Patient Custom Field Values API Calls
// ===========================================

/**
 * Get all custom field values for a patient
 * @param {string} patientId - Patient UUID
 * @param {string} language - Optional language code for translations
 * @returns {Promise<Array>} Array of custom field values grouped by category
 */
export const getPatientCustomFields = async (patientId, language = null) => {
  const params = language ? { language } : {};
  const response = await api.get(`/api/patients/${patientId}/custom-fields`, { params });
  return response.data.data || response.data;
};

/**
 * Update custom field values for a patient (bulk update)
 * @param {string} patientId - Patient UUID
 * @param {Array} fields - Array of {definition_id, value} objects
 * @returns {Promise<object>} Update result
 */
export const updatePatientCustomFields = async (patientId, fields) => {
  const response = await api.put(`/api/patients/${patientId}/custom-fields`, { fields });
  return response.data;
};

/**
 * Delete a custom field value for a patient
 * @param {string} patientId - Patient UUID
 * @param {string} fieldValueId - Field value UUID
 * @returns {Promise<void>}
 */
export const deletePatientCustomField = async (patientId, fieldValueId) => {
  const response = await api.delete(`/api/patients/${patientId}/custom-fields/${fieldValueId}`);
  return response.data;
};

// ===========================================
// Translation API Calls
// ===========================================

/**
 * Get all translations for an entity (all languages)
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} entityId - Entity UUID
 * @returns {Promise<object>} Translations grouped by language code
 */
export const getAllTranslations = async (entityType, entityId) => {
  const response = await api.get(`/api/custom-fields/${entityType}/${entityId}/translations`);
  return response.data;
};

/**
 * Get translations for an entity in a specific language
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} entityId - Entity UUID
 * @param {string} languageCode - Language code (e.g., 'en', 'es')
 * @returns {Promise<object>} Translations { name: "...", description: "..." }
 */
export const getTranslations = async (entityType, entityId, languageCode) => {
  const response = await api.get(`/api/custom-fields/${entityType}/${entityId}/translations/${languageCode}`);
  return response.data;
};

/**
 * Set translations for an entity in a specific language (bulk)
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} entityId - Entity UUID
 * @param {string} languageCode - Language code (e.g., 'en', 'es')
 * @param {object} translations - Translations object { name: "...", description: "..." }
 * @returns {Promise<object>} Save result
 */
export const setTranslations = async (entityType, entityId, languageCode, translations) => {
  const response = await api.post(
    `/api/custom-fields/${entityType}/${entityId}/translations/${languageCode}`,
    translations
  );
  return response.data;
};

/**
 * Delete a translation
 * @param {string} translationId - Translation UUID
 * @returns {Promise<void>}
 */
export const deleteTranslation = async (translationId) => {
  const response = await api.delete(`/api/custom-fields/translations/${translationId}`);
  return response.data;
};

/**
 * Duplicate a category
 * @param {string} id - Category UUID to duplicate
 * @param {object} overrides - Optional overrides for the duplicated category
 * @returns {Promise<object>} Created category
 */
export const duplicateCategory = async (id, overrides = {}) => {
  const response = await api.post(`/api/custom-fields/categories/${id}/duplicate`, overrides);
  return response.data;
};

/**
 * Duplicate a field definition
 * @param {string} id - Definition UUID to duplicate
 * @param {object} overrides - Optional overrides for the duplicated definition
 * @returns {Promise<object>} Created definition
 */
export const duplicateDefinition = async (id, overrides = {}) => {
  const response = await api.post(`/api/custom-fields/definitions/${id}/duplicate`, overrides);
  return response.data;
};

export default {
  // Categories
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  duplicateCategory,
  reorderCategories,

  // Definitions
  getDefinitions,
  getDefinitionsByCategory,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  duplicateDefinition,
  reorderFields,

  // Patient values
  getPatientCustomFields,
  updatePatientCustomFields,
  deletePatientCustomField,

  // Translations
  getAllTranslations,
  getTranslations,
  setTranslations,
  deleteTranslation
};
