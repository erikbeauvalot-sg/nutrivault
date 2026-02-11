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
 * POST /api/email-templates/export
 * Export email templates with translations
 * Role: ADMIN only
 */
router.post(
  '/export',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.exportTemplates
);

/**
 * POST /api/email-templates/import
 * Import email templates with translations
 * Role: ADMIN only
 */
router.post(
  '/import',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.importTemplates
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

// ===========================================
// Translation Routes - US-5.5.6
// ===========================================

/**
 * GET /api/email-templates/supported-languages
 * Get list of supported languages
 * Permission: users.read
 */
router.get(
  '/supported-languages',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getSupportedLanguages
);

/**
 * GET /api/email-templates/:id/translations
 * Get all translations for a template
 * Permission: users.read
 */
router.get(
  '/:id/translations',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getTranslations
);

/**
 * GET /api/email-templates/:id/translations/:languageCode
 * Get translation for a specific language
 * Permission: users.read
 */
router.get(
  '/:id/translations/:languageCode',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getTranslation
);

/**
 * POST /api/email-templates/:id/translations/:languageCode
 * Create or update translation for a language
 * Role: ADMIN only
 */
router.post(
  '/:id/translations/:languageCode',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.saveTranslation
);

/**
 * PUT /api/email-templates/:id/translations/:languageCode
 * Update translation for a language (alias for POST)
 * Role: ADMIN only
 */
router.put(
  '/:id/translations/:languageCode',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.saveTranslation
);

/**
 * DELETE /api/email-templates/:id/translations/:languageCode
 * Delete translation for a language
 * Role: ADMIN only
 */
router.delete(
  '/:id/translations/:languageCode',
  authenticate,
  requireRole('ADMIN'),
  emailTemplateController.deleteTranslation
);

/**
 * GET /api/email-templates/:id/base-content
 * Get base template content for copying to translation
 * Permission: users.read
 */
router.get(
  '/:id/base-content',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.getBaseContent
);

/**
 * POST /api/email-templates/:id/preview-translation
 * Preview template in a specific language
 * Permission: users.read
 */
router.post(
  '/:id/preview-translation',
  authenticate,
  requirePermission('users.read'),
  emailTemplateController.previewTranslation
);

module.exports = router;
