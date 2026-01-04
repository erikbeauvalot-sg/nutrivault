/**
 * Patient Validation Rules
 *
 * Input validation for patient management endpoints
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
 * Validation rules for creating a patient
 */
const validatePatientCreation = [
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

  body('date_of_birth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid date')
    .toDate()
    .custom((value) => {
      const age = (new Date() - new Date(value)) / (1000 * 60 * 60 * 24 * 365);
      if (age < 0 || age > 120) {
        throw new Error('Age must be between 0 and 120 years');
      }
      return true;
    }),

  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .withMessage('Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+\d\s()-]+$/).withMessage('Phone number can only contain digits, spaces, +, -, ( )')
    .isLength({ max: 20 }).withMessage('Phone number must not exceed 20 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City must not exceed 100 characters'),

  body('postal_code')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Postal code must not exceed 20 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters'),

  body('emergency_contact_name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Emergency contact name must not exceed 200 characters'),

  body('emergency_contact_phone')
    .optional()
    .trim()
    .matches(/^[+\d\s()-]+$/).withMessage('Emergency phone can only contain digits, spaces, +, -, ( )')
    .isLength({ max: 20 }).withMessage('Emergency phone must not exceed 20 characters'),

  body('medical_notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Medical notes must not exceed 5000 characters'),

  body('dietary_preferences')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Dietary preferences must not exceed 2000 characters'),

  body('allergies')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Allergies must not exceed 2000 characters'),

  body('assigned_dietitian_id')
    .optional()
    .isUUID().withMessage('Assigned dietitian ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation rules for updating a patient
 */
const validatePatientUpdate = [
  param('id')
    .isUUID().withMessage('Patient ID must be a valid UUID'),

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

  body('date_of_birth')
    .optional()
    .isISO8601().withMessage('Date of birth must be a valid date')
    .toDate()
    .custom((value) => {
      const age = (new Date() - new Date(value)) / (1000 * 60 * 60 * 24 * 365);
      if (age < 0 || age > 120) {
        throw new Error('Age must be between 0 and 120 years');
      }
      return true;
    }),

  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .withMessage('Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+\d\s()-]+$/).withMessage('Phone number can only contain digits, spaces, +, -, ( )')
    .isLength({ max: 20 }).withMessage('Phone number must not exceed 20 characters'),

  body('assigned_dietitian_id')
    .optional()
    .isUUID().withMessage('Assigned dietitian ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation rules for patient ID parameter
 */
const validatePatientId = [
  param('id')
    .isUUID().withMessage('Patient ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation rules for patient query parameters
 */
const validatePatientQuery = [
  query('assigned_dietitian_id')
    .optional()
    .isUUID().withMessage('Assigned dietitian ID must be a valid UUID'),

  query('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search term must not exceed 200 characters'),

  query('age_min')
    .optional()
    .isInt({ min: 0, max: 120 }).withMessage('Minimum age must be between 0 and 120'),

  query('age_max')
    .optional()
    .isInt({ min: 0, max: 120 }).withMessage('Maximum age must be between 0 and 120'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),

  query('sort_by')
    .optional()
    .isIn(['created_at', 'updated_at', 'first_name', 'last_name', 'date_of_birth'])
    .withMessage('Invalid sort_by field'),

  query('sort_order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Sort order must be ASC or DESC'),

  handleValidationErrors
];

module.exports = {
  validatePatientCreation,
  validatePatientUpdate,
  validatePatientId,
  validatePatientQuery,
  handleValidationErrors
};
