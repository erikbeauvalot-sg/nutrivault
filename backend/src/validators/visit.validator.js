/**
 * Visit Validation Rules
 *
 * Input validation for visit management endpoints
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
 * Validation rules for creating a visit
 */
const validateVisitCreation = [
  body('patient_id')
    .notEmpty().withMessage('Patient ID is required')
    .isUUID().withMessage('Patient ID must be a valid UUID'),

  body('dietitian_id')
    .optional()
    .isUUID().withMessage('Dietitian ID must be a valid UUID'),

  body('visit_date')
    .notEmpty().withMessage('Visit date is required')
    .isISO8601().withMessage('Visit date must be a valid date/time')
    .toDate(),

  body('duration_minutes')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5 and 480 minutes'),

  body('visit_type')
    .notEmpty().withMessage('Visit type is required')
    .isIn(['INITIAL_CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ONLINE', 'IN_PERSON'])
    .withMessage('Visit type must be one of: INITIAL_CONSULTATION, FOLLOW_UP, EMERGENCY, ONLINE, IN_PERSON'),

  body('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW'),

  body('chief_complaint')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Chief complaint must not exceed 2000 characters'),

  body('assessment')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Assessment must not exceed 5000 characters'),

  body('recommendations')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Recommendations must not exceed 5000 characters'),

  body('next_visit_date')
    .optional()
    .isISO8601().withMessage('Next visit date must be a valid date')
    .toDate(),

  body('private_notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Private notes must not exceed 5000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for updating a visit
 */
const validateVisitUpdate = [
  param('id')
    .isUUID().withMessage('Visit ID must be a valid UUID'),

  body('visit_date')
    .optional()
    .isISO8601().withMessage('Visit date must be a valid date/time')
    .toDate(),

  body('duration_minutes')
    .optional()
    .isInt({ min: 5, max: 480 }).withMessage('Duration must be between 5 and 480 minutes'),

  body('visit_type')
    .optional()
    .isIn(['INITIAL_CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ONLINE', 'IN_PERSON'])
    .withMessage('Visit type must be one of: INITIAL_CONSULTATION, FOLLOW_UP, EMERGENCY, ONLINE, IN_PERSON'),

  body('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW'),

  body('chief_complaint')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Chief complaint must not exceed 2000 characters'),

  body('assessment')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Assessment must not exceed 5000 characters'),

  body('recommendations')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Recommendations must not exceed 5000 characters'),

  body('next_visit_date')
    .optional()
    .isISO8601().withMessage('Next visit date must be a valid date')
    .toDate(),

  body('private_notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Private notes must not exceed 5000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for visit measurements
 */
const validateVisitMeasurements = [
  param('id')
    .isUUID().withMessage('Visit ID must be a valid UUID'),

  body('weight_kg')
    .optional()
    .isFloat({ min: 0.1, max: 500 }).withMessage('Weight must be between 0.1 and 500 kg'),

  body('height_cm')
    .optional()
    .isFloat({ min: 1, max: 300 }).withMessage('Height must be between 1 and 300 cm'),

  body('bmi')
    .optional()
    .isFloat({ min: 5, max: 100 }).withMessage('BMI must be between 5 and 100'),

  body('waist_circumference_cm')
    .optional()
    .isFloat({ min: 1, max: 300 }).withMessage('Waist circumference must be between 1 and 300 cm'),

  body('body_fat_percentage')
    .optional()
    .isFloat({ min: 1, max: 100 }).withMessage('Body fat percentage must be between 1 and 100'),

  body('blood_pressure_systolic')
    .optional()
    .isInt({ min: 40, max: 300 }).withMessage('Systolic blood pressure must be between 40 and 300'),

  body('blood_pressure_diastolic')
    .optional()
    .isInt({ min: 20, max: 200 }).withMessage('Diastolic blood pressure must be between 20 and 200'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Measurement notes must not exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for visit ID parameter
 */
const validateVisitId = [
  param('id')
    .isUUID().withMessage('Visit ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation rules for visit query parameters
 */
const validateVisitQuery = [
  query('patient_id')
    .optional()
    .isUUID().withMessage('Patient ID must be a valid UUID'),

  query('dietitian_id')
    .optional()
    .isUUID().withMessage('Dietitian ID must be a valid UUID'),

  query('from_date')
    .optional()
    .isISO8601().withMessage('From date must be a valid date'),

  query('to_date')
    .optional()
    .isISO8601().withMessage('To date must be a valid date'),

  query('status')
    .optional()
    .isIn(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW'),

  query('visit_type')
    .optional()
    .isIn(['INITIAL_CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ONLINE', 'IN_PERSON'])
    .withMessage('Visit type must be one of: INITIAL_CONSULTATION, FOLLOW_UP, EMERGENCY, ONLINE, IN_PERSON'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),

  query('sort_by')
    .optional()
    .isIn(['visit_date', 'created_at', 'updated_at'])
    .withMessage('Invalid sort_by field'),

  query('sort_order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Sort order must be ASC or DESC'),

  handleValidationErrors
];

module.exports = {
  validateVisitCreation,
  validateVisitUpdate,
  validateVisitMeasurements,
  validateVisitId,
  validateVisitQuery,
  handleValidationErrors
};
