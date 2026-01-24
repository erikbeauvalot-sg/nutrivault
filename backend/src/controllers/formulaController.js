/**
 * Formula Controller
 * Handles formula validation and preview requests
 */

const formulaEngine = require('../services/formulaEngine.service');
const templatesService = require('../services/formulaTemplates.service');
const auditService = require('../services/audit.service');

/**
 * Validate a formula
 * @route POST /api/formulas/validate
 */
async function validateFormula(req, res) {
  try {
    const { formula } = req.body;

    // Validate formula
    const validation = formulaEngine.validateFormula(formula);

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'VALIDATE',
      resource_type: 'formula',
      resource_id: null,
      details: { formula, valid: validation.valid },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error in validateFormula:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate formula'
    });
  }
}

/**
 * Preview formula evaluation with sample data
 * @route POST /api/formulas/preview
 */
async function previewFormula(req, res) {
  try {
    const { formula, values, decimalPlaces = 2 } = req.body;

    // Evaluate formula
    const result = formulaEngine.evaluateFormula(formula, values, decimalPlaces);

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'PREVIEW',
      resource_type: 'formula',
      resource_id: null,
      details: { formula, success: result.success },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in previewFormula:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview formula'
    });
  }
}

/**
 * Get available operators and functions
 * @route GET /api/formulas/operators
 */
async function getOperators(req, res) {
  try {
    const operators = formulaEngine.getAvailableOperators();

    res.json({
      success: true,
      data: operators
    });
  } catch (error) {
    console.error('Error in getOperators:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get operators'
    });
  }
}

/**
 * Get all formula templates
 * @route GET /api/formulas/templates
 */
async function getTemplates(req, res) {
  try {
    const templates = templatesService.getAllTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error in getTemplates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
}

/**
 * Apply a template
 * @route POST /api/formulas/templates/apply
 */
async function applyTemplate(req, res) {
  try {
    const { templateId, fieldMapping } = req.body;

    const result = templatesService.applyTemplate(templateId, fieldMapping);

    // Audit log
    await auditService.log({
      user_id: req.user.id,
      username: req.user.username,
      action: 'APPLY_TEMPLATE',
      resource_type: 'formula_template',
      resource_id: templateId,
      details: { fieldMapping },
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in applyTemplate:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to apply template'
    });
  }
}

module.exports = {
  validateFormula,
  previewFormula,
  getOperators,
  getTemplates,
  applyTemplate
};
