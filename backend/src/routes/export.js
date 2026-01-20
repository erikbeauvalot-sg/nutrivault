/**
 * Export Routes
 *
 * Handles data export requests for patients, visits, and billing.
 * All routes require authentication and appropriate export permissions.
 * Rate limited to 10 exports per hour per user.
 */

const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const exportController = require('../controllers/export.controller');
const authenticate = require('../middleware/authenticate');
const { requireAnyPermission } = require('../middleware/rbac');
const { exportLimiter } = require('../middleware/rateLimiter');

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
 * Validation rules for export format
 */
const formatValidation = [
  query('format')
    .optional()
    .isIn(['csv', 'excel', 'pdf'])
    .withMessage('Format must be csv, excel, or pdf')
];

/**
 * @route GET /api/export/patients
 * @desc Export patients data
 * @access Private (requires exports.csv OR exports.excel OR exports.pdf)
 */
router.get(
  '/patients',
  authenticate,
  requireAnyPermission(['exports.csv', 'exports.excel', 'exports.pdf']),
  exportLimiter,
  formatValidation,
  validate,
  exportController.exportPatients
);

/**
 * @route GET /api/export/visits
 * @desc Export visits data
 * @access Private (requires exports.csv OR exports.excel OR exports.pdf)
 */
router.get(
  '/visits',
  authenticate,
  requireAnyPermission(['exports.csv', 'exports.excel', 'exports.pdf']),
  exportLimiter,
  [
    ...formatValidation,
    query('patient_id')
      .optional()
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),
    query('status')
      .optional()
      .isIn(['scheduled', 'completed', 'cancelled', 'no-show'])
      .withMessage('Status must be scheduled, completed, cancelled, or no-show')
  ],
  validate,
  exportController.exportVisits
);

/**
 * @route GET /api/export/billing
 * @desc Export billing data
 * @access Private (requires exports.csv OR exports.excel OR exports.pdf)
 */
router.get(
  '/billing',
  authenticate,
  requireAnyPermission(['exports.csv', 'exports.excel', 'exports.pdf']),
  exportLimiter,
  [
    ...formatValidation,
    query('patient_id')
      .optional()
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),
    query('status')
      .optional()
      .isIn(['pending', 'paid', 'overdue', 'cancelled'])
      .withMessage('Status must be pending, paid, overdue, or cancelled')
  ],
  validate,
  exportController.exportBilling
);

module.exports = router;