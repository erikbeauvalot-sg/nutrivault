/**
 * Recipe Service
 * API calls for recipe management
 */

import api from './api';
import { extractData, extractPagination } from '../utils/apiResponse';

/**
 * Get all recipes with optional filters
 * @param {object} filters - Filter parameters
 * @returns {Promise<{data: Array, pagination: object|null}>}
 */
export const getRecipes = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      if (key === 'tags' && Array.isArray(filters[key])) {
        params.append(key, filters[key].join(','));
      } else {
        params.append(key, filters[key]);
      }
    }
  });

  const response = await api.get(`/recipes?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Get recipe by ID
 * @param {string} id - Recipe UUID
 * @returns {Promise<object>}
 */
export const getRecipeById = async (id) => {
  const response = await api.get(`/recipes/${id}`);
  return extractData(response);
};

/**
 * Get recipe by slug
 * @param {string} slug - Recipe slug
 * @returns {Promise<object>}
 */
export const getRecipeBySlug = async (slug) => {
  const response = await api.get(`/recipes/slug/${slug}`);
  return extractData(response);
};

/**
 * Create new recipe
 * @param {object} recipeData - Recipe information
 * @returns {Promise<object>}
 */
export const createRecipe = async (recipeData) => {
  const response = await api.post('/recipes', recipeData);
  return extractData(response);
};

/**
 * Update recipe
 * @param {string} id - Recipe UUID
 * @param {object} recipeData - Updated recipe information
 * @returns {Promise<object>}
 */
export const updateRecipe = async (id, recipeData) => {
  const response = await api.put(`/recipes/${id}`, recipeData);
  return extractData(response);
};

/**
 * Delete recipe (soft delete)
 * @param {string} id - Recipe UUID
 * @returns {Promise<object>}
 */
export const deleteRecipe = async (id) => {
  const response = await api.delete(`/recipes/${id}`);
  return extractData(response);
};

/**
 * Publish recipe
 * @param {string} id - Recipe UUID
 * @returns {Promise<object>}
 */
export const publishRecipe = async (id) => {
  const response = await api.post(`/recipes/${id}/publish`);
  return extractData(response);
};

/**
 * Archive recipe
 * @param {string} id - Recipe UUID
 * @returns {Promise<object>}
 */
export const archiveRecipe = async (id) => {
  const response = await api.post(`/recipes/${id}/archive`);
  return extractData(response);
};

/**
 * Duplicate recipe
 * @param {string} id - Recipe UUID
 * @returns {Promise<object>}
 */
export const duplicateRecipe = async (id) => {
  const response = await api.post(`/recipes/${id}/duplicate`);
  return extractData(response);
};

// ============================================
// Recipe Sharing
// ============================================

/**
 * Share recipe with a patient
 * @param {string} recipeId - Recipe UUID
 * @param {string} patientId - Patient UUID
 * @param {string} notes - Optional notes for the patient
 * @returns {Promise<object>}
 */
export const shareRecipe = async (recipeId, patientId, notes = '') => {
  const response = await api.post(`/recipes/${recipeId}/share`, {
    patient_id: patientId,
    notes
  });
  return extractData(response);
};

/**
 * Get list of patients a recipe is shared with
 * @param {string} recipeId - Recipe UUID
 * @returns {Promise<Array>}
 */
export const getRecipeShares = async (recipeId) => {
  const response = await api.get(`/recipes/${recipeId}/shares`);
  return extractData(response, []);
};

/**
 * Revoke recipe access for a patient
 * @param {string} accessId - Access record UUID
 * @returns {Promise<object>}
 */
export const revokeRecipeAccess = async (accessId) => {
  const response = await api.delete(`/recipe-access/${accessId}`);
  return extractData(response);
};

/**
 * Update sharing notes
 * @param {string} accessId - Access record UUID
 * @param {string} notes - Updated notes
 * @returns {Promise<object>}
 */
export const updateShareNotes = async (accessId, notes) => {
  const response = await api.put(`/recipe-access/${accessId}`, { notes });
  return extractData(response);
};

/**
 * Resend share email to patient
 * @param {string} recipeId - Recipe UUID
 * @param {string} shareId - Access record UUID
 * @returns {Promise<object>}
 */
export const resendShareEmail = async (recipeId, shareId) => {
  const response = await api.post(`/recipes/${recipeId}/shares/${shareId}/resend`);
  return extractData(response);
};

/**
 * Get recipes shared with a patient
 * @param {string} patientId - Patient UUID
 * @param {object} filters - Pagination filters
 * @returns {Promise<{data: Array, pagination: object|null}>}
 */
export const getPatientRecipes = async (patientId, filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await api.get(`/patients/${patientId}/recipes?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

// ============================================
// JSON Import/Export
// ============================================

/**
 * Export multiple recipes as JSON
 * @param {string[]} recipeIds - Array of recipe UUIDs (empty = all)
 * @returns {Promise<void>} - Downloads the JSON file
 */
export const exportRecipesJSON = async (recipeIds = []) => {
  const params = new URLSearchParams();
  if (recipeIds.length > 0) {
    params.append('recipeIds', recipeIds.join(','));
  }

  const response = await api.get(`/recipes/export/json?${params.toString()}`, {
    responseType: 'blob'
  });

  let filename = 'nutrivault-recipes.json';
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  const blob = new Blob([response.data], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Export a single recipe as JSON
 * @param {string} recipeId - Recipe UUID
 * @returns {Promise<void>} - Downloads the JSON file
 */
export const exportRecipeJSON = async (recipeId) => {
  const response = await api.get(`/recipes/${recipeId}/export/json`, {
    responseType: 'blob'
  });

  let filename = `recipe-${recipeId}.json`;
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  const blob = new Blob([response.data], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Preview a JSON import file (parse on client side)
 * @param {File} file - JSON file to preview
 * @returns {Promise<Object>} - Parsed import data
 */
export const previewImportFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Import recipes from a JSON file
 * @param {File} file - JSON file to import
 * @param {Object} options - Import options
 * @param {string} options.duplicateHandling - 'skip' or 'rename'
 * @returns {Promise<Object>} - Import summary
 */
export const importRecipesJSON = async (file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  if (options.duplicateHandling) {
    formData.append('duplicateHandling', options.duplicateHandling);
  }

  const response = await api.post('/recipes/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return extractData(response);
};

/**
 * Import a recipe from a URL (schema.org/Recipe scraping)
 * @param {string} url - The URL to import from
 * @returns {Promise<Object>} - Import summary with created recipe
 */
export const importFromUrl = async (url) => {
  const response = await api.post('/recipes/import/url', { url });
  return extractData(response);
};

// ============================================
// PDF Export
// ============================================

/**
 * Export recipe as PDF
 * @param {string} recipeId - Recipe UUID
 * @param {string} language - Language code ('en' or 'fr')
 * @param {string} notes - Optional notes for patient
 * @returns {Promise<void>} - Downloads the PDF
 */
export const exportRecipePDF = async (recipeId, language = 'en', notes = '') => {
  const params = new URLSearchParams();
  params.append('lang', language);
  if (notes) params.append('notes', notes);

  const response = await api.get(`/recipes/${recipeId}/export/pdf?${params.toString()}`, {
    responseType: 'blob'
  });

  // Extract filename from Content-Disposition header
  let filename = `${language === 'fr' ? 'recette' : 'recipe'}-${recipeId}.pdf`;
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  // Create download link
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
