/**
 * Reports Routes
 *
 * Routes for reporting and analytics endpoints
 */

const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { reportLimiter } = require('../middleware/rateLimiter');
const { validateDateRange } = require('../validators/reports.validator');

/**
 * All routes require authentication and rate limiting
 */
router.use(authenticate);
router.use(reportLimiter);

/**
 * Get patient statistics report
 * Permission: reports.patients
 */
router.get('/patients',
  requirePermission('reports.patients'),
  validateDateRange,
  reportsController.getPatientStatsHandler
);

/**
 * Get visit analytics report
 * Permission: reports.visits
 */
router.get('/visits',
  requirePermission('reports.visits'),
  validateDateRange,
  reportsController.getVisitAnalyticsHandler
);

/**
 * Get billing report
 * Permission: reports.billing
 */
router.get('/billing',
  requirePermission('reports.billing'),
  validateDateRange,
  reportsController.getBillingReportHandler
);

/**
 * Get practice overview dashboard
 * Permission: reports.overview
 */
router.get('/overview',
  requirePermission('reports.overview'),
  validateDateRange,
  reportsController.getPracticeOverviewHandler
);

module.exports = router;
