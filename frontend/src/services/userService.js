/**
 * User Service
 * API wrapper for user management endpoints
 */

import api from './api';
import { extractData, extractPagination } from '../utils/apiResponse';

/**
 * Get all users with optional filters (Admin only)
 * @param {Object} filters - Query parameters (search, role_id, is_active, page, limit)
 * @returns {Promise<{data: Array, pagination: object|null}>} Users array and pagination info
 */
export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null) {
      // Allow empty string for is_active (needed for "All Status" filter)
      if (key === 'is_active' || filters[key] !== '') {
        params.append(key, filters[key]);
      }
    }
  });

  const response = await api.get(`/users?${params.toString()}`);
  return {
    data: extractData(response, []),
    pagination: extractPagination(response)
  };
};

/**
 * Get user by ID
 * @param {string} id - User UUID
 * @returns {Promise<object>} User object
 */
export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}`);
  return extractData(response);
};

/**
 * Create new user (Admin only)
 * @param {Object} userData - User data
 * @returns {Promise<object>} Created user
 */
export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return extractData(response);
};

/**
 * Update user
 * @param {string} id - User UUID
 * @param {Object} updateData - Update data
 * @returns {Promise<object>} Updated user
 */
export const updateUser = async (id, updateData) => {
  const response = await api.put(`/users/${id}`, updateData);
  return extractData(response);
};

/**
 * Delete user (Admin only)
 * @param {string} id - User UUID
 * @returns {Promise<object>} Deletion result
 */
export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return extractData(response);
};

/**
 * Change user password
 * @param {string} id - User UUID
 * @param {Object} passwordData - { oldPassword, newPassword }
 * @returns {Promise<object>} Result
 */
export const changePassword = async (id, passwordData) => {
  const response = await api.put(`/users/${id}/password`, passwordData);
  return extractData(response);
};

/**
 * Toggle user active status (Admin only)
 * @param {string} id - User UUID
 * @returns {Promise<object>} Updated user
 */
export const toggleUserStatus = async (id) => {
  const response = await api.put(`/users/${id}/toggle-status`);
  return extractData(response);
};

/**
 * Get all active dietitians (for visit assignment)
 * @returns {Promise<Array>} List of dietitians
 */
export const getDietitians = async () => {
  const response = await api.get('/users/list/dietitians');
  return extractData(response, []);
};

/**
 * Get all available roles
 * @returns {Promise<Array>} List of roles
 */
export const getRoles = async () => {
  const response = await api.get('/users/roles');
  return extractData(response, []);
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  toggleUserStatus,
  getDietitians,
  getRoles
};
