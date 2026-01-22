/**
 * GDPR Routes
 *
 * Endpoints for RGPD compliance:
 * - Data export (Right to Data Portability)
 * - Permanent deletion (Right to be Forgotten)
 */

const express = require('express');
const router = express.Router();
const gdprController = require('../controllers/gdpr.controller');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// All GDPR routes require authentication
router.use(authenticate);

/**
 * Export patient data
 * GET /api/gdpr/patients/:id/export?format=json|csv
 *
 * Returns complete patient data export for RGPD compliance
 * Requires: patients.read permission
 */
router.get(
  '/patients/:id/export',
  requirePermission('patients.read'),
  gdprController.exportPatientData
);

/**
 * Permanently delete patient
 * DELETE /api/gdpr/patients/:id/permanent
 * Body: { "confirm": "DELETE_PERMANENTLY" }
 *
 * Hard deletes patient and all associated data
 * Requires: patients.delete permission
 */
router.delete(
  '/patients/:id/permanent',
  requirePermission('patients.delete'),
  gdprController.deletePatientPermanently
);

module.exports = router;
