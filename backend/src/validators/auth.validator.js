/**
 * Authentication Validation Rules
 *
 * Input validation for authentication endpoints
 */

const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('role_id')
    .optional()
    .isUUID().withMessage('Role ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation rules for login
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors
];

/**
 * Validation rules for token refresh
 */
const validateRefreshToken = [
  body('refresh_token')
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Refresh token must be a string'),

  handleValidationErrors
];

/**
 * Validation rules for API key creation
 */
const validateApiKeyCreation = [
  body('name')
    .trim()
    .notEmpty().withMessage('API key name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),

  body('expires_at')
    .optional()
    .isISO8601().withMessage('Expiration date must be a valid ISO 8601 date')
    .toDate()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('current_password')
    .notEmpty().withMessage('Current password is required'),

  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
    .custom((value, { req }) => {
      if (value === req.body.current_password) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateApiKeyCreation,
  validatePasswordChange,
  handleValidationErrors
};
