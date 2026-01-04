/**
 * Patient Management Routes
 *
 * Routes for patient management endpoints
 */

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  validatePatientCreation,
  validatePatientUpdate,
  validatePatientId,
  validatePatientQuery
} = require('../validators/patient.validator');

/**
 * All routes require authentication and rate limiting
 */
router.use(authenticate);
router.use(apiLimiter);

/**
 * Get patient statistics
 * Must come before /:id routes to avoid conflicts
 */
router.get('/stats',
  requirePermission('patients.read'),
  patientController.getPatientStatsHandler
);

/**
 * Get all patients
 * Dietitians automatically see only their assigned patients
 */
router.get('/',
  requirePermission('patients.list'),
  validatePatientQuery,
  patientController.getPatientsHandler
);

/**
 * Create new patient
 */
router.post('/',
  requirePermission('patients.create'),
  validatePatientCreation,
  patientController.createPatientHandler
);

/**
 * Get patient by ID
 * Service layer checks if dietitian is assigned to this patient
 */
router.get('/:id',
  requirePermission('patients.read'),
  validatePatientId,
  patientController.getPatientByIdHandler
);

/**
 * Update patient
 * Service layer checks if dietitian is assigned to this patient
 */
router.put('/:id',
  requirePermission('patients.update'),
  validatePatientUpdate,
  patientController.updatePatientHandler
);

/**
 * Activate patient
 * Service layer checks if dietitian is assigned to this patient
 */
router.put('/:id/activate',
  requirePermission('patients.update'),
  validatePatientId,
  patientController.activatePatientHandler
);

/**
 * Deactivate patient
 * Service layer checks if dietitian is assigned to this patient
 */
router.put('/:id/deactivate',
  requirePermission('patients.delete'),
  validatePatientId,
  patientController.deactivatePatientHandler
);

/**
 * Delete patient (soft delete via deactivation)
 * Service layer checks if dietitian is assigned to this patient
 */
router.delete('/:id',
  requirePermission('patients.delete'),
  validatePatientId,
  patientController.deletePatientHandler
);

module.exports = router;
