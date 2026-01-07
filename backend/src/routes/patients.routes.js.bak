/**
 * Patient Management Routes
 *
 * Routes for patient management endpoints
 */

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  validatePatientCreation,
  validatePatientUpdate,
  validatePatientId,
  validatePatientQuery
} = require('../validators/patient.validator');
const {
  validateDocumentUpload,
  validateResourceId
} = require('../validators/document.validator');
const { upload, setUploadResourceType } = require('../config/multer');

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

/**
 * Document Management Routes for Patients
 */

// Middleware to set resource type for documents
const setPatientResourceType = (req, res, next) => {
  req.resourceType = 'patients';
  next();
};

/**
 * Get document statistics for a patient
 */
router.get('/:id/documents/stats',
  requirePermission('documents.read'),
  validateResourceId,
  setPatientResourceType,
  documentController.getDocumentStatsHandler
);

/**
 * Upload documents for a patient
 */
router.post('/:id/documents',
  requirePermission('documents.upload'),
  setUploadResourceType('patients'),
  setPatientResourceType,
  upload.array('files', 10),
  validateDocumentUpload,
  documentController.uploadDocumentsHandler
);

/**
 * Get all documents for a patient
 */
router.get('/:id/documents',
  requirePermission('documents.read'),
  validateResourceId,
  setPatientResourceType,
  documentController.getResourceDocumentsHandler
);

module.exports = router;
