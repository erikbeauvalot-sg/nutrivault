/**
 * Payment Methods Routes
 * Configurable list of billing payment methods.
 */

const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// GET /api/payment-methods — any authenticated user (used to populate dropdowns)
router.get('/', authenticate, paymentMethodController.getAllPaymentMethods);

// Managing the list requires the settings permission (admin / dietitian).
router.post('/', authenticate, requirePermission('settings.manage'), paymentMethodController.createPaymentMethod);
router.put('/reorder', authenticate, requirePermission('settings.manage'), paymentMethodController.reorderPaymentMethods);
router.put('/:id', authenticate, requirePermission('settings.manage'), paymentMethodController.updatePaymentMethod);
router.delete('/:id', authenticate, requirePermission('settings.manage'), paymentMethodController.deletePaymentMethod);

module.exports = router;
