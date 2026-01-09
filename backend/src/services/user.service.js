/**
 * User Service
 * 
 * Business logic for user management with RBAC and audit logging.
 * Handles user CRUD, password management, and account status.
 */

const db = require('../../../models');
const User = db.User;
const Role = db.Role;
const Permission = db.Permission;
const auditService = require('./audit.service');
const bcrypt = require('bcryptjs');
const { Op } = db.Sequelize;

/**
 * Get all users with filtering and pagination (Admin only)
 * 
 * @param {Object} user - Authenticated user object
 * @param {Object} filters - Filter criteria
 * @param {string} filters.search - Search by username, email, or name
 * @param {string} filters.role_id - Filter by role
 * @param {boolean} filters.is_active - Filter by active status
 * @param {number} filters.page - Page number (default 1)
 * @param {number} filters.limit - Items per page (default 20)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Users, total count, and pagination info
 */
async function getUsers(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = {};

    // Apply filters
    if (filters.search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
        { first_name: { [Op.like]: `%${filters.search}%` } },
        { last_name: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    if (filters.role_id) {
      whereClause.role_id = filters.role_id;
    }

    // Filter by is_active status
    // If not explicitly specified, default to showing only active users
    if (filters.is_active !== undefined && filters.is_active !== '') {
      whereClause.is_active = filters.is_active === 'true' || filters.is_active === true;
    } else {
      // Default: only show active users unless explicitly filtering for inactive
      whereClause.is_active = true;
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['username', 'ASC']],
      attributes: { exclude: ['password_hash'] },
      distinct: true,  // ✅ FIX: Prevent count from being multiplied by joins
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'users',
      resource_id: null,
      details: { filter_count: count, page, limit },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return {
      users: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    console.error('Error in getUsers:', error);
    throw error;
  }
}

/**
 * Get user by ID
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} userId - User UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} User details with role and permissions
 */
async function getUserById(user, userId, requestMetadata = {}) {
  try {
    const targetUser = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    if (!targetUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Admin can view any user, users can view own profile
    if (user.role.name !== 'ADMIN' && user.id !== userId) {
      const error = new Error('Access denied: You can only view your own profile');
      error.statusCode = 403;
      throw error;
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'users',
      resource_id: userId,
      details: { target_username: targetUser.username },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return targetUser;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw error;
  }
}

/**
 * Create new user (Admin only)
 * 
 * @param {Object} user - Authenticated user object
 * @param {Object} userData - User data
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created user
 */
async function createUser(user, userData, requestMetadata = {}) {
  try {
    // Check if username already exists
    const existingUser = await User.findOne({
      where: { username: userData.username }
    });
    if (existingUser) {
      const error = new Error('Username already exists');
      error.statusCode = 400;
      throw error;
    }

    // Check if email already exists
    const existingEmail = await User.findOne({
      where: { email: userData.email }
    });
    if (existingEmail) {
      const error = new Error('Email already exists');
      error.statusCode = 400;
      throw error;
    }

    // Validate role exists
    const role = await Role.findByPk(userData.role_id);
    if (!role) {
      const error = new Error('Role not found');
      error.statusCode = 400;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const newUser = await User.create({
      username: userData.username,
      email: userData.email,
      password_hash: hashedPassword,
      role_id: userData.role_id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone,
      is_active: true
    });

    // Fetch with associations (exclude password)
    const createdUser = await User.findByPk(newUser.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    // Audit log (exclude password)
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'users',
      resource_id: newUser.id,
      details: {
        username: newUser.username,
        email: newUser.email,
        role_id: newUser.role_id
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return createdUser;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

/**
 * Update user
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} userId - User UUID
 * @param {Object} updateData - Update data
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated user
 */
async function updateUser(user, userId, updateData, requestMetadata = {}) {
  try {
    const targetUser = await User.findByPk(userId);

    if (!targetUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Admin can update any user, users can update own profile (limited fields)
    const isAdmin = user.role.name === 'ADMIN';
    const isOwnProfile = user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      const error = new Error('Access denied: You can only update your own profile');
      error.statusCode = 403;
      throw error;
    }

    // Track changes for audit
    const changes = {};
    let allowedFields;

    if (isAdmin) {
      // Admin can update all fields except password (use separate endpoint)
      allowedFields = ['username', 'email', 'role_id', 'first_name', 'last_name', 'phone', 'is_active'];
    } else {
      // Regular users can only update their own basic info
      allowedFields = ['first_name', 'last_name', 'phone', 'email'];
    }

    // Check if email is being changed and if it's already taken
    if (updateData.email && updateData.email !== targetUser.email) {
      const existingEmail = await User.findOne({
        where: { email: updateData.email, id: { [Op.ne]: userId } }
      });
      if (existingEmail) {
        const error = new Error('Email already exists');
        error.statusCode = 400;
        throw error;
      }
    }

    // Check if username is being changed and if it's already taken
    if (updateData.username && updateData.username !== targetUser.username) {
      const existingUser = await User.findOne({
        where: { username: updateData.username, id: { [Op.ne]: userId } }
      });
      if (existingUser) {
        const error = new Error('Username already exists');
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate role if being updated
    if (updateData.role_id && isAdmin) {
      const role = await Role.findByPk(updateData.role_id);
      if (!role) {
        const error = new Error('Role not found');
        error.statusCode = 400;
        throw error;
      }
    }
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== targetUser[field]) {
        changes[field] = { old: targetUser[field], new: updateData[field] };
        targetUser[field] = updateData[field];
      }
    });

    await targetUser.save();

    // Fetch with associations (exclude password)
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'users',
      resource_id: userId,
      details: { changes, target_username: targetUser.username },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return updatedUser;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
}

/**
 * Delete user (soft delete - set is_active=false)
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} userId - User UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<void>}
 */
async function deleteUser(user, userId, requestMetadata = {}) {
  try {
    const targetUser = await User.findByPk(userId);

    if (!targetUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Cannot delete self
    if (user.id === userId) {
      const error = new Error('Cannot delete your own account');
      error.statusCode = 400;
      throw error;
    }

    // Soft delete - set is_active to false
    targetUser.is_active = false;
    await targetUser.save();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'users',
      resource_id: userId,
      details: { target_username: targetUser.username },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });
  } catch (error) {
    console.error('Error in deleteUser:', error.message);
    throw error;
  }
}

/**
 * Change user password
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} userId - User UUID
 * @param {string} oldPassword - Current password (required if not admin)
 * @param {string} newPassword - New password
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<void>}
 */
async function changePassword(user, userId, oldPassword, newPassword, requestMetadata = {}) {
  try {
    const targetUser = await User.findByPk(userId);

    if (!targetUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = user.role.name === 'ADMIN';
    const isOwnPassword = user.id === userId;

    // RBAC: Admin can reset any password, users can change own password
    if (!isAdmin && !isOwnPassword) {
      const error = new Error('Access denied: You can only change your own password');
      error.statusCode = 403;
      throw error;
    }

    // If not admin, verify old password
    if (!isAdmin && isOwnPassword) {
      if (!oldPassword) {
        const error = new Error('Old password is required');
        error.statusCode = 400;
        throw error;
      }

      const isValidPassword = await bcrypt.compare(oldPassword, targetUser.password_hash);
      if (!isValidPassword) {
        const error = new Error('Old password is incorrect');
        error.statusCode = 400;
        throw error;
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and reset failed login attempts
    targetUser.password_hash = hashedPassword;
    targetUser.failed_login_attempts = 0;
    targetUser.locked_until = null;
    await targetUser.save();

    // Audit log (don't include passwords)
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'PASSWORD_CHANGE',
      resource_type: 'users',
      resource_id: userId,
      details: {
        target_username: targetUser.username,
        reset_by_admin: isAdmin && !isOwnPassword
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
    throw error;
  }
}

/**
 * Toggle user active status
 * 
 * @param {Object} user - Authenticated user object
 * @param {string} userId - User UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated user
 */
async function toggleUserStatus(user, userId, requestMetadata = {}) {
  try {
    const targetUser = await User.findByPk(userId);

    if (!targetUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Cannot toggle own status
    if (user.id === userId) {
      const error = new Error('Cannot toggle your own account status');
      error.statusCode = 400;
      throw error;
    }

    // Toggle status
    targetUser.is_active = !targetUser.is_active;
    await targetUser.save();

    // Fetch with associations (exclude password)
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: targetUser.is_active ? 'ACTIVATE' : 'DEACTIVATE',
      resource_type: 'users',
      resource_id: userId,
      details: {
        target_username: targetUser.username,
        new_status: targetUser.is_active
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent
    });

    return updatedUser;
  } catch (error) {
    console.error('Error in toggleUserStatus:', error);
    throw error;
  }
}

/**
 * Get all active dietitians (for visit assignment)
 * 
 * @returns {Promise<Array>} Array of dietitian users with their roles
 */
async function getDietitians() {
  try {
    console.log('🔍 getDietitians() - Querying for active users with DIETITIAN or ADMIN roles...');
    
    // First, let's see all active users
    const allActiveUsers = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'username', 'first_name', 'last_name', 'role_id'],
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      }]
    });
    
    console.log(`🔍 All active users (${allActiveUsers.length}):`);
    allActiveUsers.forEach(u => {
      console.log(`   - ${u.username}: role_id=${u.role_id}, role.name=${u.role?.name}`);
    });

    // Now fetch only dietitians and admins
    const dietitians = await User.findAll({
      where: {
        is_active: true
      },
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          where: {
            name: { [Op.in]: ['DIETITIAN', 'ADMIN'] }
          },
          required: true,  // Explicit INNER JOIN
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });

    console.log(`✅ getDietitians() - Found ${dietitians.length} dietitians/admins:`);
    dietitians.forEach(u => {
      console.log(`   - ${u.username}: role=${u.role?.name}, is_active=${u.is_active}`);
    });

    return dietitians;
  } catch (error) {
    console.error('🔥 Error in getDietitians:', error.message);
    console.error('🔥 Stack:', error.stack);
    throw error;
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  toggleUserStatus,
  getDietitians
};
