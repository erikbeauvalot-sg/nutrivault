/**
 * Annotation Routes
 *
 * Routes for managing measure annotations
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 3)
 */

const express = require('express');
const router = express.Router();
const annotationController = require('../controllers/annotationController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * GET /api/patients/:patientId/annotations
 * Get all annotations for a patient
 * Permission: measures:read
 *
 * Query params:
 * - measure_definition_id: Filter by measure type
 * - start_date: Start of date range (ISO format)
 * - end_date: End of date range (ISO format)
 */
router.get(
  '/patients/:patientId/annotations',
  authenticate,
  requirePermission('measures.read'),
  annotationController.getAnnotations
);

/**
 * POST /api/patients/:patientId/annotations
 * Create a new annotation
 * Permission: measures:create
 *
 * Body:
 * - measure_definition_id: UUID (optional, null = all measures)
 * - event_date: DATE (required)
 * - event_type: ENUM (medication, lifestyle, medical, other)
 * - title: STRING (required)
 * - description: TEXT (optional)
 * - color: STRING (hex color, optional)
 */
router.post(
  '/patients/:patientId/annotations',
  authenticate,
  requirePermission('measures.create'),
  annotationController.createAnnotation
);

/**
 * PUT /api/annotations/:id
 * Update an annotation
 * Permission: measures:update
 */
router.put(
  '/annotations/:id',
  authenticate,
  requirePermission('measures.update'),
  annotationController.updateAnnotation
);

/**
 * DELETE /api/annotations/:id
 * Delete an annotation (soft delete)
 * Permission: measures:delete
 */
router.delete(
  '/annotations/:id',
  authenticate,
  requirePermission('measures.delete'),
  annotationController.deleteAnnotation
);

module.exports = router;
