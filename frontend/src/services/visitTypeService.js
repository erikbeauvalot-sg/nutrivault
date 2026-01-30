/**
 * Visit Type Service
 * API client for visit type operations
 */

import api from './api';

/**
 * Get all visit types
 * @param {Object} filters - Optional filters (is_active, search)
 * @returns {Promise<Object>} API response with visit types
 */
export const getAllVisitTypes = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.is_active !== undefined) {
    params.append('is_active', filters.is_active);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }

  const queryString = params.toString();
  const url = `/visit-types${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  return response.data;
};

/**
 * Get visit type by ID
 * @param {string} id - Visit type ID
 * @returns {Promise<Object>} API response with visit type
 */
export const getVisitTypeById = async (id) => {
  const response = await api.get(`/visit-types/${id}`);
  return response.data;
};

/**
 * Create new visit type
 * @param {Object} data - Visit type data
 * @returns {Promise<Object>} API response with created visit type
 */
export const createVisitType = async (data) => {
  const response = await api.post('/visit-types', data);
  return response.data;
};

/**
 * Update visit type
 * @param {string} id - Visit type ID
 * @param {Object} data - Updated visit type data
 * @returns {Promise<Object>} API response with updated visit type
 */
export const updateVisitType = async (id, data) => {
  const response = await api.put(`/visit-types/${id}`, data);
  return response.data;
};

/**
 * Delete visit type
 * @param {string} id - Visit type ID
 * @returns {Promise<Object>} API response
 */
export const deleteVisitType = async (id) => {
  const response = await api.delete(`/visit-types/${id}`);
  return response.data;
};

/**
 * Reorder visit types
 * @param {Array} order - Array of { id, display_order } objects
 * @returns {Promise<Object>} API response with reordered visit types
 */
export const reorderVisitTypes = async (order) => {
  const response = await api.put('/visit-types/reorder', { order });
  return response.data;
};

export default {
  getAllVisitTypes,
  getVisitTypeById,
  createVisitType,
  updateVisitType,
  deleteVisitType,
  reorderVisitTypes
};
