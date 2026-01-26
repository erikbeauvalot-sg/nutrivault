/**
 * Analytics Routes
 * Sprint 6: Advanced Data Visualization
 *
 * All routes require authentication
 * Most routes require ADMIN or DIETITIAN role
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// All analytics routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/analytics/health-trends
 * @desc    Get health trends analytics (measures, risk distribution)
 * @access  ADMIN, DIETITIAN
 * @query   startDate, endDate (optional date filters)
 */
router.get(
  '/health-trends',
  requirePermission('patients', 'read'),
  analyticsController.getHealthTrends
);

/**
 * @route   GET /api/analytics/financial-metrics
 * @desc    Get financial metrics (revenue, invoices, payments)
 * @access  ADMIN, DIETITIAN
 * @query   startDate, endDate (optional date filters)
 */
router.get(
  '/financial-metrics',
  requirePermission('billing', 'read'),
  analyticsController.getFinancialMetrics
);

/**
 * @route   GET /api/analytics/communication-effectiveness
 * @desc    Get communication analytics (emails, reminders, no-show rates)
 * @access  ADMIN, DIETITIAN
 * @query   startDate, endDate (optional date filters)
 */
router.get(
  '/communication-effectiveness',
  requirePermission('patients', 'read'),
  analyticsController.getCommunicationEffectiveness
);

/**
 * @route   GET /api/analytics/patient-health-score/:patientId
 * @desc    Get health score for a specific patient
 * @access  ADMIN, DIETITIAN
 * @param   patientId - Patient UUID
 */
router.get(
  '/patient-health-score/:patientId',
  requirePermission('patients', 'read'),
  analyticsController.getPatientHealthScore
);

module.exports = router;
