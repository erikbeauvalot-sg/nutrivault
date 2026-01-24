/**
 * Formula Controller
 * Handles formula validation and preview requests
 */

const formulaEngine = require('../services/formulaEngine.service');
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

module.exports = {
  validateFormula,
  previewFormula,
  getOperators
};
