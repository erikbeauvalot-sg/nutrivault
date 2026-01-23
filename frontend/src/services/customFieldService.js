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
 * @param {object} filters - Filter parameters (is_active, etc.)
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
 * @returns {Promise<object>} Category object
 */
export const getCategoryById = async (id) => {
  const response = await api.get(`/api/custom-fields/categories/${id}`);
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
 * @returns {Promise<Array>} Array of field definitions
 */
export const getDefinitions = async () => {
  const response = await api.get('/api/custom-fields/definitions');
  return response.data.data || response.data;
};

/**
 * Get definitions by category
 * @param {string} categoryId - Category UUID
 * @returns {Promise<Array>} Array of field definitions
 */
export const getDefinitionsByCategory = async (categoryId) => {
  const response = await api.get(`/api/custom-fields/definitions/category/${categoryId}`);
  return response.data.data || response.data;
};

/**
 * Get definition by ID
 * @param {string} id - Definition UUID
 * @returns {Promise<object>} Definition object
 */
export const getDefinitionById = async (id) => {
  const response = await api.get(`/api/custom-fields/definitions/${id}`);
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
 * @returns {Promise<Array>} Array of custom field values grouped by category
 */
export const getPatientCustomFields = async (patientId) => {
  const response = await api.get(`/api/patients/${patientId}/custom-fields`);
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

export default {
  // Categories
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,

  // Definitions
  getDefinitions,
  getDefinitionsByCategory,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  reorderFields,

  // Patient values
  getPatientCustomFields,
  updatePatientCustomFields,
  deletePatientCustomField
};
