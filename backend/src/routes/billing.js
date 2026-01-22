/**
 * Billing Routes
 *
 * All routes require authentication and appropriate permissions.
 * RBAC enforced via middleware and service layer.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const billingController = require('../controllers/billing.controller');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * Validation middleware - check for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for invoice ID parameter
 */
const invoiceIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid invoice ID format')
];

/**
 * Validation rules for creating an invoice
 */
const createInvoiceValidation = [
  body('patient_id')
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),

  body('visit_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Visit ID must be a valid UUID'),

  body('service_description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  body('amount_total')
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be greater than 0'),

  body('due_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),

  body('items')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Items must be an array'),

  body('items.*.description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Item description must be less than 200 characters'),

  body('items.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item amount must be non-negative')
];

/**
 * Validation rules for updating an invoice
 */
const updateInvoiceValidation = [
  body('service_description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),

  body('amount_total')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be greater than 0'),

  body('due_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),

  body('status')
    .optional()
    .isIn(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])
    .withMessage('Invalid status value'),

  body('items')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Items must be an array'),

  body('items.*.description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Item description must be less than 200 characters'),

  body('items.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Item amount must be non-negative')
];

/**
 * Validation rules for recording payment
 */
const recordPaymentValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),

  body('payment_method')
    .isIn(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'INSURANCE', 'OTHER'])
    .withMessage('Invalid payment method'),

  body('payment_date')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid ISO 8601 date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Payment notes must be less than 500 characters')
];

/**
 * Validation rules for query parameters
 */
const queryValidation = [
  query('patient_id')
    .optional()
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),

  query('status')
    .optional({ checkFalsy: true })  // Allow empty strings to be treated as optional
    .isIn(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])
    .withMessage('Invalid status filter'),

  query('search')
    .optional({ checkFalsy: true })  // Allow empty strings to be treated as optional
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),

  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
];

/**
 * GET /api/billing - Get all invoices
 * Requires: billing.read permission
 * All authenticated users can read invoices (filtered by RBAC in service)
 */
router.get(
  '/',
  authenticate,
  requirePermission('billing.read'),
  queryValidation,
  validate,
  billingController.getAllInvoices
);

/**
 * GET /api/billing/:id - Get invoice by ID
 * Requires: billing.read permission
 * All authenticated users can read invoices (filtered by RBAC in service)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('billing.read'),
  invoiceIdValidation,
  validate,
  billingController.getInvoiceById
);

/**
 * POST /api/billing - Create new invoice
 * Requires: billing.create permission
 * ADMIN, DIETITIAN, and ASSISTANT can create invoices
 */
router.post(
  '/',
  authenticate,
  requirePermission('billing.create'),
  createInvoiceValidation,
  validate,
  billingController.createInvoice
);

/**
 * PUT /api/billing/:id - Update invoice
 * Requires: billing.update permission
 * ADMIN, DIETITIAN, and ASSISTANT can update invoices
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('billing.update'),
  invoiceIdValidation,
  updateInvoiceValidation,
  validate,
  billingController.updateInvoice
);

/**
 * POST /api/billing/:id/payment - Record payment
 * Requires: billing.update permission
 * ADMIN, DIETITIAN, and ASSISTANT can record payments
 */
router.post(
  '/:id/payment',
  authenticate,
  requirePermission('billing.update'),
  invoiceIdValidation,
  recordPaymentValidation,
  validate,
  billingController.recordPayment
);

/**
 * POST /api/billing/:id/send-email - Send invoice by email
 * Requires: billing.update permission
 * ADMIN, DIETITIAN, and ASSISTANT can send invoice emails
 */
router.post(
  '/:id/send-email',
  authenticate,
  requirePermission('billing.update'),
  invoiceIdValidation,
  validate,
  billingController.sendInvoiceEmail
);

/**
 * POST /api/billing/:id/mark-paid - Mark invoice as paid
 * Requires: billing.update permission
 * ADMIN, DIETITIAN, and ASSISTANT can mark invoices as paid
 */
router.post(
  '/:id/mark-paid',
  authenticate,
  requirePermission('billing.update'),
  invoiceIdValidation,
  validate,
  billingController.markAsPaid
);

/**
 * DELETE /api/billing/:id - Delete invoice (soft delete)
 * Requires: billing.delete permission
 * Only ADMIN can delete invoices
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('billing.delete'),
  invoiceIdValidation,
  validate,
  billingController.deleteInvoice
);

module.exports = router;