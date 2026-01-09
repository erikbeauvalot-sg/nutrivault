/**
 * User Routes
 * 
 * User management routes with role-based access control.
 * Most routes require ADMIN role, except viewing/updating own profile.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const { requireRole, requireOwnerOrRole } = require('../middleware/rbac');

/**
 * Validation middleware - check for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Password strength validation
 */
const passwordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

/**
 * Validation rules for creating a user
 */
const createUserValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom((value) => {
      if (!passwordStrength(value)) {
        throw new Error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character');
      }
      return true;
    }),
  
  body('role_id')
    .notEmpty()
    .withMessage('Role is required')
    .isUUID()
    .withMessage('Role ID must be a valid UUID'),
  
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters')
];

/**
 * Validation rules for updating a user
 */
const updateUserValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('role_id')
    .optional()
    .isUUID()
    .withMessage('Role ID must be a valid UUID'),
  
  body('first_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

/**
 * Validation rules for changing password
 */
const changePasswordValidation = [
  body('oldPassword')
    .optional()
    .isString()
    .withMessage('Old password must be a string'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .custom((value) => {
      if (!passwordStrength(value)) {
        throw new Error('New password must be at least 8 characters and contain uppercase, lowercase, number, and special character');
      }
      return true;
    })
];

/**
 * Validation for UUID parameters
 */
const uuidParamValidation = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID')
];

/**
 * Validation for query parameters
 */
const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('role_id')
    .optional()
    .isUUID()
    .withMessage('Role ID must be a valid UUID'),
  
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

/**
 * Middleware to check if user is owner or admin
 */
const checkOwnerOrAdmin = (req, res, next) => {
  const user = req.user;
  const targetUserId = req.params.id;

  if (user.role.name === 'ADMIN' || user.id === targetUserId) {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Access denied: You can only access your own profile'
    });
  }
};

/**
 * Routes
 */

// GET /api/users - Get all users (Admin only)
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  queryValidation,
  validate,
  userController.getAllUsers
);

// GET /api/users/:id - Get user by ID (Admin or own profile)
router.get(
  '/:id',
  authenticate,
  uuidParamValidation,
  validate,
  checkOwnerOrAdmin,
  userController.getUserById
);

// POST /api/users - Create new user (Admin only)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  createUserValidation,
  validate,
  userController.createUser
);

// PUT /api/users/:id - Update user (Admin or own profile with limited fields)
router.put(
  '/:id',
  authenticate,
  uuidParamValidation,
  updateUserValidation,
  validate,
  checkOwnerOrAdmin,
  userController.updateUser
);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  uuidParamValidation,
  validate,
  userController.deleteUser
);

// PUT /api/users/:id/password - Change password (Admin or own password)
router.put(
  '/:id/password',
  authenticate,
  uuidParamValidation,
  changePasswordValidation,
  validate,
  checkOwnerOrAdmin,
  userController.changePassword
);

// PUT /api/users/:id/toggle-status - Toggle user status (Admin only)
router.put(
  '/:id/toggle-status',
  authenticate,
  requireRole('ADMIN'),
  uuidParamValidation,
  validate,
  userController.toggleUserStatus
);

module.exports = router;
