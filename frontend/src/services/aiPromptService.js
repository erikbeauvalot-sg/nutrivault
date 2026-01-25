/**
 * AI Prompt Service
 * API client for managing AI prompts
 */

import api from './api';

const aiPromptService = {
  /**
   * Get all AI prompts
   * @param {Object} filters - Optional filters (usage, language_code, is_active)
   * @returns {Promise} API response
   */
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.usage) params.append('usage', filters.usage);
    if (filters.language_code) params.append('language_code', filters.language_code);
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active);

    return api.get(`/api/ai-prompts?${params.toString()}`);
  },

  /**
   * Get a prompt by ID
   * @param {string} id - Prompt UUID
   * @returns {Promise} API response
   */
  getById: async (id) => {
    return api.get(`/api/ai-prompts/${id}`);
  },

  /**
   * Get active prompt for a usage type
   * @param {string} usage - Usage type (followup, invitation, etc.)
   * @param {string} languageCode - Language code (fr, en)
   * @returns {Promise} API response
   */
  getActivePrompt: async (usage, languageCode = 'fr') => {
    return api.get(`/api/ai-prompts/usage/${usage}?language_code=${languageCode}`);
  },

  /**
   * Get list of usage types
   * @returns {Promise} API response
   */
  getUsageTypes: async () => {
    return api.get('/api/ai-prompts/usage-types');
  },

  /**
   * Create a new prompt
   * @param {Object} data - Prompt data
   * @returns {Promise} API response
   */
  create: async (data) => {
    return api.post('/api/ai-prompts', data);
  },

  /**
   * Update a prompt
   * @param {string} id - Prompt UUID
   * @param {Object} data - Update data
   * @returns {Promise} API response
   */
  update: async (id, data) => {
    return api.put(`/api/ai-prompts/${id}`, data);
  },

  /**
   * Delete a prompt
   * @param {string} id - Prompt UUID
   * @returns {Promise} API response
   */
  delete: async (id) => {
    return api.delete(`/api/ai-prompts/${id}`);
  },

  /**
   * Set a prompt as default
   * @param {string} id - Prompt UUID
   * @returns {Promise} API response
   */
  setAsDefault: async (id) => {
    return api.post(`/api/ai-prompts/${id}/set-default`);
  },

  /**
   * Duplicate a prompt
   * @param {string} id - Source prompt UUID
   * @param {Object} overrides - Optional overrides
   * @returns {Promise} API response
   */
  duplicate: async (id, overrides = {}) => {
    return api.post(`/api/ai-prompts/${id}/duplicate`, overrides);
  },

  /**
   * Test a prompt with sample data
   * @param {string} id - Prompt UUID
   * @param {Object} sampleData - Sample data for variable substitution
   * @returns {Promise} API response
   */
  test: async (id, sampleData = {}) => {
    return api.post(`/api/ai-prompts/${id}/test`, sampleData);
  }
};

export default aiPromptService;
