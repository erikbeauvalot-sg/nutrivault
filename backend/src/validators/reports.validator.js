/**
 * Reports Validators
 *
 * Input validation for reporting endpoints
 */

const { query, validationResult } = require('express-validator');

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
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }

  next();
};

/**
 * Validate date range query parameters
 */
const validateDateRange = [
  query('from_date')
    .optional()
    .isISO8601()
    .withMessage('from_date must be a valid ISO 8601 date'),

  query('to_date')
    .optional()
    .isISO8601()
    .withMessage('to_date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.from_date && value < req.query.from_date) {
        throw new Error('to_date must be after from_date');
      }
      return true;
    }),

  handleValidationErrors
];

module.exports = {
  validateDateRange
};
