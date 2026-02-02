/**
 * Ingredient Category Service
 * API calls for ingredient category management
 */

import api from './api';
import { extractData } from '../utils/apiResponse';

/**
 * Get all ingredient categories
 * @param {object} filters - Filter parameters
 * @returns {Promise<Array>}
 */
export const getCategories = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/ingredients/categories?${params.toString()}`);
  return extractData(response, []);
};

/**
 * Get category statistics (ingredient count per category)
 * @returns {Promise<Array>}
 */
export const getCategoryStats = async () => {
  const response = await api.get('/ingredients/categories/stats');
  return extractData(response, []);
};

/**
 * Get category by ID
 * @param {string} id - Category UUID
 * @returns {Promise<object>}
 */
export const getCategoryById = async (id) => {
  const response = await api.get(`/ingredients/categories/${id}`);
  return extractData(response);
};

/**
 * Create new category
 * @param {object} categoryData - Category information
 * @returns {Promise<object>}
 */
export const createCategory = async (categoryData) => {
  const response = await api.post('/ingredients/categories', categoryData);
  return extractData(response);
};

/**
 * Update category
 * @param {string} id - Category UUID
 * @param {object} categoryData - Updated category information
 * @returns {Promise<object>}
 */
export const updateCategory = async (id, categoryData) => {
  const response = await api.put(`/ingredients/categories/${id}`, categoryData);
  return extractData(response);
};

/**
 * Delete category
 * @param {string} id - Category UUID
 * @returns {Promise<object>}
 */
export const deleteCategory = async (id) => {
  const response = await api.delete(`/ingredients/categories/${id}`);
  return extractData(response);
};

/**
 * Reorder categories
 * @param {Array<string>} orderedIds - Array of category IDs in new order
 * @returns {Promise<object>}
 */
export const reorderCategories = async (orderedIds) => {
  const response = await api.post('/ingredients/categories/reorder', { ordered_ids: orderedIds });
  return extractData(response);
};

export default {
  getCategories,
  getCategoryStats,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
