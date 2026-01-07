/**
 * User Management Service
 *
 * API functions for user CRUD operations
 */

import api from './api';

/**
 * Get all users with optional filtering and pagination
 */
export const getUsers = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.search) {
    queryParams.append('search', params.search);
  }
  if (params.role) {
    queryParams.append('role', params.role);
  }
  if (params.status) {
    queryParams.append('status', params.status);
  }
  if (params.page) {
    queryParams.append('page', params.page);
  }
  if (params.limit) {
    queryParams.append('limit', params.limit);
  }
  if (params.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder);
  }

  const response = await api.get(`/users?${queryParams.toString()}`);
  return response.data;
};

/**
 * Get a single user by ID
 */
export const getUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

/**
 * Create a new user
 */
export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

/**
 * Update an existing user
 */
export const updateUser = async (id, userData) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

/**
 * Delete a user
 */
export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

/**
 * Activate a user
 */
export const activateUser = async (id) => {
  const response = await api.put(`/users/${id}/activate`);
  return response.data;
};

/**
 * Deactivate a user
 */
export const deactivateUser = async (id) => {
  const response = await api.put(`/users/${id}/deactivate`);
  return response.data;
};

/**
 * Change user password
 */
export const changePassword = async (id, passwordData) => {
  const response = await api.put(`/users/${id}/password`, passwordData);
  return response.data;
};

/**
 * Get user statistics
 */
export const getUserStats = async () => {
  const response = await api.get('/users/stats');
  return response.data;
};

/**
 * Get all roles for user assignment
 * Note: Since there's no dedicated roles endpoint, we'll need to fetch from auth or hardcode
 */
export const getRoles = async () => {
  // Hardcoded roles based on the seed data
  // In a real app, this would be an API call
  return [
    { id: 1, name: 'Admin', description: 'System administrator with full access' },
    { id: 2, name: 'Practitioner', description: 'Healthcare practitioner managing patients' },
    { id: 3, name: 'Receptionist', description: 'Front desk staff managing appointments' },
    { id: 4, name: 'Billing', description: 'Billing staff managing invoices and payments' }
  ];
};

export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  changePassword,
  getUserStats,
  getRoles
};
