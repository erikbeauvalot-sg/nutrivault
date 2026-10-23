/**
 * App Settings Service
 * API client for application-wide feature toggles.
 * Settings are cached for the session so pages don't refetch them on every load.
 */

import api from './api';

let cache = null;

export const getAppSettings = async ({ force = false } = {}) => {
  if (!cache || force) {
    cache = api.get('/app-settings')
      .then(response => response.data?.data || {})
      .catch(error => {
        cache = null;
        throw error;
      });
  }
  return cache;
};

export const updateAppSettings = async (settings) => {
  const response = await api.put('/app-settings', settings);
  const data = response.data?.data || {};
  cache = Promise.resolve(data);
  return data;
};

export const clearAppSettingsCache = () => {
  cache = null;
};

export default {
  getAppSettings,
  updateAppSettings,
  clearAppSettingsCache
};
