/**
 * Patient Measures Routes
 *
 * Routes for logging and querying patient measure values.
 * Sprint 3: US-5.3.2 - Log Measure Values
 */

const express = require('express');
const router = express.Router();
const patientMeasureController = require('../controllers/patientMeasureController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * POST /api/patients/:patientId/measures
 * Log a new measure for a patient
 * Permission: measures:create
 */
router.post(
  '/patients/:patientId/measures',
  authenticate,
  requirePermission('measures.create'),
  patientMeasureController.logMeasure
);

/**
 * GET /api/patients/:patientId/measures
 * Get all measures for a patient
 * Permission: measures:read
 *
 * Query params:
 * - measure_definition_id: Filter by measure type
 * - visit_id: Filter by visit
 * - start_date: Start of date range (ISO format)
 * - end_date: End of date range (ISO format)
 * - limit: Max number of results (default 100)
 */
router.get(
  '/patients/:patientId/measures',
  authenticate,
  requirePermission('measures.read'),
  patientMeasureController.getMeasures
);

/**
 * GET /api/patients/:patientId/measures/:measureDefId/history
 * Get measure history for a specific measure type
 * Permission: measures:read
 *
 * Query params:
 * - start_date: Start of date range (ISO format)
 * - end_date: End of date range (ISO format)
 */
router.get(
  '/patients/:patientId/measures/:measureDefId/history',
  authenticate,
  requirePermission('measures.read'),
  patientMeasureController.getMeasureHistory
);

/**
 * PUT /api/patient-measures/:id
 * Update a measure
 * Permission: measures:update
 */
router.put(
  '/patient-measures/:id',
  authenticate,
  requirePermission('measures.update'),
  patientMeasureController.updateMeasure
);

/**
 * DELETE /api/patient-measures/:id
 * Delete a measure (soft delete)
 * Permission: measures:delete
 */
router.delete(
  '/patient-measures/:id',
  authenticate,
  requirePermission('measures.delete'),
  patientMeasureController.deleteMeasure
);

/**
 * GET /api/visits/:visitId/measures
 * Get measures by visit
 * Permission: measures:read
 */
router.get(
  '/visits/:visitId/measures',
  authenticate,
  requirePermission('measures.read'),
  patientMeasureController.getMeasuresByVisit
);

/**
 * GET /api/measures/patient-measures
 * Get all patient measures (optionally filtered by measure_definition_id)
 * DEV ONLY - for debugging and data inspection
 * Permission: measures:read
 *
 * Query params:
 * - measure_definition_id: Filter by measure definition
 * - limit: Max number of results (default 10000)
 */
router.get(
  '/measures/patient-measures',
  authenticate,
  requirePermission('measures.read'),
  patientMeasureController.getAllPatientMeasures
);

module.exports = router;
