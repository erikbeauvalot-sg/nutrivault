/**
 * Measure Alerts Routes
 *
 * Routes for managing measure alerts.
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 */

const express = require('express');
const router = express.Router();
const measureAlertsController = require('../controllers/measureAlertsController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');
const { param, body } = require('express-validator');

/**
 * GET /api/measure-alerts
 * Get all unacknowledged measure alerts
 * Permission: measures:read
 *
 * Query params:
 * - severity: Filter by severity (critical/warning/info)
 * - limit: Maximum number of results (default 100)
 */
router.get(
  '/measure-alerts',
  authenticate,
  requirePermission('measures.read'),
  measureAlertsController.getAllUnacknowledgedAlerts
);

/**
 * GET /api/patients/:patientId/measure-alerts
 * Get measure alerts for a specific patient
 * Permission: patients:read
 *
 * Query params:
 * - include_acknowledged: Include acknowledged alerts (default false)
 * - limit: Maximum number of results (default 50)
 */
router.get(
  '/patients/:patientId/measure-alerts',
  authenticate,
  requirePermission('patients.read'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  measureAlertsController.getPatientAlerts
);

/**
 * PATCH /api/measure-alerts/:id/acknowledge
 * Acknowledge a single measure alert
 * Permission: measures:update
 */
router.patch(
  '/measure-alerts/:id/acknowledge',
  authenticate,
  requirePermission('measures.update'),
  param('id').isUUID().withMessage('Invalid alert ID'),
  measureAlertsController.acknowledgeAlert
);

/**
 * POST /api/patients/:patientId/measure-alerts/acknowledge
 * Acknowledge multiple measure alerts for a patient
 * Permission: patients:update
 *
 * Body (optional):
 * - severity: Only acknowledge alerts of this severity
 * - measure_definition_id: Only acknowledge alerts for this measure
 */
router.post(
  '/patients/:patientId/measure-alerts/acknowledge',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  measureAlertsController.acknowledgePatientAlerts
);

module.exports = router;
