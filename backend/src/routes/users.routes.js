/**
 * User Management Routes
 *
 * Routes for user management endpoints
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireOwnerOrPermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  validateUserUpdate,
  validateUserId,
  validateUserQuery
} = require('../validators/user.validator');
const { validatePasswordChange } = require('../validators/auth.validator');
const {
  validateDocumentUpload,
  validateResourceId
} = require('../validators/document.validator');
const { upload, setUploadResourceType } = require('../config/multer');

/**
 * All routes require authentication and rate limiting
 */
router.use(authenticate);
router.use(apiLimiter);

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
  validateUserQuery,
  userController.getUsersHandler
);

/**
 * Get user by ID
 * Users can view their own profile, or need users.read permission
 */
router.get('/:id',
  requireOwnerOrPermission('id', 'users.read'),
  validateUserId,
  userController.getUserByIdHandler
);

/**
 * Update user
 * Users can update their own basic info, or need users.update permission
 * Note: Role changes always require users.update permission (handled in service)
 */
router.put('/:id',
  requireOwnerOrPermission('id', 'users.update'),
  validateUserUpdate,
  userController.updateUserHandler
);

/**
 * Change user password
 * Users can change their own password, or admins can reset others' passwords
 */
router.put('/:id/password',
  requireOwnerOrPermission('id', 'users.update'),
  validateUserId,
  validatePasswordChange,
  userController.changePasswordHandler
);

/**
 * Activate user
 * Requires users.update permission
 */
router.put('/:id/activate',
  requirePermission('users.update'),
  validateUserId,
  userController.activateUserHandler
);

/**
 * Deactivate user
 * Requires users.delete permission
 */
router.put('/:id/deactivate',
  requirePermission('users.delete'),
  validateUserId,
  userController.deactivateUserHandler
);

/**
 * Delete user (soft delete via deactivation)
 * Requires users.delete permission
 */
router.delete('/:id',
  requirePermission('users.delete'),
  validateUserId,
  userController.deleteUserHandler
);

/**
 * Document Management Routes for Users
 * (Profile photos, credentials, etc.)
 */

// Middleware to set resource type for documents
const setUserResourceType = (req, res, next) => {
  req.resourceType = 'users';
  next();
};

/**
 * Get document statistics for a user
 */
router.get('/:id/documents/stats',
  requireOwnerOrPermission('id', 'documents.read'),
  validateResourceId,
  setUserResourceType,
  documentController.getDocumentStatsHandler
);

/**
 * Upload documents for a user
 * Users can upload their own documents (e.g., profile photo)
 */
router.post('/:id/documents',
  requireOwnerOrPermission('id', 'documents.upload'),
  setUploadResourceType('users'),
  setUserResourceType,
  upload.array('files', 10),
  validateDocumentUpload,
  documentController.uploadDocumentsHandler
);

/**
 * Get all documents for a user
 */
router.get('/:id/documents',
  requireOwnerOrPermission('id', 'documents.read'),
  validateResourceId,
  setUserResourceType,
  documentController.getResourceDocumentsHandler
);

module.exports = router;
