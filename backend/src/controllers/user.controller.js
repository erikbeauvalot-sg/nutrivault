/**
 * User Management Controller
 *
 * Handles HTTP requests for user management endpoints
 */

const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  activateUser,
  deactivateUser,
  getUserStats
} = require('../services/user.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get all users
 * GET /api/users
 */
const getUsersHandler = asyncHandler(async (req, res) => {
  // Pass all query parameters to service for QueryBuilder processing
  const filters = req.query;

  const result = await getUsers(filters);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserByIdHandler = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * Update user
 * PUT /api/users/:id
 */
const updateUserHandler = asyncHandler(async (req, res) => {
  const updates = {
    email: req.body.email,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    role_id: req.body.role_id
  };

  const user = await updateUser(req.params.id, updates, req.user.id);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
});

/**
 * Delete user (soft delete)
 * DELETE /api/users/:id
 */
const deleteUserHandler = asyncHandler(async (req, res) => {
  const result = await deleteUser(req.params.id, req.user.id);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Change user password
 * PUT /api/users/:id/password
 */
const changePasswordHandler = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!new_password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'New password is required'
      }
    });
  }

  // If user is changing their own password, current password is required
  if (req.params.id === req.user.id && !current_password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Current password is required'
      }
    });
  }

  const result = await changePassword(
    req.params.id,
    current_password,
    new_password,
    req.user.id
  );

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Activate user
 * PUT /api/users/:id/activate
 */
const activateUserHandler = asyncHandler(async (req, res) => {
  const result = await activateUser(req.params.id, req.user.id);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Deactivate user
 * PUT /api/users/:id/deactivate
 */
const deactivateUserHandler = asyncHandler(async (req, res) => {
  const result = await deactivateUser(req.params.id, req.user.id);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * Get user statistics
 * GET /api/users/stats
 */
const getUserStatsHandler = asyncHandler(async (req, res) => {
  const stats = await getUserStats();

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deleteUserHandler,
  changePasswordHandler,
  activateUserHandler,
  deactivateUserHandler,
  getUserStatsHandler
};
