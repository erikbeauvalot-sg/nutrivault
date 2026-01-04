/**
 * Visit Management Routes
 *
 * Routes for visit management endpoints
 */

const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visit.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  validateVisitCreation,
  validateVisitUpdate,
  validateVisitId,
  validateVisitQuery
} = require('../validators/visit.validator');

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

module.exports = router;
