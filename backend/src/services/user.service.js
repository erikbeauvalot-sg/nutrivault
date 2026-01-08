/**
 * User Management Service
 *
 * Business logic for user management operations
 */

const db = require('../../models');
const { hashPassword, validatePasswordStrength } = require('../auth/password');
const { AppError } = require('../middleware/errorHandler');
const { logCrudEvent } = require('./audit.service');
const { Op } = require('sequelize');
const QueryBuilder = require('../utils/queryBuilder');
const { USERS_CONFIG } = require('../config/queryConfigs');

/**
 * Get all users with filtering and pagination
 */
async function getUsers(filters = {}) {
  // Use QueryBuilder for advanced filtering
  const queryBuilder = new QueryBuilder(USERS_CONFIG);
  const { where, pagination, sort } = queryBuilder.build(filters);

  const { count, rows } = await db.User.findAndCountAll({
    where,
    include: [{
      model: db.Role,
      as: 'role',
      attributes: ['id', 'name', 'description']
    }],
    attributes: { exclude: ['password_hash'] },
    limit: pagination.limit,
    offset: pagination.offset,
    order: sort
  });

  return {
    users: rows,
    total: count,
    limit: pagination.limit,
    offset: pagination.offset
  };
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  const user = await db.User.findByPk(userId, {
    include: [{
      model: db.Role,
      as: 'role',
      include: [{
        model: db.Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    }],
    attributes: { exclude: ['password_hash'] }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
}

/**
 * Update user
 */
async function updateUser(userId, updates, updatedBy) {
  const user = await db.User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Fields that can be updated
  const allowedUpdates = [
    'email',
    'first_name',
    'last_name',
    'role_id'
  ];

  // Filter updates to only allowed fields
  const filteredUpdates = {};
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  // Check if email is being changed and if it already exists
  if (filteredUpdates.email && filteredUpdates.email !== user.email) {
    const existingUser = await db.User.findOne({
      where: { email: filteredUpdates.email }
    });
    if (existingUser) {
      throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
    }
  }

  // Track changes for audit log
  const changes = {};
  Object.keys(filteredUpdates).forEach(key => {
    if (user[key] !== filteredUpdates[key]) {
      changes[key] = {
        old: user[key],
        new: filteredUpdates[key]
      };
    }
  });

  // Update user
  await user.update({
    ...filteredUpdates,
    updated_by: updatedBy
  });

  // Log the update
  await logCrudEvent({
    user_id: updatedBy,
    action: 'UPDATE',
    resource_type: 'users',
    resource_id: userId,
    changes: changes,
    status: 'SUCCESS'
  });

  // Reload with associations
  await user.reload({
    include: [{
      model: db.Role,
      as: 'role',
      attributes: ['id', 'name', 'description']
    }],
    attributes: { exclude: ['password_hash'] }
  });

  return user;
}

/**
 * Delete user (soft delete by deactivating)
 */
async function deleteUser(userId, deletedBy) {
  const user = await db.User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent self-deletion
  if (userId === deletedBy) {
    throw new AppError('Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
  }

  // Deactivate instead of hard delete
  await user.update({
    is_active: false,
    updated_by: deletedBy
  });

  // Log the deletion
  await logCrudEvent({
    user_id: deletedBy,
    action: 'DELETE',
    resource_type: 'users',
    resource_id: userId,
    status: 'SUCCESS'
  });

  return { message: 'User deactivated successfully' };
}

/**
 * Change user password
 */
async function changePassword(userId, currentPassword, newPassword, changedBy) {
  const user = await db.User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // If user is changing their own password, verify current password
  if (userId === changedBy) {
    const { verifyPassword } = require('../auth/password');
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }
  }
  // If admin is changing someone else's password, they don't need current password

  // Validate new password strength
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    throw new AppError(
      `Password does not meet requirements: ${validation.errors.join(', ')}`,
      400,
      'WEAK_PASSWORD'
    );
  }

  // Hash and update password
  const password_hash = await hashPassword(newPassword);
  await user.update({
    password_hash,
    updated_by: changedBy
  });

  // Log password change
  await logCrudEvent({
    user_id: changedBy,
    action: 'UPDATE',
    resource_type: 'users',
    resource_id: userId,
    changes: { password: 'changed' },
    status: 'SUCCESS'
  });

  return { message: 'Password changed successfully' };
}

/**
 * Activate user
 */
async function activateUser(userId, activatedBy) {
  const user = await db.User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.is_active) {
    throw new AppError('User is already active', 400, 'USER_ALREADY_ACTIVE');
  }

  await user.update({
    is_active: true,
    failed_login_attempts: 0,
    locked_until: null,
    updated_by: activatedBy
  });

  // Log activation
  await logCrudEvent({
    user_id: activatedBy,
    action: 'UPDATE',
    resource_type: 'users',
    resource_id: userId,
    changes: { is_active: { old: false, new: true } },
    status: 'SUCCESS'
  });

  return { message: 'User activated successfully' };
}

/**
 * Deactivate user
 */
async function deactivateUser(userId, deactivatedBy) {
  const user = await db.User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent self-deactivation
  if (userId === deactivatedBy) {
    throw new AppError('Cannot deactivate your own account', 400, 'CANNOT_DEACTIVATE_SELF');
  }

  if (!user.is_active) {
    throw new AppError('User is already inactive', 400, 'USER_ALREADY_INACTIVE');
  }

  await user.update({
    is_active: false,
    updated_by: deactivatedBy
  });

  // Revoke all active refresh tokens
  await db.RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null } }
  );

  // Revoke all active API keys
  await db.ApiKey.update(
    { is_active: false },
    { where: { user_id: userId, is_active: true } }
  );

  // Log deactivation
  await logCrudEvent({
    user_id: deactivatedBy,
    action: 'UPDATE',
    resource_type: 'users',
    resource_id: userId,
    changes: { is_active: { old: true, new: false } },
    status: 'SUCCESS'
  });

  return { message: 'User deactivated successfully. All tokens and API keys revoked.' };
}

/**
 * Get user statistics
 */
async function getUserStats() {
  const totalUsers = await db.User.count();
  const activeUsers = await db.User.count({ where: { is_active: true } });
  const inactiveUsers = await db.User.count({ where: { is_active: false } });

  const usersByRole = await db.User.findAll({
    attributes: [
      'role_id',
      [db.sequelize.fn('COUNT', db.sequelize.col('User.id')), 'count']
    ],
    include: [{
      model: db.Role,
      as: 'role',
      attributes: ['name']
    }],
    group: ['role_id', 'role.id', 'role.name']
  });

  return {
    total: totalUsers,
    active: activeUsers,
    inactive: inactiveUsers,
    by_role: usersByRole.map(item => ({
      role: item.role.name,
      count: parseInt(item.get('count'))
    }))
  };
}

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  activateUser,
  deactivateUser,
  getUserStats
};
