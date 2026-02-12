import api from './api';

/**
 * Get all sidebar menu configs
 */
export const getAllConfigs = async () => {
  const response = await api.get('/sidebar-menu-configs');
  return response.data.data || response.data;
};

/**
 * Bulk update sidebar menu items (admin only)
 * @param {Array} items - Array of { item_key, display_order, is_visible, allowed_roles, section }
 */
export const bulkUpdate = async (items) => {
  const response = await api.put('/sidebar-menu-configs/bulk', { items });
  return response.data.data || response.data;
};

/**
 * Reorder items within a section (admin only)
 * @param {string} section - 'main' or 'settings'
 * @param {Array} orderData - Array of { item_key, display_order }
 */
export const reorderItems = async (section, orderData) => {
  const response = await api.put('/sidebar-menu-configs/reorder', { section, orderData });
  return response.data.data || response.data;
};

/**
 * Reset to defaults (admin only)
 */
export const resetToDefaults = async () => {
  const response = await api.post('/sidebar-menu-configs/reset');
  return response.data.data || response.data;
};

export default {
  getAllConfigs,
  bulkUpdate,
  reorderItems,
  resetToDefaults
};
