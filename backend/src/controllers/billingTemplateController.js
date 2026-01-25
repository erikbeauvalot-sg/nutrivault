/**
 * Billing Template Controller
 * Handles HTTP requests for billing template operations
 */

const billingTemplateService = require('../services/billingTemplate.service');

/**
 * GET /api/billing-templates
 * Get all billing templates
 * ADMIN: sees all templates
 * DIETITIAN: sees only their own templates
 */
const getAllTemplates = async (req, res) => {
  try {
    const { is_active, search } = req.query;
    const user = req.user; // Contains id, role, etc.

    const filters = {};
    if (is_active !== undefined) {
      filters.is_active = is_active === 'true' || is_active === '1';
    }
    if (search) {
      filters.search = search;
    }

    const templates = await billingTemplateService.getAllTemplates(filters, user);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error getting all templates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get billing templates'
    });
  }
};

/**
 * GET /api/billing-templates/:id
 * Get billing template by ID
 * ADMIN: can view any template
 * DIETITIAN: can only view their own templates
 */
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user; // Contains id, role, etc.

    const template = await billingTemplateService.getTemplateById(id, user);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error getting template by ID:', error);
    let statusCode = 500;
    if (error.message === 'Template not found') statusCode = 404;
    if (error.message.includes('permission')) statusCode = 403;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get billing template'
    });
  }
};

/**
 * POST /api/billing-templates
 * Create new billing template
 */
const createTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const templateData = req.body;

    // Validate required fields
    if (!templateData.name) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    if (!templateData.items || templateData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Template must have at least one item'
      });
    }

    const template = await billingTemplateService.createTemplate(templateData, userId);

    res.status(201).json({
      success: true,
      message: 'Billing template created successfully',
      data: template
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error creating template:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create billing template'
    });
  }
};

/**
 * PUT /api/billing-templates/:id
 * Update billing template
 * Only ADMIN or template creator can update
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user; // Contains id, role, etc.
    const templateData = req.body;

    const template = await billingTemplateService.updateTemplate(id, templateData, user);

    res.json({
      success: true,
      message: 'Billing template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error updating template:', error);
    let statusCode = 400;
    if (error.message === 'Template not found') statusCode = 404;
    if (error.message.includes('permission')) statusCode = 403;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update billing template'
    });
  }
};

/**
 * DELETE /api/billing-templates/:id
 * Delete billing template
 * Only ADMIN or template creator can delete
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user; // Contains id, role, etc.

    const result = await billingTemplateService.deleteTemplate(id, user);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error deleting template:', error);
    let statusCode = 400;
    if (error.message === 'Template not found') statusCode = 404;
    if (error.message.includes('permission')) statusCode = 403;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete billing template'
    });
  }
};

/**
 * POST /api/billing-templates/:id/clone
 * Clone billing template
 */
const cloneTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    const clonedTemplate = await billingTemplateService.cloneTemplate(id, name, userId);

    res.status(201).json({
      success: true,
      message: 'Billing template cloned successfully',
      data: clonedTemplate
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error cloning template:', error);
    const statusCode = error.message === 'Template not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to clone billing template'
    });
  }
};

/**
 * GET /api/billing-templates/default
 * Get default billing template
 * ADMIN: gets global default template
 * DIETITIAN: gets their own default template
 */
const getDefaultTemplate = async (req, res) => {
  try {
    const user = req.user; // Contains id, role, etc.
    const template = await billingTemplateService.getDefaultTemplate(user);

    if (!template) {
      return res.json({
        success: true,
        data: null,
        message: 'No default template set'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error getting default template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get default billing template'
    });
  }
};

/**
 * POST /api/billing-templates/:id/set-default
 * Set template as default
 * Only ADMIN or template creator can set as default
 */
const setAsDefault = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user; // Contains id, role, etc.

    const template = await billingTemplateService.setAsDefault(id, user);

    res.json({
      success: true,
      message: 'Template set as default successfully',
      data: template
    });
  } catch (error) {
    console.error('[BillingTemplateController] Error setting default template:', error);
    let statusCode = 400;
    if (error.message === 'Template not found') statusCode = 404;
    if (error.message.includes('permission')) statusCode = 403;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to set default template'
    });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  getDefaultTemplate,
  setAsDefault
};
