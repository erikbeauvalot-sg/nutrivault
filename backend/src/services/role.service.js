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
const SidebarMenuConfig = db.SidebarMenuConfig;
const auditService = require('./audit.service');
const { isValidHomePage } = require('../helpers/homePage');

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

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isSystemRole(name) {
  return Role.SYSTEM_ROLES.includes(name);
}

async function assertValidHomePage(homePage) {
  if (homePage !== undefined && !(await isValidHomePage(homePage))) {
    throw httpError(400, 'home_page must be an existing menu entry');
  }
}

/**
 * Create new role
 *
 * The name is free-form: it is normalized (uppercase, no accents, underscores)
 * and must not already exist. A previously deleted (inactive) role with the same
 * name is reactivated with a clean permission set.
 *
 * @param {Object} user - Authenticated user
 * @param {Object} roleData - Role data (name, description, data_scope)
 * @param {Object} requestMetadata - Request metadata for audit log
 * @returns {Promise<Object>} Created role
 */
async function createRole(user, roleData, requestMetadata) {
  try {
    const name = Role.normalizeName(roleData.name);
    const fields = {
      description: roleData.description || null,
      data_scope: roleData.data_scope || 'own',
      home_page: roleData.home_page || null,
      is_active: true
    };
    await assertValidHomePage(fields.home_page);

    const existingRole = await Role.findOne({ where: { name } });

    if (existingRole && existingRole.is_active) {
      throw httpError(409, `Role with name "${name}" already exists`);
    }

    let role;
    if (existingRole) {
      // Soft-deleted role: bring it back without its old permissions
      await RolePermission.destroy({ where: { role_id: existingRole.id } });
      role = await existingRole.update(fields);
    } else {
      role = await Role.create({ name, ...fields });
    }

    await auditService.log({
      action: 'ROLE_CREATE',
      user_id: user.id,
      username: user.username,
      resource_type: 'Role',
      resource_id: role.id,
      changes: {
        role_name: role.name,
        description: role.description,
        data_scope: role.data_scope,
        reactivated: !!existingRole
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
 * System roles keep their name, data scope and active state (their behaviour is
 * hard-wired by name); only their description and home page can change. Custom roles can be
 * renamed, re-scoped and deactivated.
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
      throw httpError(404, 'Role not found');
    }

    const changes = {};
    if (updateData.description !== undefined) changes.description = updateData.description || null;

    const name = updateData.name !== undefined ? Role.normalizeName(updateData.name) : undefined;
    const nameChanged = name !== undefined && name !== role.name;
    const scopeChanged = updateData.data_scope !== undefined && updateData.data_scope !== role.data_scope;
    const deactivating = updateData.is_active === false && role.is_active;

    if (isSystemRole(role.name) && (nameChanged || scopeChanged || deactivating)) {
      throw httpError(403, `System role "${role.name}" can only have its description, home page and permissions changed`);
    }

    if (nameChanged) {
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        throw httpError(409, `Role with name "${name}" already exists`);
      }
      changes.name = name;
    }
    if (scopeChanged) changes.data_scope = updateData.data_scope;
    if (updateData.home_page !== undefined) {
      await assertValidHomePage(updateData.home_page);
      changes.home_page = updateData.home_page;
    }
    if (updateData.is_active !== undefined) {
      if (deactivating) {
        await assertRoleUnused(roleId);
      }
      changes.is_active = updateData.is_active;
    }

    const previousName = role.name;
    await role.update(changes);

    if (nameChanged) {
      await renameRoleInMenu(previousName, name);
    }

    await auditService.log({
      action: 'ROLE_UPDATE',
      user_id: user.id,
      username: user.username,
      resource_type: 'Role',
      resource_id: role.id,
      changes: {
        role_name: role.name,
        changes
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

async function assertRoleUnused(roleId) {
  const usersWithRole = await User.count({
    where: { role_id: roleId, is_active: true }
  });

  if (usersWithRole > 0) {
    throw httpError(409, `Cannot delete role: ${usersWithRole} active user(s) are assigned to this role`);
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
      username: user.username,
      resource_type: 'Role',
      resource_id: role.id,
      changes: {
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

    if (isSystemRole(role.name)) {
      throw httpError(403, `System role "${role.name}" cannot be deleted`);
    }

    await assertRoleUnused(roleId);

    // Soft delete by setting is_active to false
    await role.update({ is_active: false });
    await setMenuItemsForRoleName(role.name, []);

    // Audit log
    await auditService.log({
      action: 'ROLE_DELETE',
      user_id: user.id,
      username: user.username,
      resource_type: 'Role',
      resource_id: role.id,
      changes: {
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

/**
 * Replace a role name in every sidebar entry's allowed_roles
 */
async function renameRoleInMenu(oldName, newName) {
  const configs = await SidebarMenuConfig.findAll();
  for (const config of configs) {
    const roles = config.allowed_roles || [];
    if (roles.includes(oldName)) {
      config.allowed_roles = [...new Set(roles.map(r => (r === oldName ? newName : r)))];
      await config.save();
    }
  }
}

/**
 * Make exactly the given sidebar entries visible to a role name
 */
async function setMenuItemsForRoleName(roleName, itemKeys, transaction) {
  const wanted = new Set(itemKeys);
  const configs = await SidebarMenuConfig.findAll({ transaction });
  for (const config of configs) {
    const roles = config.allowed_roles || [];
    const has = roles.includes(roleName);
    const should = wanted.has(config.item_key);
    if (has !== should) {
      config.allowed_roles = should ? [...roles, roleName] : roles.filter(r => r !== roleName);
      await config.save({ transaction });
    }
  }
}

/**
 * Get the sidebar entries a role can see
 *
 * @param {string} roleId - Role UUID
 * @returns {Promise<string[]>} item keys
 */
async function getRoleMenuItems(roleId) {
  const role = await Role.findByPk(roleId);
  if (!role) {
    throw httpError(404, 'Role not found');
  }

  const configs = await SidebarMenuConfig.findAll({ order: [['section', 'ASC'], ['display_order', 'ASC']] });
  return configs
    .filter(config => (config.allowed_roles || []).includes(role.name))
    .map(config => config.item_key);
}

/**
 * Set the sidebar entries a role can see (replaces the previous selection)
 *
 * ADMIN always sees every entry, so it cannot be configured here.
 *
 * @param {Object} user - Authenticated user
 * @param {string} roleId - Role UUID
 * @param {string[]} itemKeys - Sidebar item keys
 * @param {Object} requestMetadata - Request metadata for audit log
 * @returns {Promise<string[]>} item keys now visible to the role
 */
async function updateRoleMenuItems(user, roleId, itemKeys, requestMetadata) {
  const role = await Role.findByPk(roleId);
  if (!role) {
    throw httpError(404, 'Role not found');
  }
  if (role.name === 'ADMIN') {
    throw httpError(400, 'ADMIN always sees every menu entry');
  }

  const uniqueKeys = [...new Set(itemKeys)];
  const known = await SidebarMenuConfig.count({ where: { item_key: uniqueKeys } });
  if (known !== uniqueKeys.length) {
    throw httpError(400, 'One or more menu entries are invalid');
  }

  await db.sequelize.transaction(transaction => setMenuItemsForRoleName(role.name, uniqueKeys, transaction));

  await auditService.log({
    action: 'ROLE_MENU_UPDATE',
    user_id: user.id,
    username: user.username,
    resource_type: 'Role',
    resource_id: role.id,
    changes: {
      role_name: role.name,
      menu_items: uniqueKeys
    },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  return getRoleMenuItems(roleId);
}

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
  getAllPermissions,
  getRoleMenuItems,
  updateRoleMenuItems
};
