/**
 * Measure Definitions Routes
 *
 * Routes for managing measure definitions.
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

const express = require('express');
const router = express.Router();
const measureDefinitionController = require('../controllers/measureDefinitionController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

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

module.exports = router;
