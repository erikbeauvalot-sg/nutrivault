/**
 * Reports Validators
 *
 * Input validation for reporting endpoints
 */

const { query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validator');

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
