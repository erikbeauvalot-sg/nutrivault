/**
 * User Validation Rules
 *
 * Input validation for user management endpoints
 */

const { body, query, param, validationResult } = require('express-validator');

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
 * Validation rules for user update
 */
const validateUserUpdate = [
  param('id')
    .isUUID().withMessage('User ID must be a valid UUID'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('role_id')
    .optional()
    .isUUID().withMessage('Role ID must be a valid UUID'),

  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),

  handleValidationErrors
];

/**
 * Validation rules for user ID parameter
 */
const validateUserId = [
  param('id')
    .isUUID().withMessage('User ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation rules for user query parameters
 */
const validateUserQuery = [
  query('role')
    .optional()
    .isIn(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'])
    .withMessage('Role must be one of: ADMIN, DIETITIAN, ASSISTANT, VIEWER'),

  query('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search term must not exceed 200 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),

  query('sort_by')
    .optional()
    .isIn(['created_at', 'updated_at', 'username', 'email', 'first_name', 'last_name'])
    .withMessage('Invalid sort_by field'),

  query('sort_order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Sort order must be ASC or DESC'),

  handleValidationErrors
];

module.exports = {
  validateUserUpdate,
  validateUserId,
  validateUserQuery,
  handleValidationErrors
};
