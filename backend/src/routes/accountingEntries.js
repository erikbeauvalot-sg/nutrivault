/**
 * Accounting Entry Routes
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const accountingEntryController = require('../controllers/accountingEntry.controller');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  next();
};

const ENTRY_TYPES = ['CREDIT', 'DEBIT'];

const entryIdValidation = [
  param('id').isUUID().withMessage('Invalid entry ID format')
];

const createEntryValidation = [
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 500 }),
  body('amount').isFloat().withMessage('Amount must be a number'),
  body('entry_type').isIn(ENTRY_TYPES).withMessage('Entry type must be CREDIT or DEBIT'),
  body('entry_date').isISO8601().withMessage('Valid date is required'),
  body('category').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('reference').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('notes').optional({ nullable: true }).trim()
];

const queryValidation = [
  query('entry_type').optional({ checkFalsy: true }).isIn(ENTRY_TYPES).withMessage('Invalid entry type'),
  query('category').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  query('start_date').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid start_date'),
  query('end_date').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid end_date'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
];

// GET /api/accounting-entries/summary (BEFORE /:id)
router.get('/summary', authenticate, requirePermission('accounting.read'), [
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601()
], validate, accountingEntryController.getSummary);

// GET /api/accounting-entries
router.get('/', authenticate, requirePermission('accounting.read'), queryValidation, validate, accountingEntryController.getAllEntries);

// GET /api/accounting-entries/:id
router.get('/:id', authenticate, requirePermission('accounting.read'), entryIdValidation, validate, accountingEntryController.getEntryById);

// POST /api/accounting-entries
router.post('/', authenticate, requirePermission('accounting.create'), createEntryValidation, validate, accountingEntryController.createEntry);

// PUT /api/accounting-entries/:id
router.put('/:id', authenticate, requirePermission('accounting.update'), entryIdValidation, createEntryValidation, validate, accountingEntryController.updateEntry);

// DELETE /api/accounting-entries/:id
router.delete('/:id', authenticate, requirePermission('accounting.delete'), entryIdValidation, validate, accountingEntryController.deleteEntry);

module.exports = router;
