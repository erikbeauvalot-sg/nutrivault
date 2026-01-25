/**
 * Visit Routes
 * 
 * All routes require authentication and appropriate permissions.
 * RBAC enforced via middleware and service layer.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const visitController = require('../controllers/visitController');
const visitCustomFieldController = require('../controllers/visitCustomFieldController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

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
 * Validation rules for creating a visit
 */
const createVisitValidation = [
  body('patient_id')
    .notEmpty()
    .withMessage('Patient ID is required')
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),
  
  body('dietitian_id')
    .notEmpty()
    .withMessage('Dietitian ID is required')
    .isUUID()
    .withMessage('Dietitian ID must be a valid UUID'),
  
  body('visit_date')
    .notEmpty()
    .withMessage('Visit date is required')
    .isISO8601()
    .withMessage('Visit date must be a valid ISO 8601 date'),
  
  body('visit_type')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Visit type must be a string')
    .isLength({ max: 50 })
    .withMessage('Visit type must be less than 50 characters'),
  
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),

  // Clinical fields (chief_complaint, assessment, recommendations, notes) removed
  // Now managed via custom fields

  body('next_visit_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Next visit date must be a valid ISO 8601 date')
];

/**
 * Validation rules for updating a visit
 */
const updateVisitValidation = [
  body('visit_date')
    .optional()
    .isISO8601()
    .withMessage('Visit date must be a valid ISO 8601 date'),
  
  body('visit_type')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Visit type must be a string')
    .isLength({ max: 50 })
    .withMessage('Visit type must be less than 50 characters'),
  
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW'),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),

  // Clinical fields (chief_complaint, assessment, recommendations, notes) removed
  // Now managed via custom fields

  body('next_visit_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Next visit date must be a valid ISO 8601 date')
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
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  query('patient_id')
    .optional()
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),
  
  query('dietitian_id')
    .optional()
    .isUUID()
    .withMessage('Dietitian ID must be a valid UUID'),
  
  query('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW'),
  
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

/**
 * Routes
 */

// GET /api/visits - Get all visits
router.get(
  '/',
  authenticate,
  requirePermission('visits.read'),
  queryValidation,
  validate,
  visitController.getAllVisits
);

// GET /api/visits/:id - Get visit by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('visits.read'),
  uuidParamValidation,
  validate,
  visitController.getVisitById
);

// POST /api/visits - Create new visit
router.post(
  '/',
  authenticate,
  requirePermission('visits.create'),
  createVisitValidation,
  validate,
  visitController.createVisit
);

// PUT /api/visits/:id - Update visit
router.put(
  '/:id',
  authenticate,
  requirePermission('visits.update'),
  uuidParamValidation,
  updateVisitValidation,
  validate,
  visitController.updateVisit
);

// DELETE /api/visits/:id - Delete visit
router.delete(
  '/:id',
  authenticate,
  requirePermission('visits.delete'),
  uuidParamValidation,
  validate,
  visitController.deleteVisit
);

// POST /api/visits/:id/finish-and-invoice - Complete visit and generate invoice with email
router.post(
  '/:id/finish-and-invoice',
  authenticate,
  requirePermission('visits.update'),
  uuidParamValidation,
  validate,
  visitController.finishAndInvoice
);

// GET /api/visits/:visitId/custom-fields - Get custom field values for visit
router.get(
  '/:visitId/custom-fields',
  authenticate,
  requirePermission('visits.read'),
  [param('visitId').isUUID().withMessage('Visit ID must be a valid UUID')],
  validate,
  visitCustomFieldController.getVisitCustomFields
);

// PUT /api/visits/:visitId/custom-fields - Bulk update custom field values for visit
router.put(
  '/:visitId/custom-fields',
  authenticate,
  requirePermission('visits.update'),
  [
    param('visitId').isUUID().withMessage('Visit ID must be a valid UUID'),
    body('fields').isArray().withMessage('Fields must be an array')
  ],
  validate,
  visitCustomFieldController.bulkUpdateVisitFields
);

// DELETE /api/visits/:visitId/custom-fields/:fieldValueId - Delete custom field value for visit
router.delete(
  '/:visitId/custom-fields/:fieldValueId',
  authenticate,
  requirePermission('visits.update'),
  [
    param('visitId').isUUID().withMessage('Visit ID must be a valid UUID'),
    param('fieldValueId').isUUID().withMessage('Field value ID must be a valid UUID')
  ],
  validate,
  visitCustomFieldController.deleteVisitCustomField
);

// GET /api/visits/:visitId/email-logs - Get email logs related to a visit
const emailLogController = require('../controllers/emailLogController');
router.get(
  '/:visitId/email-logs',
  authenticate,
  requirePermission('visits.read'),
  [param('visitId').isUUID().withMessage('Visit ID must be a valid UUID')],
  validate,
  emailLogController.getVisitEmailLogs
);

module.exports = router;
