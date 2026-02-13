/**
 * Expense Routes
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const expenseController = require('../controllers/expense.controller');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  next();
};

const CATEGORIES = ['RENT', 'EQUIPMENT', 'SOFTWARE', 'INSURANCE', 'TRAINING', 'MARKETING', 'UTILITIES', 'STAFF', 'PROFESSIONAL_FEES', 'SUPPLIES', 'TRAVEL', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'];
const RECURRING_PERIODS = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

const expenseIdValidation = [
  param('id').isUUID().withMessage('Invalid expense ID format')
];

const createExpenseValidation = [
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 500 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category').isIn(CATEGORIES).withMessage('Invalid category'),
  body('expense_date').isISO8601().withMessage('Valid date is required'),
  body('vendor').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('receipt_url').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('payment_method').optional({ nullable: true }).isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  body('notes').optional({ nullable: true }).trim(),
  body('is_recurring').optional().isBoolean(),
  body('recurring_period').optional({ nullable: true }).isIn(RECURRING_PERIODS).withMessage('Invalid recurring period'),
  body('recurring_end_date').optional({ nullable: true }).isISO8601().withMessage('Invalid recurring end date'),
  body('tax_deductible').optional().isBoolean()
];

const queryValidation = [
  query('category').optional({ checkFalsy: true }).isIn(CATEGORIES).withMessage('Invalid category'),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  query('start_date').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid start_date'),
  query('end_date').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid end_date'),
  query('is_recurring').optional({ checkFalsy: true }).isIn(['true', 'false']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
];

// GET /api/expenses/summary (BEFORE /:id)
router.get('/summary', authenticate, requirePermission('expenses.read'), [
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601()
], validate, expenseController.getExpenseSummary);

// GET /api/expenses
router.get('/', authenticate, requirePermission('expenses.read'), queryValidation, validate, expenseController.getAllExpenses);

// GET /api/expenses/:id
router.get('/:id', authenticate, requirePermission('expenses.read'), expenseIdValidation, validate, expenseController.getExpenseById);

// POST /api/expenses
router.post('/', authenticate, requirePermission('expenses.create'), createExpenseValidation, validate, expenseController.createExpense);

// PUT /api/expenses/:id
router.put('/:id', authenticate, requirePermission('expenses.update'), expenseIdValidation, createExpenseValidation, validate, expenseController.updateExpense);

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, requirePermission('expenses.delete'), expenseIdValidation, validate, expenseController.deleteExpense);

module.exports = router;
