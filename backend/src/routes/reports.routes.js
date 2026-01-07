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
const { cacheMiddleware } = require('../middleware/cache');

/**
 * All routes require authentication and rate limiting
 */
router.use(authenticate);
router.use(reportLimiter);

/**
 * Get patient statistics report
 * Permission: reports.patients
 * Cache: 5 min (reports are expensive, update infrequently)
 */
router.get('/patients',
  requirePermission('reports.patients'),
  validateDateRange,
  cacheMiddleware('long'), // 5 min cache for reports
  reportsController.getPatientStatsHandler
);

/**
 * Get visit analytics report
 * Permission: reports.visits
 * Cache: 5 min (reports are expensive, update infrequently)
 */
router.get('/visits',
  requirePermission('reports.visits'),
  validateDateRange,
  cacheMiddleware('long'), // 5 min cache for reports
  reportsController.getVisitAnalyticsHandler
);

/**
 * Get billing report
 * Permission: reports.billing
 * Cache: 5 min (reports are expensive, update infrequently)
 */
router.get('/billing',
  requirePermission('reports.billing'),
  validateDateRange,
  cacheMiddleware('long'), // 5 min cache for reports
  reportsController.getBillingReportHandler
);

/**
 * Get dietitian performance report
 * Permission: reports.performance
 */
router.get('/performance',
  requirePermission('reports.performance'),
  validateDateRange,
  cacheMiddleware('long'), // 5 min cache for reports
  reportsController.getPerformanceReportHandler
);

module.exports = router;
