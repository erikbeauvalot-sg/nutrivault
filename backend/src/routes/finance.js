/**
 * Finance Routes
 * Dashboard, aging report, cash flow, reminders.
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const financeController = require('../controllers/finance.controller');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  next();
};

const dateQueryValidation = [
  query('start_date').optional().isISO8601().withMessage('Invalid start_date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end_date')
];

// GET /api/finance/dashboard
router.get('/dashboard', authenticate, requirePermission('finance.read'), dateQueryValidation, validate, financeController.getDashboard);

// GET /api/finance/aging-report
router.get('/aging-report', authenticate, requirePermission('finance.read'), financeController.getAgingReport);

// GET /api/finance/cash-flow
router.get('/cash-flow', authenticate, requirePermission('finance.read'), dateQueryValidation, validate, financeController.getCashFlow);

// POST /api/finance/send-reminders
router.post('/send-reminders', authenticate, requirePermission('billing.update'), [
  body('invoice_ids').isArray({ min: 1 }).withMessage('invoice_ids must be a non-empty array'),
  body('invoice_ids.*').isUUID().withMessage('Each invoice_id must be a valid UUID')
], validate, financeController.sendReminders);

module.exports = router;
