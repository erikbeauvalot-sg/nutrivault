const emailTemplateService = require('../services/emailTemplate.service');
const { getAvailableVariablesByCategory, CATEGORY_VARIABLES } = require('../services/templateRenderer.service');
const { body, param, validationResult } = require('express-validator');

/**
 * Email Template Controller
 * Handles HTTP requests for email template management
 *
 * Sprint 5: US-5.5.2 - Email Templates
 */

/**
 * Validation rules for creating a template
 */
const validateCreateTemplate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Template name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Name must be 3-200 characters'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Slug must be 3-100 characters')
    .matches(/^[a-z0-9_-]+$/i).withMessage('Slug can only contain letters, numbers, underscores, and dashes'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['invoice', 'document_share', 'payment_reminder', 'appointment_reminder', 'follow_up', 'general'])
    .withMessage('Invalid category'),
  body('description')
    .optional()
    .trim(),
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 5, max: 500 }).withMessage('Subject must be 5-500 characters'),
  body('body_html')
    .trim()
    .notEmpty().withMessage('HTML body is required'),
  body('body_text')
    .optional()
    .trim(),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be boolean'),
  body('is_system')
    .optional()
    .isBoolean().withMessage('is_system must be boolean')
];

/**
 * Validation rules for updating a template
 */
const validateUpdateTemplate = [
  param('id')
    .isUUID().withMessage('Invalid template ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Template name cannot be empty')
    .isLength({ min: 3, max: 200 }).withMessage('Name must be 3-200 characters'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Slug must be 3-100 characters')
    .matches(/^[a-z0-9_-]+$/i).withMessage('Slug can only contain letters, numbers, underscores, and dashes'),
  body('category')
    .optional()
    .isIn(['invoice', 'document_share', 'payment_reminder', 'appointment_reminder', 'follow_up', 'general'])
    .withMessage('Invalid category'),
  body('subject')
    .optional()
    .trim()
    .notEmpty().withMessage('Subject cannot be empty')
    .isLength({ min: 5, max: 500 }).withMessage('Subject must be 5-500 characters'),
  body('body_html')
    .optional()
    .trim()
    .notEmpty().withMessage('HTML body cannot be empty'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be boolean')
];

/**
 * GET /api/email-templates
 * Get all email templates with optional filtering
 */
const getAllTemplates = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      is_system: req.query.is_system === 'true' ? true : req.query.is_system === 'false' ? false : undefined,
      search: req.query.search
    };

    const templates = await emailTemplateService.getAllTemplates(filters);

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Get all templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get templates'
    });
  }
};

/**
 * GET /api/email-templates/:id
 * Get template by ID
 */
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await emailTemplateService.getTemplateById(id);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get template by ID error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get template'
    });
  }
};

/**
 * POST /api/email-templates
 * Create a new email template
 */
const createTemplate = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const template = await emailTemplateService.createTemplate(req.body, userId);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Create template error:', error);
    const statusCode = error.message.includes('already exists') ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create template'
    });
  }
};

/**
 * PUT /api/email-templates/:id
 * Update an email template
 */
const updateTemplate = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const template = await emailTemplateService.updateTemplate(id, req.body, userId);

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Update template error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update template'
    });
  }
};

/**
 * DELETE /api/email-templates/:id
 * Delete an email template (soft delete)
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await emailTemplateService.deleteTemplate(id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('cannot be deleted') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete template'
    });
  }
};

/**
 * POST /api/email-templates/:id/duplicate
 * Duplicate a template
 */
const duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const overrides = req.body || {};

    const template = await emailTemplateService.duplicateTemplate(id, overrides, userId);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate template error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to duplicate template'
    });
  }
};

/**
 * PATCH /api/email-templates/:id/toggle-active
 * Toggle template active status
 */
const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const template = await emailTemplateService.toggleActive(id, userId);

    res.json({
      success: true,
      data: template,
      message: `Template ${template.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle active error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to toggle template status'
    });
  }
};

/**
 * POST /api/email-templates/:id/preview
 * Preview template with sample data
 */
const previewTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const sampleData = req.body || {};

    const template = await emailTemplateService.getTemplateById(id);
    const { renderTemplate, buildVariableContext, validateVariables } = require('../services/templateRenderer.service');

    // Build variable context from sample data
    const variables = buildVariableContext(sampleData);

    // Render template
    const rendered = renderTemplate(template, variables);

    // Validate variables in both subject and body
    const subjectValidation = validateVariables(template.subject, template.available_variables || []);
    const bodyValidation = validateVariables(template.body_html, template.available_variables || []);

    // Combine validation results
    const allUsedVars = new Set([...subjectValidation.used, ...bodyValidation.used]);
    const allMissingVars = new Set([...subjectValidation.missing, ...bodyValidation.missing]);

    const validation = {
      valid: subjectValidation.valid && bodyValidation.valid,
      missing: Array.from(allMissingVars),
      used: Array.from(allUsedVars)
    };

    res.json({
      success: true,
      data: {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        variables_used: variables,
        validation
      }
    });
  } catch (error) {
    console.error('Preview template error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to preview template'
    });
  }
};

/**
 * GET /api/email-templates/categories/:category/variables
 * Get available variables for a category
 */
const getAvailableVariables = async (req, res) => {
  try {
    const { category } = req.params;

    // Validate category
    if (!CATEGORY_VARIABLES[category]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    const variables = getAvailableVariablesByCategory(category);

    res.json({
      success: true,
      data: {
        category,
        variables
      }
    });
  } catch (error) {
    console.error('Get available variables error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get available variables'
    });
  }
};

/**
 * GET /api/email-templates/stats
 * Get template statistics
 */
const getTemplateStats = async (req, res) => {
  try {
    const stats = await emailTemplateService.getTemplateStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get template stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get template stats'
    });
  }
};

module.exports = {
  validateCreateTemplate,
  validateUpdateTemplate,
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  toggleActive,
  previewTemplate,
  getAvailableVariables,
  getTemplateStats
};
