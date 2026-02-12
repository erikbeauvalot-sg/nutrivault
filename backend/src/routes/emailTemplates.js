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
const emailTemplateService = require('../services/emailTemplate.service');
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
 * Admin can edit any, dietitian can edit their own overrides
 */
router.put(
  '/:id',
  authenticate,
  async (req, res, next) => {
    // Admin can edit anything
    if (req.user.role === 'ADMIN') return next();
    // Non-admin: check they own this template
    try {
      const template = await emailTemplateService.getTemplateById(req.params.id);
      if (template.user_id && template.user_id === req.user.id) return next();
      return res.status(403).json({ success: false, error: 'You can only edit your own template overrides' });
    } catch (error) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
  },
  emailTemplateController.validateUpdateTemplate,
  emailTemplateController.updateTemplate
);

/**
 * DELETE /api/email-templates/:id
 * Delete an email template
 * Admin can delete any non-system, dietitian can delete their own overrides
 */
router.delete(
  '/:id',
  authenticate,
  async (req, res, next) => {
    if (req.user.role === 'ADMIN') return next();
    try {
      const template = await emailTemplateService.getTemplateById(req.params.id);
      if (template.user_id && template.user_id === req.user.id) return next();
      return res.status(403).json({ success: false, error: 'You can only delete your own template overrides' });
    } catch (error) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
  },
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
 * POST /api/email-templates/:id/customize
 * Clone a system template for the current dietitian
 * All authenticated users (non-admin creates their own override)
 */
router.post(
  '/:id/customize',
  authenticate,
  async (req, res) => {
    try {
      const template = await emailTemplateService.customizeTemplate(req.params.id, req.user.id);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('Error customizing template:', error);
      const status = error.message.includes('already have') ? 409 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /api/email-templates/:id/reset-to-default
 * Delete dietitian's override, returning to system template
 * All authenticated users (can only reset their own)
 */
router.delete(
  '/:id/reset-to-default',
  authenticate,
  async (req, res) => {
    try {
      await emailTemplateService.resetToDefault(req.params.id, req.user.id);
      res.json({ success: true, message: 'Template reset to default' });
    } catch (error) {
      console.error('Error resetting template:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }
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
