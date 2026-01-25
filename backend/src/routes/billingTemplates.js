/**
 * Billing Templates Routes
 */

const express = require('express');
const router = express.Router();
const billingTemplateController = require('../controllers/billingTemplateController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * GET /api/billing-templates/default
 * Get default billing template
 * Requires: authentication
 * Note: Must be before /:id route to avoid conflict
 */
router.get(
  '/default',
  authenticate,
  billingTemplateController.getDefaultTemplate
);

/**
 * GET /api/billing-templates
 * Get all billing templates
 * Requires: authentication + billing.read permission
 */
router.get(
  '/',
  authenticate,
  requirePermission('billing.read'),
  billingTemplateController.getAllTemplates
);

/**
 * GET /api/billing-templates/:id
 * Get billing template by ID
 * Requires: authentication + billing.read permission
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('billing.read'),
  billingTemplateController.getTemplateById
);

/**
 * POST /api/billing-templates
 * Create new billing template
 * Requires: authentication + billing.create permission
 */
router.post(
  '/',
  authenticate,
  requirePermission('billing.create'),
  billingTemplateController.createTemplate
);

/**
 * PUT /api/billing-templates/:id
 * Update billing template
 * Requires: authentication + billing.update permission
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('billing.update'),
  billingTemplateController.updateTemplate
);

/**
 * DELETE /api/billing-templates/:id
 * Delete billing template
 * Requires: authentication + billing.delete permission
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('billing.delete'),
  billingTemplateController.deleteTemplate
);

/**
 * POST /api/billing-templates/:id/clone
 * Clone billing template
 * Requires: authentication + billing.create permission
 */
router.post(
  '/:id/clone',
  authenticate,
  requirePermission('billing.create'),
  billingTemplateController.cloneTemplate
);

/**
 * POST /api/billing-templates/:id/set-default
 * Set template as default
 * Requires: authentication + billing.update permission
 */
router.post(
  '/:id/set-default',
  authenticate,
  requirePermission('billing.update'),
  billingTemplateController.setAsDefault
);

module.exports = router;
