/**
 * Billing Validation Rules
 *
 * Input validation for billing and invoice management endpoints
 */

const { body, query, param, validationResult } = require('express-validator');
const { createQueryValidator } = require('./queryValidator');
const { BILLING_CONFIG } = require('../config/queryConfigs');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Validation rules for creating billing/invoice
 */
const validateBillingCreation = [
  body('patient_id')
    .notEmpty().withMessage('Patient ID is required')
    .isUUID().withMessage('Patient ID must be a valid UUID'),

  body('visit_id')
    .optional()
    .isUUID().withMessage('Visit ID must be a valid UUID'),

  body('invoice_date')
    .notEmpty().withMessage('Invoice date is required')
    .isISO8601().withMessage('Invoice date must be a valid date')
    .toDate(),

  body('due_date')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Due date must be a valid date')
    .toDate()
    .custom((value, { req }) => {
      if (req.body.invoice_date && new Date(value) < new Date(req.body.invoice_date)) {
        throw new Error('Due date cannot be before invoice date');
      }
      return true;
    }),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
    .custom((value) => {
      // Check for max 2 decimal places
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Amount can have maximum 2 decimal places');
      }
      return true;
    }),

  body('tax_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tax amount must be 0 or greater')
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Tax amount can have maximum 2 decimal places');
      }
      return true;
    }),

  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code')
    .isUppercase().withMessage('Currency must be uppercase')
    .matches(/^[A-Z]{3}$/).withMessage('Currency must be a valid 3-letter code (e.g., USD, EUR)'),

  body('status')
    .optional()
    .isIn(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'])
    .withMessage('Status must be one of: PENDING, PAID, OVERDUE, CANCELLED, REFUNDED'),

  body('payment_method')
    .optional()
    .isIn(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER'])
    .withMessage('Payment method must be one of: CASH, CREDIT_CARD, BANK_TRANSFER, INSURANCE, OTHER'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must not exceed 2000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for updating billing/invoice
 */
const validateBillingUpdate = [
  param('id')
    .isUUID().withMessage('Billing ID must be a valid UUID'),

  body('due_date')
    .optional()
    .isISO8601().withMessage('Due date must be a valid date')
    .toDate(),

  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0')
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Amount can have maximum 2 decimal places');
      }
      return true;
    }),

  body('tax_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tax amount must be 0 or greater')
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Tax amount can have maximum 2 decimal places');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'])
    .withMessage('Status must be one of: PENDING, PAID, OVERDUE, CANCELLED, REFUNDED'),

  body('payment_method')
    .optional()
    .isIn(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER'])
    .withMessage('Payment method must be one of: CASH, CREDIT_CARD, BANK_TRANSFER, INSURANCE, OTHER'),

  body('payment_date')
    .optional()
    .isISO8601().withMessage('Payment date must be a valid date')
    .toDate(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes must not exceed 2000 characters'),

  handleValidationErrors
];

/**
 * Validation rules for marking invoice as paid
 */
const validateMarkAsPaid = [
  param('id')
    .isUUID().withMessage('Billing ID must be a valid UUID'),

  body('payment_method')
    .optional()
    .isIn(['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER'])
    .withMessage('Payment method must be one of: CASH, CREDIT_CARD, BANK_TRANSFER, INSURANCE, OTHER'),

  body('payment_date')
    .optional()
    .isISO8601().withMessage('Payment date must be a valid date')
    .toDate()
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Payment date cannot be in the future');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for billing ID parameter
 */
const validateBillingId = [
  param('id')
    .isUUID().withMessage('Billing ID must be a valid UUID'),

  handleValidationErrors
];

/**
 * Validation rules for billing query parameters
 * Uses QueryBuilder validation factory with legacy date filter support
 */
const validateBillingQuery = [
  // Legacy date filters (backward compatibility)
  query('from_date')
    .optional()
    .isISO8601().withMessage('From date must be a valid date'),

  query('to_date')
    .optional()
    .isISO8601().withMessage('To date must be a valid date'),

  // Auto-generated validators for QueryBuilder fields
  ...createQueryValidator(BILLING_CONFIG, handleValidationErrors)
];

module.exports = {
  validateBillingCreation,
  validateBillingUpdate,
  validateMarkAsPaid,
  validateBillingId,
  validateBillingQuery,
  handleValidationErrors
};
