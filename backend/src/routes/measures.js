/**
 * Measure Definitions Routes
 *
 * Routes for managing measure definitions.
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

const express = require('express');
const router = express.Router();
const measureDefinitionController = require('../controllers/measureDefinitionController');
const measureTranslationController = require('../controllers/measureTranslationController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');
const { param, body } = require('express-validator');

/**
 * GET /api/measures/categories
 * Get all categories with counts
 * Permission: measures:read
 */
router.get(
  '/categories',
  authenticate,
  requirePermission('measures.read'),
  measureDefinitionController.getCategories
);

/**
 * GET /api/measures/category/:category
 * Get measures by category
 * Permission: measures:read
 */
router.get(
  '/category/:category',
  authenticate,
  requirePermission('measures.read'),
  measureDefinitionController.getByCategory
);

/**
 * POST /api/measures/export
 * Export measure definitions with translations
 * Permission: measures:read
 */
router.post(
  '/export',
  authenticate,
  requirePermission('measures.read'),
  measureDefinitionController.exportDefinitions
);

/**
 * POST /api/measures/import
 * Import measure definitions with translations
 * Permission: measures:create
 */
router.post(
  '/import',
  authenticate,
  requirePermission('measures.create'),
  measureDefinitionController.importDefinitions
);

/**
 * GET /api/measures
 * Get all measure definitions
 * Permission: measures:read
 *
 * Query params:
 * - category: Filter by category
 * - is_active: Filter by active status (true/false)
 * - measure_type: Filter by type (numeric/text/boolean/calculated)
 */
router.get(
  '/',
  authenticate,
  requirePermission('measures.read'),
  measureDefinitionController.getAllDefinitions
);

/**
 * GET /api/measures/:id
 * Get measure definition by ID
 * Permission: measures:read
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('measures.read'),
  measureDefinitionController.getDefinitionById
);

/**
 * POST /api/measures
 * Create new measure definition
 * Permission: measures:create
 */
router.post(
  '/',
  authenticate,
  requirePermission('measures.create'),
  measureDefinitionController.createDefinition
);

/**
 * PUT /api/measures/:id
 * Update measure definition
 * Permission: measures:update
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('measures.update'),
  measureDefinitionController.updateDefinition
);

/**
 * DELETE /api/measures/:id
 * Delete measure definition (soft delete)
 * Permission: measures:delete
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('measures.delete'),
  measureDefinitionController.deleteDefinition
);

// ===========================================
// Translation Routes
// Sprint 4: US-5.4.2 - Translation Support
// ===========================================

/**
 * GET /api/measures/:measureId/translations
 * Get all translations for a measure definition (all languages)
 * Permission: measures:read
 */
router.get(
  '/:measureId/translations',
  authenticate,
  requirePermission('measures.read'),
  param('measureId').isUUID().withMessage('Invalid measure ID'),
  measureTranslationController.getAllTranslations
);

/**
 * GET /api/measures/:measureId/translations/:languageCode
 * Get translations for a measure in a specific language
 * Permission: measures:read
 */
router.get(
  '/:measureId/translations/:languageCode',
  authenticate,
  requirePermission('measures.read'),
  param('measureId').isUUID().withMessage('Invalid measure ID'),
  param('languageCode').matches(/^[a-z]{2}(-[A-Z]{2})?$/).withMessage('Invalid language code'),
  measureTranslationController.getTranslations
);

/**
 * POST /api/measures/:measureId/translations/:languageCode
 * Set translations for a measure in a specific language (bulk)
 * Permission: measures:update
 * Body: { display_name: "...", description: "...", unit: "..." }
 */
router.post(
  '/:measureId/translations/:languageCode',
  authenticate,
  requirePermission('measures.update'),
  param('measureId').isUUID().withMessage('Invalid measure ID'),
  param('languageCode').matches(/^[a-z]{2}(-[A-Z]{2})?$/).withMessage('Invalid language code'),
  body().isObject().withMessage('Request body must be an object'),
  measureTranslationController.setTranslations
);

/**
 * PUT /api/measures/:measureId/translations/:languageCode/:fieldName
 * Set a single translation field
 * Permission: measures:update
 * Body: { value: "..." }
 */
router.put(
  '/:measureId/translations/:languageCode/:fieldName',
  authenticate,
  requirePermission('measures.update'),
  param('measureId').isUUID().withMessage('Invalid measure ID'),
  param('languageCode').matches(/^[a-z]{2}(-[A-Z]{2})?$/).withMessage('Invalid language code'),
  param('fieldName').isIn(['display_name', 'description', 'unit']).withMessage('Invalid field name'),
  body('value').isString().withMessage('Value must be a string'),
  measureTranslationController.setTranslation
);

/**
 * DELETE /api/measures/translations/:translationId
 * Delete a translation
 * Permission: measures:update
 */
router.delete(
  '/translations/:translationId',
  authenticate,
  requirePermission('measures.update'),
  param('translationId').isUUID().withMessage('Invalid translation ID'),
  measureTranslationController.deleteTranslation
);

/**
 * GET /api/measures/:measureId/translated/:languageCode
 * Get measure definition with translations applied
 * Permission: measures:read
 * Query params: ?fallback=en (default language for missing translations)
 */
router.get(
  '/:measureId/translated/:languageCode',
  authenticate,
  requirePermission('measures.read'),
  param('measureId').isUUID().withMessage('Invalid measure ID'),
  param('languageCode').matches(/^[a-z]{2}(-[A-Z]{2})?$/).withMessage('Invalid language code'),
  measureTranslationController.getMeasureWithTranslations
);

module.exports = router;
