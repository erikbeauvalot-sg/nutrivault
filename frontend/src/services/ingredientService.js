/**
 * Ingredient Service
 * API calls for ingredient management
 */

import api from './api';
import { extractData, extractPagination } from '../utils/apiResponse';

/**
 * Get all ingredients with optional filters
 * @param {object} filters - Filter parameters
 * @returns {Promise<{data: Array, pagination: object|null}>}
 */
export const getIngredients = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/ingredients?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Search ingredients (autocomplete)
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>}
 */
export const searchIngredients = async (query, limit = 10) => {
  const response = await api.get(`/ingredients/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return extractData(response, []);
};

/**
 * Get ingredient categories
 * @returns {Promise<Array>}
 */
export const getCategories = async () => {
  const response = await api.get('/ingredients/categories');
  return extractData(response, []);
};

/**
 * Get ingredient by ID
 * @param {string} id - Ingredient UUID
 * @returns {Promise<object>}
 */
export const getIngredientById = async (id) => {
  const response = await api.get(`/ingredients/${id}`);
  return extractData(response);
};

/**
 * Create new ingredient
 * @param {object} ingredientData - Ingredient information
 * @returns {Promise<object>}
 */
export const createIngredient = async (ingredientData) => {
  const response = await api.post('/ingredients', ingredientData);
  return extractData(response);
};

/**
 * Update ingredient
 * @param {string} id - Ingredient UUID
 * @param {object} ingredientData - Updated ingredient information
 * @returns {Promise<object>}
 */
export const updateIngredient = async (id, ingredientData) => {
  const response = await api.put(`/ingredients/${id}`, ingredientData);
  return extractData(response);
};

/**
 * Delete ingredient
 * @param {string} id - Ingredient UUID
 * @returns {Promise<object>}
 */
export const deleteIngredient = async (id) => {
  const response = await api.delete(`/ingredients/${id}`);
  return extractData(response);
};

/**
 * Duplicate ingredient
 * @param {string} id - Ingredient UUID
 * @returns {Promise<object>}
 */
export const duplicateIngredient = async (id) => {
  const response = await api.post(`/ingredients/${id}/duplicate`);
  return extractData(response);
};

/**
 * Lookup nutritional data for an ingredient from external APIs
 * @param {string} query - Ingredient name to lookup
 * @returns {Promise<object|null>} Nutritional data or null
 */
export const lookupNutrition = async (query) => {
  const response = await api.get(`/ingredients/lookup/${encodeURIComponent(query)}`);
  return extractData(response);
};
