/**
 * Role Service
 * API wrapper for role and permission management endpoints
 */

import api from './api';

/**
 * Get all roles with their permissions (Admin only)
 * @returns {Promise} API response with list of roles
 */
export const getRoles = async () => {
  const response = await api.get('/roles');
  return response;
};

/**
 * Get role by ID with permissions (Admin only)
 * @param {string} id - Role UUID
 * @returns {Promise} API response with role details
 */
export const getRoleById = async (id) => {
  const response = await api.get(`/roles/${id}`);
  return response;
};

/**
 * Create new role (Admin only)
 * @param {Object} roleData - Role data { name, description }
 * @returns {Promise} API response with created role
 */
export const createRole = async (roleData) => {
  const response = await api.post('/roles', roleData);
  return response;
};

/**
 * Update role (Admin only)
 * @param {string} id - Role UUID
 * @param {Object} updateData - Update data { name, description, is_active }
 * @returns {Promise} API response with updated role
 */
export const updateRole = async (id, updateData) => {
  const response = await api.put(`/roles/${id}`, updateData);
  return response;
};

/**
 * Update role permissions (Admin only)
 * @param {string} id - Role UUID
 * @param {Array<string>} permissionIds - Array of permission UUIDs
 * @returns {Promise} API response with updated role
 */
export const updateRolePermissions = async (id, permissionIds) => {
  const response = await api.put(`/roles/${id}/permissions`, {
    permission_ids: permissionIds
  });
  return response;
};

/**
 * Delete role (Admin only)
 * @param {string} id - Role UUID
 * @returns {Promise} API response
 */
export const deleteRole = async (id) => {
  const response = await api.delete(`/roles/${id}`);
  return response;
};

/**
 * Get all permissions grouped by resource (Admin only)
 * @returns {Promise} API response with list of permissions
 */
export const getAllPermissions = async () => {
  const response = await api.get('/roles/all/permissions');
  return response;
};

/**
 * Group permissions by resource
 * Helper function to organize permissions for UI display
 * @param {Array} permissions - Array of permission objects
 * @returns {Object} Permissions grouped by resource
 */
export const groupPermissionsByResource = (permissions) => {
  return permissions.reduce((grouped, permission) => {
    const resource = permission.resource;
    if (!grouped[resource]) {
      grouped[resource] = [];
    }
    grouped[resource].push(permission);
    return grouped;
  }, {});
};

/**
 * Format permission code for display
 * Converts "patients.create" to "Create Patients"
 * @param {string} code - Permission code (e.g., "patients.create")
 * @returns {string} Formatted display text
 */
export const formatPermissionCode = (code) => {
  const [resource, action] = code.split('.');
  const actionText = action.charAt(0).toUpperCase() + action.slice(1);
  const resourceText = resource.charAt(0).toUpperCase() + resource.slice(1);
  return `${actionText} ${resourceText}`;
};

export default {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
  getAllPermissions,
  groupPermissionsByResource,
  formatPermissionCode
};
