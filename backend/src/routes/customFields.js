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
const customFieldTranslationController = require('../controllers/customFieldTranslationController');
const authenticate = require('../middleware/authenticate');
const { requirePermission, requireRole } = require('../middleware/rbac');

// ===========================================
// Category Routes
// ===========================================

/**
 * GET /api/custom-fields/categories
 * Get all categories
 * Permission: custom_fields.read
 */
router.get(
  '/categories',
  authenticate,
  requirePermission('custom_fields.read'),
  customFieldCategoryController.getAllCategories
);

/**
 * GET /api/custom-fields/categories/:id
 * Get category by ID
 * Permission: custom_fields.read
 */
router.get(
  '/categories/:id',
  authenticate,
  requirePermission('custom_fields.read'),
  customFieldCategoryController.getCategoryById
);

/**
 * POST /api/custom-fields/categories
 * Create a new category
 * Permission: custom_fields.create
 */
router.post(
  '/categories',
  authenticate,
  requirePermission('custom_fields.create'),
  customFieldCategoryController.validateCreateCategory,
  customFieldCategoryController.createCategory
);

/**
 * PUT /api/custom-fields/categories/:id
 * Update a category
 * Permission: custom_fields.update
 */
router.put(
  '/categories/:id',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldCategoryController.validateUpdateCategory,
  customFieldCategoryController.updateCategory
);

/**
 * DELETE /api/custom-fields/categories/:id
 * Delete a category (soft delete)
 * Permission: custom_fields.delete
 */
router.delete(
  '/categories/:id',
  authenticate,
  requirePermission('custom_fields.delete'),
  customFieldCategoryController.deleteCategory
);

/**
 * POST /api/custom-fields/categories/reorder
 * Reorder categories
 * Permission: custom_fields.update
 */
router.post(
  '/categories/reorder',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldCategoryController.validateReorderCategories,
  customFieldCategoryController.reorderCategories
);

/**
 * POST /api/custom-fields/categories/:id/duplicate
 * Duplicate a category
 * Permission: custom_fields.create
 */
router.post(
  '/categories/:id/duplicate',
  authenticate,
  requirePermission('custom_fields.create'),
  customFieldCategoryController.duplicateCategory
);

// ===========================================
// Export/Import Routes
// ===========================================

/**
 * POST /api/custom-fields/export
 * Export categories with their field definitions
 * Permission: custom_fields.read
 * Body: { categoryIds: [...] } - optional array of category IDs (empty = all)
 */
router.post(
  '/export',
  authenticate,
  requireRole('ADMIN'),
  customFieldCategoryController.exportCategories
);

/**
 * POST /api/custom-fields/import
 * Import categories with their field definitions
 * Permission: custom_fields.create
 * Body: { importData: {...}, options: { skipExisting: true, updateExisting: false } }
 */
router.post(
  '/import',
  authenticate,
  requirePermission('custom_fields.create'),
  customFieldCategoryController.validateImport,
  customFieldCategoryController.importCategories
);

/**
 * POST /api/custom-fields/definitions/:id/duplicate
 * Duplicate a field definition
 * Permission: custom_fields.create
 */
router.post(
  '/definitions/:id/duplicate',
  authenticate,
  requirePermission('custom_fields.create'),
  customFieldDefinitionController.duplicateDefinition
);

// ===========================================
// Field Definition Routes
// ===========================================

/**
 * GET /api/custom-fields/definitions
 * Get all active field definitions
 * Permission: custom_fields.read
 */
router.get(
  '/definitions',
  authenticate,
  requirePermission('custom_fields.read'),
  customFieldDefinitionController.getAllActiveDefinitions
);

/**
 * GET /api/custom-fields/definitions/category/:categoryId
 * Get definitions by category
 * Permission: custom_fields.read
 */
router.get(
  '/definitions/category/:categoryId',
  authenticate,
  requirePermission('custom_fields.read'),
  customFieldDefinitionController.getDefinitionsByCategory
);

