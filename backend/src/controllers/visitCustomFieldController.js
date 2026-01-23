/**
 * Visit Custom Field Controller
 *
 * Handles HTTP requests for visit custom field operations
 */

const visitCustomFieldService = require('../services/visitCustomField.service');

/**
 * Get all custom field values for a visit
 * GET /api/visits/:visitId/custom-fields
 */
async function getVisitCustomFields(req, res) {
  try {
    const { visitId } = req.params;
    const language = req.query.language || req.user.language_preference || 'fr';
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    };

    const customFields = await visitCustomFieldService.getVisitCustomFields(
      req.user,
      visitId,
      language,
      requestMetadata
    );

    res.json({
      success: true,
      data: customFields
    });
  } catch (error) {
    console.error('Error getting visit custom fields:', error);
    res.status(error.message.includes('Access denied') ? 403 : 500).json({
      success: false,
      error: error.message || 'Failed to retrieve visit custom fields'
    });
  }
}

/**
 * Bulk update custom field values for a visit
 * PUT /api/visits/:visitId/custom-fields
 * Body: { fields: [{ definition_id, value }, ...] }
 */
async function bulkUpdateVisitFields(req, res) {
  try {
    const { visitId } = req.params;
    const { fields } = req.body;

    if (!Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Fields must be an array'
      });
    }

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    };

    const result = await visitCustomFieldService.bulkUpdateVisitFields(
      req.user,
      visitId,
      fields,
      requestMetadata
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error bulk updating visit custom fields:', error);
    res.status(error.message.includes('Access denied') ? 403 : 400).json({
      success: false,
      error: error.message || 'Failed to update visit custom fields'
    });
  }
}

/**
 * Delete a custom field value for a visit
 * DELETE /api/visits/:visitId/custom-fields/:fieldValueId
 */
async function deleteVisitCustomField(req, res) {
  try {
    const { visitId, fieldValueId } = req.params;
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    };

    const result = await visitCustomFieldService.deleteVisitCustomField(
      req.user,
      visitId,
      fieldValueId,
      requestMetadata
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error deleting visit custom field:', error);
    res.status(error.message.includes('Access denied') ? 403 : 500).json({
      success: false,
      error: error.message || 'Failed to delete visit custom field'
    });
  }
}

module.exports = {
  getVisitCustomFields,
  bulkUpdateVisitFields,
  deleteVisitCustomField
};
