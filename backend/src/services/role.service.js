/**
 * Role Service
 *
 * Business logic for role and permission management with audit logging.
 * Handles role CRUD, permission assignment, and validation.
 */

const db = require('../../../models');
const Role = db.Role;
const Permission = db.Permission;
const RolePermission = db.RolePermission;
const User = db.User;
const auditService = require('./audit.service');

/**
 * Get all roles with their permissions
 *
 * @returns {Promise<Array>} Array of roles with permissions
 */
async function getRoles() {
  try {
    const roles = await Role.findAll({
      where: { is_active: true },
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] },
        where: { is_active: true },
        required: false
      }],
      order: [['name', 'ASC']]
    });

    return roles;
  } catch (error) {
    console.error('🔥 Error in getRoles:', error.message);
    throw error;
  }
}

/**
 * Get role by ID with permissions
 *
 * @param {string} roleId - Role UUID
 * @returns {Promise<Object>} Role with permissions
 */
async function getRoleById(roleId) {
  try {
    const role = await Role.findByPk(roleId, {
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] },
        where: { is_active: true },
        required: false
      }]
    });

    if (!role) {
      const error = new Error('Role not found');
      error.statusCode = 404;
      throw error;
    }

    return role;
  } catch (error) {
    console.error('🔥 Error in getRoleById:', error.message);
    throw error;
  }
}

/**
 * Create new role
 *
 * @param {Object} user - Authenticated user
 * @param {Object} roleData - Role data (name, description)
 * @param {Object} requestMetadata - Request metadata for audit log
 * @returns {Promise<Object>} Created role
 */
async function createRole(user, roleData, requestMetadata) {
  try {
    // Check for duplicate role name
    const existingRole = await Role.findOne({
      where: { name: roleData.name }
    });

    if (existingRole) {
      const error = new Error(`Role with name "${roleData.name}" already exists`);
      error.statusCode = 409;
      throw error;
    }

    // Create role
    const role = await Role.create({
      name: roleData.name,
      description: roleData.description || null,
      is_active: true
    });

    // Audit log
    await auditService.log({
      action: 'ROLE_CREATE',
      user_id: user.id,
      resource_type: 'Role',
      resource_id: role.id,
      details: {
        role_name: role.name,
        description: role.description
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    console.log(`✅ Role created: ${role.name} (${role.id})`);
    return role;
  } catch (error) {
    console.error('🔥 Error in createRole:', error.message);
    throw error;
  }
}

/**
 * Update role
 *
 * @param {Object} user - Authenticated user
 * @param {string} roleId - Role UUID
 * @param {Object} updateData - Update data
 * @param {Object} requestMetadata - Request metadata for audit log
 * @returns {Promise<Object>} Updated role
 */
async function updateRole(user, roleId, updateData, requestMetadata) {
  try {
    const role = await Role.findByPk(roleId);

    if (!role) {
      const error = new Error('Role not found');
      error.statusCode = 404;
      throw error;
    }

    // Check for duplicate name if changing name
    if (updateData.name && updateData.name !== role.name) {
      const existingRole = await Role.findOne({
        where: { name: updateData.name }
      });

      if (existingRole) {
        const error = new Error(`Role with name "${updateData.name}" already exists`);
        error.statusCode = 409;
        throw error;
      }
    }

    // Update role
    await role.update(updateData);

    // Audit log
    await auditService.log({
      action: 'ROLE_UPDATE',
      user_id: user.id,
      resource_type: 'Role',
      resource_id: role.id,
      details: {
        role_name: role.name,
        changes: updateData
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    console.log(`✅ Role updated: ${role.name} (${role.id})`);

    // Reload with permissions
    return await getRoleById(roleId);
  } catch (error) {
    console.error('🔥 Error in updateRole:', error.message);
    throw error;
  }
}

/**
 * Update role permissions
 *
 * @param {Object} user - Authenticated user
 * @param {string} roleId - Role UUID
 * @param {Array<string>} permissionIds - Array of permission UUIDs
 * @param {Object} requestMetadata - Request metadata for audit log
 * @returns {Promise<Object>} Role with updated permissions
 */
async function updateRolePermissions(user, roleId, permissionIds, requestMetadata) {
  try {
    // Check if role exists
    const role = await Role.findByPk(roleId);
    if (!role) {
      const error = new Error('Role not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate all permission IDs exist
    if (permissionIds.length > 0) {
      const permissions = await Permission.findAll({
        where: { id: permissionIds, is_active: true }
      });

      if (permissions.length !== permissionIds.length) {
        const error = new Error('One or more permission IDs are invalid');
        error.statusCode = 400;
        throw error;
      }
    }

    // Delete existing permissions for this role
    await RolePermission.destroy({
      where: { role_id: roleId }
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permId => ({
        role_id: roleId,
        permission_id: permId
      }));

      await RolePermission.bulkCreate(rolePermissions);
    }

    // Audit log
    await auditService.log({
      action: 'ROLE_PERMISSIONS_UPDATE',
      user_id: user.id,
      resource_type: 'Role',
      resource_id: role.id,
      details: {
        role_name: role.name,
        permission_count: permissionIds.length,
        permission_ids: permissionIds
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    console.log(`✅ Role permissions updated: ${role.name} (${permissionIds.length} permissions)`);

    // Reload role with updated permissions
    return await getRoleById(roleId);
  } catch (error) {
    console.error('🔥 Error in updateRolePermissions:', error.message);
    throw error;
  }
}

/**
 * Delete role (soft delete)
 *
 * @param {Object} user - Authenticated user
 * @param {string} roleId - Role UUID
 * @param {Object} requestMetadata - Request metadata for audit log
 */
async function deleteRole(user, roleId, requestMetadata) {
  try {
    const role = await Role.findByPk(roleId);

    if (!role) {
      const error = new Error('Role not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if role is in use by any users
    const usersWithRole = await User.count({
      where: { role_id: roleId, is_active: true }
    });

    if (usersWithRole > 0) {
      const error = new Error(`Cannot delete role: ${usersWithRole} active user(s) are assigned to this role`);
      error.statusCode = 409;
      throw error;
    }

    // Soft delete by setting is_active to false
    await role.update({ is_active: false });

    // Audit log
    await auditService.log({
      action: 'ROLE_DELETE',
      user_id: user.id,
      resource_type: 'Role',
      resource_id: role.id,
      details: {
        role_name: role.name,
        description: role.description
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    console.log(`✅ Role deleted (soft): ${role.name} (${role.id})`);
  } catch (error) {
    console.error('🔥 Error in deleteRole:', error.message);
    throw error;
  }
}

/**
 * Get all permissions grouped by resource
 *
 * @returns {Promise<Array>} Array of permissions
 */
async function getAllPermissions() {
  try {
    const permissions = await Permission.findAll({
      where: { is_active: true },
      order: [
        ['resource', 'ASC'],
        ['action', 'ASC']
      ]
    });

    return permissions;
  } catch (error) {
    console.error('🔥 Error in getAllPermissions:', error.message);
    throw error;
  }
}

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
  getAllPermissions
};
