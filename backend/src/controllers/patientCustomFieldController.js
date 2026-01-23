const patientCustomFieldService = require('../services/patientCustomField.service');
const { body, param, validationResult } = require('express-validator');

/**
 * Patient Custom Field Controller
 * Handles HTTP requests for patient custom field values
 */

/**
 * Get all custom field values for a patient
 * GET /api/patients/:patientId/custom-fields
 */
const getPatientCustomFields = async (req, res) => {
  try {
    const { patientId } = req.params;
    const user = req.user;
    const language = req.query.language || user.language_preference || 'fr';

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const fields = await patientCustomFieldService.getPatientCustomFields(user, patientId, language, requestMetadata);

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('Get patient custom fields error:', error);
    const statusCode = error.message === 'Access denied to this patient' ? 403 : (error.statusCode || 500);
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get patient custom fields'
    });
  }
};

/**
 * Update custom field values for a patient (bulk update)
 * PUT /api/patients/:patientId/custom-fields
 */
const updatePatientCustomFields = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { patientId } = req.params;
    const { fields } = req.body;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await patientCustomFieldService.bulkUpdatePatientFields(user, patientId, fields, requestMetadata);

    res.json({
      success: true,
      data: result.results,
      message: result.message
    });
  } catch (error) {
    console.error('Update patient custom fields error:', error);
    const statusCode = error.message === 'Access denied to this patient' ? 403 : (error.statusCode || 500);
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update patient custom fields'
    });
  }
};

/**
 * Delete a custom field value for a patient
 * DELETE /api/patients/:patientId/custom-fields/:fieldValueId
 */
const deletePatientCustomField = async (req, res) => {
  try {
    const { patientId, fieldValueId } = req.params;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await patientCustomFieldService.deletePatientCustomField(user, patientId, fieldValueId, requestMetadata);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Delete patient custom field error:', error);
    const statusCode = error.message === 'Access denied to this patient' ? 403 : (error.statusCode || 500);
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete patient custom field'
    });
  }
};

// Validation middleware
const validateUpdatePatientCustomFields = [
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  body('fields')
    .isArray({ min: 1 })
    .withMessage('Fields must be an array with at least one item'),
  body('fields.*.definition_id')
    .isUUID()
    .withMessage('Each field must have a valid definition_id'),
  body('fields.*.value')
    .exists()
    .withMessage('Each field must have a value property')
];

const validateDeletePatientCustomField = [
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('fieldValueId').isUUID().withMessage('Invalid field value ID')
];

module.exports = {
  getPatientCustomFields,
  updatePatientCustomFields,
  deletePatientCustomField,
  validateUpdatePatientCustomFields,
  validateDeletePatientCustomField
};
