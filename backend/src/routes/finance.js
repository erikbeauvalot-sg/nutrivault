/**
 * Finance Routes
 * Dashboard, aging report, cash flow, reminders.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
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

// GET /api/finance/revenue
router.get('/revenue', authenticate, requirePermission('finance.read'), dateQueryValidation, validate, financeController.getRevenue);

const billingIdsValidation = [
  body('billing_ids').isArray({ min: 1, max: 500 }).withMessage('billing_ids must be a non-empty array'),
  body('billing_ids.*').isUUID().withMessage('Each billing_id must be a valid UUID')
];

// PATCH /api/finance/revenue/cash-date — set the cash date (null resets it to the invoice date)
router.patch('/revenue/cash-date', authenticate, requirePermission('billing.update'), [
  ...billingIdsValidation,
  body('cash_date').optional({ nullable: true }).isISO8601({ strict: true }).withMessage('Invalid cash_date')
], validate, financeController.setCashDate);

// POST /api/finance/revenue/cash-date/next-month — move cash dates to the 2nd of the next month
router.post('/revenue/cash-date/next-month', authenticate, requirePermission('billing.update'),
  billingIdsValidation, validate, financeController.shiftCashDateToNextMonth);

// PATCH /api/finance/revenue/location — set the practice location of invoices (null clears it)
router.patch('/revenue/location', authenticate, requirePermission('billing.update'), [
  ...billingIdsValidation,
  body('location_code').optional({ nullable: true }).isString().isLength({ min: 1, max: 50 })
    .withMessage('Invalid location')
], validate, financeController.setLocation);

// PATCH /api/finance/revenue/bank-account — set the bank account of invoices (null clears it)
router.patch('/revenue/bank-account', authenticate, requirePermission('billing.update'), [
  ...billingIdsValidation,
  body('bank_account_code').optional({ nullable: true }).isString().isLength({ min: 1, max: 50 })
    .withMessage('Invalid bank account')
], validate, financeController.setBankAccount);

// PATCH /api/finance/revenue/:id — edit a revenue (amount, cash date, payment method, location, account, description)
router.patch('/revenue/:id', authenticate, requirePermission('billing.update'), [
  param('id').isUUID().withMessage('Invalid invoice id'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('cash_date').optional({ nullable: true }).isISO8601({ strict: true }).withMessage('Invalid cash date'),
  body('payment_method').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('location_code').optional({ nullable: true }).isString().isLength({ min: 1, max: 50 }),
  body('bank_account_code').optional({ nullable: true }).isString().isLength({ min: 1, max: 50 }),
  body('service_description').optional().isString().trim().notEmpty().isLength({ max: 500 })
], validate, financeController.updateRevenue);

// GET /api/finance/treasury — flows and balance per bank account
router.get('/treasury', authenticate, requirePermission('finance.read'), dateQueryValidation, validate,
  financeController.getTreasury);

// GET /api/finance/forecast
router.get('/forecast', authenticate, requirePermission('finance.read'), [
  query('end_date').optional().isISO8601().withMessage('Invalid end_date')
], validate, financeController.getForecast);

// GET /api/finance/compta-export — download the accounting workbook (.xlsx)
router.get('/compta-export', authenticate, requirePermission('finance.read'), [
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  query('mode').optional().isIn(['auto', 'faithful', 'clean']).withMessage('Invalid mode')
], validate, financeController.exportCompta);

// POST /api/finance/compta-export/write — regenerate the file on the server disk
router.post('/compta-export/write', authenticate, requirePermission('finance.read'), [
  body('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  body('mode').optional().isIn(['auto', 'faithful', 'clean']).withMessage('Invalid mode')
], validate, financeController.writeComptaToDisk);

// POST /api/finance/send-reminders
router.post('/send-reminders', authenticate, requirePermission('billing.update'), [
  body('invoice_ids').isArray({ min: 1 }).withMessage('invoice_ids must be a non-empty array'),
  body('invoice_ids.*').isUUID().withMessage('Each invoice_id must be a valid UUID')
], validate, financeController.sendReminders);

module.exports = router;
