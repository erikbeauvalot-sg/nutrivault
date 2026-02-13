/**
 * Quote Routes
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const quoteController = require('../controllers/quote.controller');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  next();
};

const quoteIdValidation = [
  param('id').isUUID().withMessage('Invalid quote ID format')
];

const createQuoteValidation = [
  body('client_id').isUUID().withMessage('client_id must be a valid UUID'),
  body('subject').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('notes').optional({ nullable: true }).trim(),
  body('quote_date').optional({ nullable: true }).isISO8601().withMessage('quote_date must be a valid date'),
  body('validity_date').optional({ nullable: true }).isISO8601().withMessage('validity_date must be a valid date'),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('tax_rate must be between 0 and 100'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.item_name').trim().notEmpty().withMessage('Item name is required').isLength({ max: 200 }),
  body('items.*.description').optional({ nullable: true }).trim(),
  body('items.*.quantity').optional().isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be non-negative')
];

const updateQuoteValidation = [
  body('client_id').optional().isUUID(),
  body('subject').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('notes').optional({ nullable: true }).trim(),
  body('validity_date').optional({ nullable: true }).isISO8601(),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }),
  body('items').optional().isArray(),
  body('items.*.item_name').optional().trim().isLength({ max: 200 }),
  body('items.*.quantity').optional().isFloat({ min: 0.01 }),
  body('items.*.unit_price').optional().isFloat({ min: 0 })
];

const queryValidation = [
  query('client_id').optional().isUUID(),
  query('status').optional({ checkFalsy: true }).isIn(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
];

// GET /api/quotes
router.get('/', authenticate, requirePermission('quotes.read'), queryValidation, validate, quoteController.getAllQuotes);

// GET /api/quotes/:id
router.get('/:id', authenticate, requirePermission('quotes.read'), quoteIdValidation, validate, quoteController.getQuoteById);

// GET /api/quotes/:id/pdf
router.get('/:id/pdf', authenticate, requirePermission('quotes.read'), quoteIdValidation, validate, quoteController.downloadPDF);

// POST /api/quotes
router.post('/', authenticate, requirePermission('quotes.create'), createQuoteValidation, validate, quoteController.createQuote);

// PUT /api/quotes/:id
router.put('/:id', authenticate, requirePermission('quotes.update'), quoteIdValidation, updateQuoteValidation, validate, quoteController.updateQuote);

// DELETE /api/quotes/:id
router.delete('/:id', authenticate, requirePermission('quotes.delete'), quoteIdValidation, validate, quoteController.deleteQuote);

// PATCH /api/quotes/:id/status
router.patch('/:id/status', authenticate, requirePermission('quotes.update'), [
  ...quoteIdValidation,
  body('status').isIn(['SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).withMessage('Invalid status'),
  body('declined_reason').optional({ nullable: true }).trim()
], validate, quoteController.changeStatus);

// POST /api/quotes/:id/convert-to-invoice
router.post('/:id/convert-to-invoice', authenticate, requirePermission('quotes.convert'), quoteIdValidation, validate, quoteController.convertToInvoice);

// POST /api/quotes/:id/duplicate
router.post('/:id/duplicate', authenticate, requirePermission('quotes.create'), quoteIdValidation, validate, quoteController.duplicateQuote);

// POST /api/quotes/:id/send-email
router.post('/:id/send-email', authenticate, requirePermission('quotes.send'), quoteIdValidation, validate, quoteController.sendEmail);

module.exports = router;
