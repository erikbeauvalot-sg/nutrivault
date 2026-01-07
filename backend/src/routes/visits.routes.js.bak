/**
 * Visit Management Routes
 *
 * Routes for visit management endpoints
 */

const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visit.controller');
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  validateVisitCreation,
  validateVisitUpdate,
  validateVisitId,
  validateVisitQuery
} = require('../validators/visit.validator');
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
 * Get visit statistics
 * Must come before /:id routes to avoid conflicts
 */
router.get('/stats',
  requirePermission('visits.read'),
  visitController.getVisitStatsHandler
);

/**
 * Get all visits
 * Dietitians automatically see only visits for their assigned patients
 */
router.get('/',
  requirePermission('visits.list'),
  validateVisitQuery,
  visitController.getVisitsHandler
);

/**
 * Create new visit
 */
router.post('/',
  requirePermission('visits.create'),
  validateVisitCreation,
  visitController.createVisitHandler
);

/**
 * Get visit by ID
 * Service layer checks if dietitian has access to the patient
 */
router.get('/:id',
  requirePermission('visits.read'),
  validateVisitId,
  visitController.getVisitByIdHandler
);

/**
 * Update visit
 * Service layer checks if dietitian has access to the patient
 */
router.put('/:id',
  requirePermission('visits.update'),
  validateVisitUpdate,
  visitController.updateVisitHandler
);

/**
 * Delete visit
 * Service layer checks if dietitian has access to the patient
 */
router.delete('/:id',
  requirePermission('visits.delete'),
  validateVisitId,
  visitController.deleteVisitHandler
);

/**
 * Document Management Routes for Visits
 */

// Middleware to set resource type for documents
const setVisitResourceType = (req, res, next) => {
  req.resourceType = 'visits';
  next();
};

/**
 * Get document statistics for a visit
 */
router.get('/:id/documents/stats',
  requirePermission('documents.read'),
  validateResourceId,
  setVisitResourceType,
  documentController.getDocumentStatsHandler
);

/**
 * Upload documents for a visit
 */
router.post('/:id/documents',
  requirePermission('documents.upload'),
  setUploadResourceType('visits'),
  setVisitResourceType,
  upload.array('files', 10),
  validateDocumentUpload,
  documentController.uploadDocumentsHandler
);

/**
 * Get all documents for a visit
 */
router.get('/:id/documents',
  requirePermission('documents.read'),
  validateResourceId,
  setVisitResourceType,
  documentController.getResourceDocumentsHandler
);

module.exports = router;
