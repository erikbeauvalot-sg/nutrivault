/**
 * Custom Fields Routes
 *
 * All routes require authentication and appropriate permissions.
 * RBAC enforced via middleware and service layer.
 *
 * Admin-only routes: Creating, updating, and deleting field categories and definitions
 * All authenticated users: Reading field definitions (for patient.read permission)
 */

const express = require('express');
const router = express.Router();
const customFieldCategoryController = require('../controllers/customFieldCategoryController');
const customFieldDefinitionController = require('../controllers/customFieldDefinitionController');
const authenticate = require('../middleware/authenticate');
const { requirePermission, requireRole } = require('../middleware/rbac');

// ===========================================
// Category Routes
// ===========================================

/**
 * GET /api/custom-fields/categories
 * Get all categories
 * Permission: patients.read
 */
router.get(
  '/categories',
  authenticate,
  requirePermission('patients.read'),
  customFieldCategoryController.getAllCategories
);

/**
 * GET /api/custom-fields/categories/:id
 * Get category by ID
 * Permission: patients.read
 */
router.get(
  '/categories/:id',
  authenticate,
  requirePermission('patients.read'),
  customFieldCategoryController.getCategoryById
);

/**
 * POST /api/custom-fields/categories
 * Create a new category
 * Role: ADMIN only
 */
router.post(
  '/categories',
  authenticate,
  requireRole('ADMIN'),
  customFieldCategoryController.validateCreateCategory,
  customFieldCategoryController.createCategory
);

/**
 * PUT /api/custom-fields/categories/:id
 * Update a category
 * Role: ADMIN only
 */
router.put(
  '/categories/:id',
  authenticate,
  requireRole('ADMIN'),
  customFieldCategoryController.validateUpdateCategory,
  customFieldCategoryController.updateCategory
);

/**
 * DELETE /api/custom-fields/categories/:id
 * Delete a category (soft delete)
 * Role: ADMIN only
 */
router.delete(
  '/categories/:id',
  authenticate,
  requireRole('ADMIN'),
  customFieldCategoryController.deleteCategory
);

/**
 * POST /api/custom-fields/categories/reorder
 * Reorder categories
 * Role: ADMIN only
 */
router.post(
  '/categories/reorder',
  authenticate,
  requireRole('ADMIN'),
  customFieldCategoryController.validateReorderCategories,
  customFieldCategoryController.reorderCategories
);

// ===========================================
// Field Definition Routes
// ===========================================

/**
 * GET /api/custom-fields/definitions
 * Get all active field definitions
 * Permission: patients.read
 */
router.get(
  '/definitions',
  authenticate,
  requirePermission('patients.read'),
  customFieldDefinitionController.getAllActiveDefinitions
);

/**
 * GET /api/custom-fields/definitions/category/:categoryId
 * Get definitions by category
 * Permission: patients.read
 */
router.get(
  '/definitions/category/:categoryId',
  authenticate,
  requirePermission('patients.read'),
  customFieldDefinitionController.getDefinitionsByCategory
);

/**
 * GET /api/custom-fields/definitions/:id
 * Get definition by ID
 * Permission: patients.read
 */
router.get(
  '/definitions/:id',
  authenticate,
  requirePermission('patients.read'),
  customFieldDefinitionController.getDefinitionById
);

/**
 * POST /api/custom-fields/definitions
 * Create a new field definition
 * Role: ADMIN only
 */
router.post(
  '/definitions',
  authenticate,
  requireRole('ADMIN'),
  customFieldDefinitionController.validateCreateDefinition,
  customFieldDefinitionController.createDefinition
);

/**
 * PUT /api/custom-fields/definitions/:id
 * Update a field definition
 * Role: ADMIN only
 */
router.put(
  '/definitions/:id',
  authenticate,
  requireRole('ADMIN'),
  customFieldDefinitionController.validateUpdateDefinition,
  customFieldDefinitionController.updateDefinition
);

/**
 * DELETE /api/custom-fields/definitions/:id
 * Delete a field definition (soft delete)
 * Role: ADMIN only
 */
router.delete(
  '/definitions/:id',
  authenticate,
  requireRole('ADMIN'),
  customFieldDefinitionController.deleteDefinition
);

/**
 * POST /api/custom-fields/definitions/reorder
 * Reorder field definitions
 * Role: ADMIN only
 */
router.post(
  '/definitions/reorder',
  authenticate,
  requireRole('ADMIN'),
  customFieldDefinitionController.validateReorderFields,
  customFieldDefinitionController.reorderFields
);

module.exports = router;
