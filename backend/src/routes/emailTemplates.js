/**
 * Email Templates Routes
 *
 * All routes require authentication and appropriate permissions.
 * RBAC enforced via middleware.
 *
 * Admin-only routes: Creating, updating, and deleting templates
 * All authenticated users: Reading templates and previewing
 *
 * Sprint 5: US-5.5.2 - Email Templates
 */

const express = require('express');
const router = express.Router();
const emailTemplateController = require('../controllers/emailTemplateController');
const authenticate = require('../middleware/authenticate');
const { requirePermission, requireRole } = require('../middleware/rbac');

// ===========================================
// Template Routes
// ===========================================

/**
 * GET /api/email-templates
 * Get all email templates with optional filtering
 * Permission: users.read (all authenticated users)
 */
router.get(
  '/',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getAllTemplates
);

/**
 * GET /api/email-templates/stats
 * Get template statistics
 * Permission: users.read
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getTemplateStats
);

/**
 * GET /api/email-templates/categories/:category/variables
 * Get available variables for a category
 * Permission: users.read
 */
router.get(
  '/categories/:category/variables',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getAvailableVariables
);

/**
 * GET /api/email-templates/:id
 * Get template by ID
 * Permission: users.read
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getTemplateById
);

/**
 * POST /api/email-templates
 * Create a new email template
 * Role: ADMIN only
 */
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.validateCreateTemplate,
  emailTemplateController.createTemplate
);

/**
 * PUT /api/email-templates/:id
 * Update an email template
 * Role: ADMIN only
 */
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.validateUpdateTemplate,
  emailTemplateController.updateTemplate
);

/**
 * DELETE /api/email-templates/:id
 * Delete an email template (soft delete)
 * Role: ADMIN only
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.deleteTemplate
);

/**
 * POST /api/email-templates/:id/duplicate
 * Duplicate a template
 * Role: ADMIN only
 */
router.post(
  '/:id/duplicate',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.duplicateTemplate
);

/**
 * PATCH /api/email-templates/:id/toggle-active
 * Toggle template active status
 * Role: ADMIN only
 */
router.patch(
  '/:id/toggle-active',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.toggleActive
);

/**
 * POST /api/email-templates/:id/preview
 * Preview template with sample data
 * Permission: users.read
 */
router.post(
  '/:id/preview',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.previewTemplate
);

module.exports = router;
