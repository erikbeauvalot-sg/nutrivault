/**
 * Bank Accounts Routes
 * Configurable list of bank accounts (treasury per account).
 */

const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// GET /api/bank-accounts — any authenticated user (used to populate dropdowns)
router.get('/', authenticate, bankAccountController.getAllBankAccounts);

// Managing the list requires the settings permission (admin / dietitian).
router.post('/', authenticate, requirePermission('settings.manage'), bankAccountController.createBankAccount);
router.put('/:id', authenticate, requirePermission('settings.manage'), bankAccountController.updateBankAccount);
router.delete('/:id', authenticate, requirePermission('settings.manage'), bankAccountController.deleteBankAccount);

module.exports = router;
