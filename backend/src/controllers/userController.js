/**
 * User Controller
 * 
 * HTTP request handlers for user management.
 * Thin controllers that delegate business logic to user service.
 */

const userService = require('../services/user.service');

/**
 * Extract request metadata for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/users - Get all users (Admin only)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      search: req.query.search,
      role_id: req.query.role_id,
      is_active: req.query.is_active,
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await userService.getUsers(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.users,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id - Get user by ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = req.params.id;
    const requestMetadata = getRequestMetadata(req);

    const targetUser = await userService.getUserById(user, userId, requestMetadata);

    res.json({
      success: true,
      data: targetUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users - Create new user (Admin only)
 */
exports.createUser = async (req, res, next) => {
  try {
    const user = req.user;
    const userData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const newUser = await userService.createUser(user, userData, requestMetadata);

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id - Update user
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = req.params.id;
    const updateData = req.body;
    const requestMetadata = getRequestMetadata(req);

    const updatedUser = await userService.updateUser(user, userId, updateData, requestMetadata);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id - Delete user (Admin only)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = req.params.id;
    const requestMetadata = getRequestMetadata(req);

    await userService.deleteUser(user, userId, requestMetadata);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/password - Change user password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = req.params.id;
    const { oldPassword, newPassword } = req.body;
    const requestMetadata = getRequestMetadata(req);

    await userService.changePassword(user, userId, oldPassword, newPassword, requestMetadata);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/toggle-status - Toggle user active status (Admin only)
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = req.params.id;
    const requestMetadata = getRequestMetadata(req);

    const updatedUser = await userService.toggleUserStatus(user, userId, requestMetadata);

    res.json({
      success: true,
      data: updatedUser,
      message: `User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};
/**
 * GET /api/users/list/dietitians - Get all active dietitians
 * Accessible to authenticated users (for visit assignment)
 */
exports.getDietitians = async (req, res, next) => {
  try {
    const result = await userService.getDietitians();
    
    console.log('👥 getDietitians() result:', {
      count: result.length,
      firstRecord: result[0] ? {
        id: result[0].id,
        username: result[0].username,
        role: result[0].role?.name
      } : null
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('🔥 Error in getDietitians:', error.message);
    next(error);
  }
};

/**
 * GET /api/users/roles - Get all available roles
 */
exports.getRoles = async (req, res, next) => {
  try {
    const requestMetadata = getRequestMetadata(req);
    const roles = await userService.getRoles();

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('🔥 Error in getRoles:', error.message);
    next(error);
  }
};
