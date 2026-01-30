/**
 * Visit Types Routes
 */

const express = require('express');
const router = express.Router();
const visitTypeController = require('../controllers/visitTypeController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * GET /api/visit-types
 * Get all visit types
 * Requires: authentication
 */
router.get(
  '/',
  authenticate,
  visitTypeController.getAllVisitTypes
);

/**
 * GET /api/visit-types/:id
 * Get visit type by ID
 * Requires: authentication
 */
router.get(
  '/:id',
  authenticate,
  visitTypeController.getVisitTypeById
);

/**
 * POST /api/visit-types
 * Create new visit type
 * Requires: authentication + admin role
 */
router.post(
  '/',
  authenticate,
  requirePermission('settings.manage'),
  visitTypeController.createVisitType
);

/**
 * PUT /api/visit-types/reorder
 * Reorder visit types
 * Requires: authentication + admin role
 * Note: Must be before /:id route to avoid conflict
 */
router.put(
  '/reorder',
  authenticate,
  requirePermission('settings.manage'),
  visitTypeController.reorderVisitTypes
);

/**
 * PUT /api/visit-types/:id
 * Update visit type
 * Requires: authentication + admin role
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('settings.manage'),
  visitTypeController.updateVisitType
);

/**
 * DELETE /api/visit-types/:id
 * Delete visit type
 * Requires: authentication + admin role
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('settings.manage'),
  visitTypeController.deleteVisitType
);

module.exports = router;
