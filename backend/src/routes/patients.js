/**
 * Patient Routes
 * 
 * All routes require authentication and appropriate permissions.
 * RBAC enforced via middleware and service layer.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const patientController = require('../controllers/patientController');
const patientTagController = require('../controllers/patientTagController');
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
 * Validation rules for creating a patient
 */
const createPatientValidation = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),
  
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .isDate()
    .withMessage('Invalid date format for date_of_birth'),
  
  body('gender')
    .optional({ checkFalsy: true })
    .isLength({ max: 20 })
    .withMessage('Gender must be less than 20 characters'),

  body('medical_conditions')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Medical conditions must be less than 2000 characters'),

  body('dietary_restrictions')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Dietary restrictions must be less than 1000 characters'),

  body('assigned_dietitian_id')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('assigned_dietitian_id must be a valid UUID'),

  validate
];

/**
 * Validation rules for updating a patient
 */
const updatePatientValidation = [
  param('id')
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),
  
  body('first_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('last_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),
  
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .isDate()
    .withMessage('Invalid date format for date_of_birth'),
  
  body('assigned_dietitian_id')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('assigned_dietitian_id must be a valid UUID'),
  
  body('gender')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Gender must be less than 20 characters'),
  
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  
  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must be less than 50 characters'),
  
  body('zip_code')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Zip code must be less than 20 characters'),
  
  body('emergency_contact_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Emergency contact name must be less than 200 characters'),
  
  body('emergency_contact_phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Emergency contact phone must be less than 20 characters'),
  
  body('medical_notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Medical notes must be less than 2000 characters'),

  body('medical_conditions')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Medical conditions must be less than 2000 characters'),
  
  body('allergies')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Allergies must be less than 1000 characters'),
  
  body('dietary_preferences')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Dietary preferences must be less than 1000 characters'),

  body('dietary_restrictions')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Dietary restrictions must be less than 1000 characters'),

  body('blood_type')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage('Blood type must be less than 10 characters'),

  body('current_medications')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Current medications must be less than 2000 characters'),

];

const patientIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),
  
  validate
];

/**
 * GET /api/patients - Get all patients
 * Requires: patients.read permission
 * ADMIN: sees all patients
 * DIETITIAN: sees only assigned patients
 * ASSISTANT: sees all patients (read-only)
 * VIEWER: sees all patients (read-only)
 */
router.get(
  '/',
  authenticate,
  requirePermission('patients.read'),
  query('search')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Search must be at least 1 character'),
  query('is_active')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string for "all"
      if (value === 'true' || value === 'false') return true;
      throw new Error('is_active must be true, false, or empty');
    }),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  patientController.getAllPatients
);

/**
 * Patient Tags Routes
 * NOTE: These specific routes MUST come before the /:id parameterized routes
 * to prevent Express from matching "tags" as a patient ID
 */

/**
 * GET /api/patients/tags - Get all available tags
 * Requires: patients.read permission
 */
router.get(
  '/tags',
  authenticate,
  requirePermission('patients.read'),
  patientTagController.getAllTags
);

/**
 * GET /api/patients/:patientId/tags - Get tags for a specific patient
 * Requires: patients.read permission
 */
router.get(
  '/:patientId/tags',
  authenticate,
  requirePermission('patients.read'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  validate,
  patientTagController.getPatientTags
);

/**
 * POST /api/patients/:patientId/tags - Add a tag to a patient
 * Requires: patients.update permission
 */
router.post(
  '/:patientId/tags',
  authenticate,
  requirePermission('patients.update'),
  patientTagController.validateAddTag,
  validate,
  patientTagController.addTag
);

/**
 * PUT /api/patients/:patientId/tags - Update all tags for a patient
 * Requires: patients.update permission
 */
router.put(
  '/:patientId/tags',
  authenticate,
  requirePermission('patients.update'),
  patientTagController.validateUpdateTags,
  validate,
  patientTagController.updatePatientTags
);

/**
 * DELETE /api/patients/:patientId/tags/:tagName - Remove a tag from a patient
 * Requires: patients.update permission
 */
router.delete(
  '/:patientId/tags/:tagName',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('tagName').isLength({ min: 1, max: 50 }).withMessage('Invalid tag name'),
  validate,
  patientTagController.removeTag
);

/**
 * Patient CRUD Routes
 * NOTE: These parameterized routes come AFTER specific routes
 */

/**
 * GET /api/patients/:id - Get patient by ID
 * Requires: patients.read permission
 * RBAC enforced in service layer (dietitian filtering)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('patients.read'),
  patientIdValidation,
  patientController.getPatientById
);

/**
 * GET /api/patients/:id/details - Get patient details with visits and measurements
 * Requires: patients.read permission
 * RBAC enforced in service layer (dietitian filtering)
 * Used for graphical patient dashboard view
 */
router.get(
  '/:id/details',
  authenticate,
  requirePermission('patients.read'),
  patientIdValidation,
  patientController.getPatientDetails
);

/**
 * POST /api/patients - Create new patient
 * Requires: patients.create permission
 * Only ADMIN and DIETITIAN can create patients
 */
router.post(
  '/',
  authenticate,
  requirePermission('patients.create'),
  createPatientValidation,
  patientController.createPatient
);

/**
 * PUT /api/patients/:id - Update patient
 * Requires: patients.update permission
 * Only ADMIN and DIETITIAN can update patients
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('patients.update'),
  updatePatientValidation,
  patientController.updatePatient
);

/**
 * DELETE /api/patients/:id - Delete patient (soft delete)
 * Requires: patients.delete permission
 * Only ADMIN and DIETITIAN can delete patients
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('patients.delete'),
  patientIdValidation,
  patientController.deletePatient
);

module.exports = router;
