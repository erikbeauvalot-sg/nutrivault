/**
 * User Service
 * API wrapper for user management endpoints
 */

import api from './api';

/**
 * Get all users with optional filters (Admin only)
 * @param {Object} filters - Query parameters (search, role_id, is_active, page, limit)
 * @returns {Promise} API response
 */
export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const response = await api.get(`/api/users?${params.toString()}`);
  return response;
};

/**
 * Get user by ID
 * @param {string} id - User UUID
 * @returns {Promise} API response
 */
export const getUserById = async (id) => {
  const response = await api.get(`/api/users/${id}`);
  return response;
};

/**
 * Create new user (Admin only)
 * @param {Object} userData - User data
 * @returns {Promise} API response
 */
export const createUser = async (userData) => {
  const response = await api.post('/api/users', userData);
  return response;
};

/**
 * Update user
 * @param {string} id - User UUID
 * @param {Object} updateData - Update data
 * @returns {Promise} API response
 */
export const updateUser = async (id, updateData) => {
  const response = await api.put(`/api/users/${id}`, updateData);
  return response;
};

/**
 * Delete user (Admin only)
 * @param {string} id - User UUID
 * @returns {Promise} API response
 */
export const deleteUser = async (id) => {
  const response = await api.delete(`/api/users/${id}`);
  return response;
};

/**
 * Change user password
 * @param {string} id - User UUID
 * @param {Object} passwordData - { oldPassword, newPassword }
 * @returns {Promise} API response
 */
export const changePassword = async (id, passwordData) => {
  const response = await api.put(`/api/users/${id}/password`, passwordData);
  return response;
};

/**
 * Toggle user active status (Admin only)
 * @param {string} id - User UUID
 * @returns {Promise} API response
 */
export const toggleUserStatus = async (id) => {
  const response = await api.put(`/api/users/${id}/toggle-status`);
  return response;
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  toggleUserStatus
};
