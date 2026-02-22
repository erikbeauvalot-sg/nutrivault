import api from './api';

/**
 * Get all sidebar categories (ordered by section + display_order)
 */
export const getAllCategories = async () => {
  const response = await api.get('/sidebar-categories');
  return response.data.data || response.data;
};

/**
 * Create a new category (admin only)
 */
export const createCategory = async (data) => {
  const response = await api.post('/sidebar-categories', data);
  return response.data.data || response.data;
};

/**
 * Update a category (admin only)
 */
export const updateCategory = async (id, data) => {
  const response = await api.put(`/sidebar-categories/${id}`, data);
  return response.data.data || response.data;
};

/**
 * Delete a category (admin only)
 */
export const deleteCategory = async (id) => {
  const response = await api.delete(`/sidebar-categories/${id}`);
  return response.data;
};

/**
 * Reorder categories within a section (admin only)
 */
export const reorderCategories = async (section, orderedIds) => {
  const response = await api.put('/sidebar-categories/reorder', { section, orderedIds });
  return response.data.data || response.data;
};

export default {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
