/**
 * User Management Routes
 *
 * Routes for user management endpoints
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireOwnerOrPermission } = require('../middleware/rbac');

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * Get user statistics
 * Must come before /:id routes to avoid conflicts
 */
router.get('/stats',
  requirePermission('users.read'),
  userController.getUserStatsHandler
);

/**
 * Get all users
 */
router.get('/',
  requirePermission('users.read'),
  userController.getUsersHandler
);

/**
 * Get user by ID
 * Users can view their own profile, or need users.read permission
 */
router.get('/:id',
  requireOwnerOrPermission('id', 'users.read'),
  userController.getUserByIdHandler
);

/**
 * Update user
 * Users can update their own basic info, or need users.update permission
 * Note: Role changes always require users.update permission (handled in service)
 */
router.put('/:id',
  requireOwnerOrPermission('id', 'users.update'),
  userController.updateUserHandler
);

/**
 * Change user password
 * Users can change their own password, or admins can reset others' passwords
 */
router.put('/:id/password',
  requireOwnerOrPermission('id', 'users.update'),
  userController.changePasswordHandler
);

/**
 * Activate user
 * Requires users.update permission
 */
router.put('/:id/activate',
  requirePermission('users.update'),
  userController.activateUserHandler
);

/**
 * Deactivate user
 * Requires users.delete permission
 */
router.put('/:id/deactivate',
  requirePermission('users.delete'),
  userController.deactivateUserHandler
);

/**
 * Delete user (soft delete via deactivation)
 * Requires users.delete permission
 */
router.delete('/:id',
  requirePermission('users.delete'),
  userController.deleteUserHandler
);

module.exports = router;
