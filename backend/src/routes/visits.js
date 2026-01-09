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
    .optional()
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
  
  body('chief_complaint')
    .optional()
    .isString()
    .withMessage('Chief complaint must be a string'),
  
  body('assessment')
    .optional()
    .isString()
    .withMessage('Assessment must be a string'),
  
  body('recommendations')
    .optional()
    .isString()
    .withMessage('Recommendations must be a string'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  
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
    .optional()
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
  
  body('chief_complaint')
    .optional()
    .isString()
    .withMessage('Chief complaint must be a string'),
  
  body('assessment')
    .optional()
    .isString()
    .withMessage('Assessment must be a string'),
  
  body('recommendations')
    .optional()
    .isString()
    .withMessage('Recommendations must be a string'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  
  body('next_visit_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Next visit date must be a valid ISO 8601 date')
];

/**
 * Validation rules for adding measurements
 * Beta feature: All fields are optional - any combination can be recorded
 */
const addMeasurementsValidation = [
  body('weight_kg')
    .optional({ checkFalsy: true })
    .isFloat({ min: 1, max: 500 })
    .withMessage('Weight must be between 1 and 500 kg'),
  
  body('height_cm')
    .optional({ checkFalsy: true })
    .isFloat({ min: 30, max: 300 })
    .withMessage('Height must be between 30 and 300 cm'),
  
  body('bmi')
    .optional({ checkFalsy: true })
    .isFloat({ min: 10, max: 100 })
    .withMessage('BMI must be between 10 and 100'),
  
  body('blood_pressure_systolic')
    .optional({ checkFalsy: true })
    .isInt({ min: 50, max: 300 })
    .withMessage('Systolic blood pressure must be between 50 and 300 mmHg'),
  
  body('blood_pressure_diastolic')
    .optional({ checkFalsy: true })
    .isInt({ min: 30, max: 200 })
    .withMessage('Diastolic blood pressure must be between 30 and 200 mmHg'),
  
  body('waist_circumference_cm')
    .optional({ checkFalsy: true })
    .isFloat({ min: 20, max: 300 })
    .withMessage('Waist circumference must be between 20 and 300 cm'),
  
  body('body_fat_percentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 1, max: 80 })
    .withMessage('Body fat percentage must be between 1 and 80%'),
  
  body('muscle_mass_percentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 10, max: 90 })
    .withMessage('Muscle mass percentage must be between 10 and 90%'),
  
  body('notes')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Notes must be a string')
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

// POST /api/visits/:id/measurements - Add measurements to visit
router.post(
  '/:id/measurements',
  authenticate,
  requirePermission('visits.update'),
  uuidParamValidation,
  addMeasurementsValidation,
  validate,
  visitController.addMeasurements
);

module.exports = router;