/**
 * GET /api/custom-fields/definitions/:id
 * Get definition by ID
 * Permission: custom_fields.read
 */
router.get(
  '/definitions/:id',
  authenticate,
  requirePermission('custom_fields.read'),
  customFieldDefinitionController.getDefinitionById
);

/**
 * POST /api/custom-fields/definitions
 * Create a new field definition
 * Permission: custom_fields.create
 */
router.post(
  '/definitions',
  authenticate,
  requirePermission('custom_fields.create'),
  customFieldDefinitionController.validateCreateDefinition,
  customFieldDefinitionController.createDefinition
);

/**
 * PUT /api/custom-fields/definitions/:id
 * Update a field definition
 * Permission: custom_fields.update
 */
router.put(
  '/definitions/:id',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldDefinitionController.validateUpdateDefinition,
  customFieldDefinitionController.updateDefinition
);

/**
 * DELETE /api/custom-fields/definitions/:id
 * Delete a field definition (soft delete)
 * Permission: custom_fields.delete
 */
router.delete(
  '/definitions/:id',
  authenticate,
  requirePermission('custom_fields.delete'),
  customFieldDefinitionController.deleteDefinition
);

/**
 * POST /api/custom-fields/definitions/reorder
 * Reorder field definitions
 * Permission: custom_fields.update
 */
router.post(
  '/definitions/reorder',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldDefinitionController.validateReorderFields,
  customFieldDefinitionController.reorderFields
);

// ===========================================
// Translation Routes
// ===========================================

/**
 * GET /api/custom-fields/:entityType/:entityId/translations
 * Get all translations for an entity (all languages)
 * Permission: custom_fields.update
 */
router.get(
  '/:entityType/:entityId/translations',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldTranslationController.translationValidation.entityType,
  customFieldTranslationController.translationValidation.entityId,
  customFieldTranslationController.getAllTranslations
);

/**
 * GET /api/custom-fields/:entityType/:entityId/translations/:languageCode
 * Get translations for an entity in a specific language
 * Permission: custom_fields.update
 */
router.get(
  '/:entityType/:entityId/translations/:languageCode',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldTranslationController.translationValidation.entityType,
  customFieldTranslationController.translationValidation.entityId,
  customFieldTranslationController.translationValidation.languageCode,
  customFieldTranslationController.getTranslations
);

/**
 * POST /api/custom-fields/:entityType/:entityId/translations/:languageCode
 * Set translations for an entity in a specific language (bulk)
 * Permission: custom_fields.update
 * Body: { name: "...", description: "..." } for categories
 *       { field_label: "...", help_text: "..." } for definitions
 */
router.post(
  '/:entityType/:entityId/translations/:languageCode',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldTranslationController.translationValidation.entityType,
  customFieldTranslationController.translationValidation.entityId,
  customFieldTranslationController.translationValidation.languageCode,
  customFieldTranslationController.translationValidation.translations,
  customFieldTranslationController.setTranslations
);

/**
 * PUT /api/custom-fields/:entityType/:entityId/translations/:languageCode/:fieldName
 * Set a single translation
 * Permission: custom_fields.update
 * Body: { value: "..." }
 */
router.put(
  '/:entityType/:entityId/translations/:languageCode/:fieldName',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldTranslationController.translationValidation.entityType,
  customFieldTranslationController.translationValidation.entityId,
  customFieldTranslationController.translationValidation.languageCode,
  customFieldTranslationController.translationValidation.fieldName,
  customFieldTranslationController.translationValidation.value,
  customFieldTranslationController.setTranslation
);

/**
 * DELETE /api/custom-fields/translations/:translationId
 * Delete a translation
 * Permission: custom_fields.update
 */
router.delete(
  '/translations/:translationId',
  authenticate,
  requirePermission('custom_fields.update'),
  customFieldTranslationController.deleteTranslation
);

module.exports = router;
