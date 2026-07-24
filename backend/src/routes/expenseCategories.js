/**
 * Expense Categories Routes
 * Configurable list of expense categories.
 */

const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategoryController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// GET /api/expense-categories — any authenticated user (populates dropdowns)
router.get('/', authenticate, expenseCategoryController.getAllExpenseCategories);

// Managing the list requires the settings permission (admin / dietitian).
router.post('/', authenticate, requirePermission('settings.manage'), expenseCategoryController.createExpenseCategory);
router.put('/reorder', authenticate, requirePermission('settings.manage'), expenseCategoryController.reorderExpenseCategories);
router.put('/:id', authenticate, requirePermission('settings.manage'), expenseCategoryController.updateExpenseCategory);
router.delete('/:id', authenticate, requirePermission('settings.manage'), expenseCategoryController.deleteExpenseCategory);

module.exports = router;
