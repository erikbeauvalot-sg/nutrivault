/**
 * Billing Management Routes
 *
 * Routes for billing and invoice management endpoints
 */

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  validateBillingCreation,
  validateBillingUpdate,
  validateMarkAsPaid,
  validateBillingId,
  validateBillingQuery
} = require('../validators/billing.validator');

/**
 * All routes require authentication and rate limiting
 */
router.use(authenticate);
router.use(apiLimiter);

/**
 * Get billing statistics
 * Must come before /:id routes to avoid conflicts
 */
router.get('/stats',
  requirePermission('billing.read'),
  billingController.getBillingStatsHandler
);

/**
 * Get all billing records
 * Dietitians automatically see only their assigned patients' billing
 */
router.get('/',
  requirePermission('billing.list'),
  validateBillingQuery,
  billingController.getBillingRecordsHandler
);

/**
 * Create new invoice
 */
router.post('/',
  requirePermission('billing.create'),
  validateBillingCreation,
  billingController.createBillingHandler
);

/**
 * Get billing record by ID
 * Service layer checks if dietitian is assigned to the patient
 */
router.get('/:id',
  requirePermission('billing.read'),
  validateBillingId,
  billingController.getBillingByIdHandler
);

/**
 * Update billing record
 * Service layer checks if dietitian is assigned to the patient
 */
router.put('/:id',
  requirePermission('billing.update'),
  validateBillingUpdate,
  billingController.updateBillingHandler
);

/**
 * Mark invoice as paid
 * Service layer checks if dietitian is assigned to the patient
 */
router.post('/:id/pay',
  requirePermission('billing.update'),
  validateMarkAsPaid,
  billingController.markAsPaidHandler
);

/**
 * Delete billing record
 * Service layer checks if dietitian is assigned to the patient
 * Cannot delete paid invoices
 */
router.delete('/:id',
  requirePermission('billing.delete'),
  validateBillingId,
  billingController.deleteBillingHandler
);

module.exports = router;
