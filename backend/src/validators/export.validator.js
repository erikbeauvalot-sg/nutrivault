/**
 * Export Validation Rules
 *
 * Input validation for data export endpoints
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
 * Validation rules for export format
 */
const validateExportFormat = [
  query('format')
    .optional()
    .isIn(['csv', 'excel', 'xlsx', 'pdf'])
    .withMessage('Format must be one of: csv, excel, xlsx, pdf'),

  handleValidationErrors
];

/**
 * Validation rules for patient export filters
 */
const validatePatientExport = [
  query('format')
    .optional()
    .isIn(['csv', 'excel', 'xlsx', 'pdf'])
    .withMessage('Format must be one of: csv, excel, xlsx, pdf'),

  query('is_active')
    .optional()
    .isString()
    .isIn(['true', 'false', '1', '0', 'TRUE', 'FALSE'])
    .withMessage('is_active must be a boolean string'),

  handleValidationErrors
];

/**
 * Validation rules for visit export filters
 */
const validateVisitExport = [
  query('format')
    .optional()
    .isIn(['csv', 'excel', 'xlsx', 'pdf'])
    .withMessage('Format must be one of: csv, excel, xlsx, pdf'),

  query('patient_id')
    .optional()
    .isUUID()
    .withMessage('patient_id must be a valid UUID'),

  query('status')
    .optional()
    .isIn(['scheduled', 'completed', 'cancelled', 'no-show'])
    .withMessage('status must be one of: scheduled, completed, cancelled, no-show'),

  handleValidationErrors
];

/**
 * Validation rules for billing export filters
 */
const validateBillingExport = [
  query('format')
    .optional()
    .isIn(['csv', 'excel', 'xlsx', 'pdf'])
    .withMessage('Format must be one of: csv, excel, xlsx, pdf'),

  query('patient_id')
    .optional()
    .isUUID()
    .withMessage('patient_id must be a valid UUID'),

  query('status')
    .optional()
    .isIn(['pending', 'paid', 'overdue', 'cancelled'])
    .withMessage('status must be one of: pending, paid, overdue, cancelled'),

  handleValidationErrors
];

module.exports = {
  validateExportFormat,
  validatePatientExport,
  validateVisitExport,
  validateBillingExport
};
