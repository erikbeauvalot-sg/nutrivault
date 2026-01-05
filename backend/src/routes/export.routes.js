/**
 * Data Export Routes
 *
 * Routes for exporting data to CSV, Excel, and PDF formats
 */

const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { exportLimiter } = require('../middleware/rateLimiter');
const {
  validatePatientExport,
  validateVisitExport,
  validateBillingExport
} = require('../validators/export.validator');

/**
 * All routes require authentication and export rate limiting
 */
router.use(authenticate);
router.use(exportLimiter);

/**
 * Export patients data
 * GET /api/export/patients?format=csv|excel|pdf&is_active=true
 */
router.get('/patients',
  requirePermission('export.patients'),
  validatePatientExport,
  exportController.exportPatientsHandler
);

/**
 * Export visits data
 * GET /api/export/visits?format=csv|excel|pdf&patient_id=xxx&status=completed
 */
router.get('/visits',
  requirePermission('export.visits'),
  validateVisitExport,
  exportController.exportVisitsHandler
);

/**
 * Export billing data
 * GET /api/export/billing?format=csv|excel|pdf&patient_id=xxx&status=paid
 */
router.get('/billing',
  requirePermission('export.billing'),
  validateBillingExport,
  exportController.exportBillingHandler
);

module.exports = router;
