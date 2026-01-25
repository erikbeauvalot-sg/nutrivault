/**
 * AI Configuration Service
 * US-5.5.5: AI-Generated Follow-ups - Multi-Provider Support
 *
 * API client for managing AI provider configuration
 */

import api from './api';

/**
 * Get all AI providers with configuration status
 * @returns {Promise<Object>} Providers list
 */
export const getProviders = async () => {
  const response = await api.get('/api/ai-config/providers');
  return response.data;
};

/**
 * Get pricing information for all providers
 * @returns {Promise<Object>} Pricing info
 */
export const getPricing = async () => {
  const response = await api.get('/api/ai-config/pricing');
  return response.data;
};

/**
 * Get current AI configuration
 * @returns {Promise<Object>} Current config
 */
export const getCurrentConfig = async () => {
  const response = await api.get('/api/ai-config/current');
  return response.data;
};

/**
 * Save AI configuration
 * @param {string} provider - Provider ID
 * @param {string} model - Model ID
 * @returns {Promise<Object>} Save result
 */
export const saveConfig = async (provider, model) => {
  const response = await api.put('/api/ai-config', { provider, model });
  return response.data;
};

/**
 * Test AI provider connection
 * @param {string} provider - Provider ID
 * @param {string} model - Model ID
 * @returns {Promise<Object>} Test result
 */
export const testConnection = async (provider, model) => {
  const response = await api.post('/api/ai-config/test', { provider, model });
  return response.data;
};

export default {
  getProviders,
  getPricing,
  getCurrentConfig,
  saveConfig,
  testConnection
};
