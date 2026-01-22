/**
 * Alerts Routes
 *
 * All routes require authentication.
 */

const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts.controller');
const authenticate = require('../middleware/authenticate');

/**
 * GET /api/alerts - Get all alerts for current user
 * Returns categorized alerts: overdue invoices, visits without notes, patient follow-ups
 */
router.get(
  '/',
  authenticate,
  alertsController.getAlerts
);

module.exports = router;
