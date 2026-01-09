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
  
  validate
];

/**
 * Validation rules for patient ID parameter
 */
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
  patientController.getAllPatients
);

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
