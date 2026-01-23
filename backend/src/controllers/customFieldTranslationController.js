const translationService = require('../services/customFieldTranslation.service');
const { param, body, validationResult } = require('express-validator');

/**
 * Custom Field Translation Controller
 * Handles HTTP requests for custom field translation management
 */

/**
 * Get translations for an entity in a specific language
 * GET /api/custom-fields/:entityType/:entityId/translations/:languageCode
 */
const getTranslations = async (req, res) => {
  try {
    const { entityType, entityId, languageCode } = req.params;

    const translations = await translationService.getTranslations(
      entityId,
      entityType,
      languageCode
    );

    res.json({
      success: true,
      data: translations
    });
  } catch (error) {
    console.error('Get translations error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get translations'
    });
  }
};

/**
 * Get all translations for an entity (all languages)
 * GET /api/custom-fields/:entityType/:entityId/translations
 */
const getAllTranslations = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const translations = await translationService.getAllTranslations(
      entityId,
      entityType
    );

    res.json({
      success: true,
      data: translations
    });
  } catch (error) {
    console.error('Get all translations error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get translations'
    });
  }
};

/**
 * Set translations for an entity in a specific language (bulk)
 * POST /api/custom-fields/:entityType/:entityId/translations/:languageCode
 * Body: { name: "...", description: "..." } for categories
 *       { field_label: "...", help_text: "..." } for definitions
 */
const setTranslations = async (req, res) => {
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

    const { entityType, entityId, languageCode } = req.params;
    const translations = req.body;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await translationService.bulkSetTranslations(
      user,
      entityId,
      entityType,
      languageCode,
      translations,
      requestMetadata
    );

    res.json({
      success: true,
      message: 'Translations saved successfully',
      data: result
    });
  } catch (error) {
    console.error('Set translations error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save translations'
    });
  }
};

/**
 * Set a single translation
 * PUT /api/custom-fields/:entityType/:entityId/translations/:languageCode/:fieldName
 */
const setTranslation = async (req, res) => {
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

    const { entityType, entityId, languageCode, fieldName } = req.params;
    const { value } = req.body;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await translationService.setTranslation(
      user,
      entityId,
      entityType,
      languageCode,
      fieldName,
      value,
      requestMetadata
    );

    res.json({
      success: true,
      message: 'Translation saved successfully',
      data: result
    });
  } catch (error) {
    console.error('Set translation error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save translation'
    });
  }
};

/**
 * Delete a translation
 * DELETE /api/custom-fields/translations/:translationId
 */
const deleteTranslation = async (req, res) => {
  try {
    const { translationId } = req.params;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await translationService.deleteTranslation(
      user,
      translationId,
      requestMetadata
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Delete translation error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete translation'
    });
  }
};

// Validation rules
const translationValidation = {
  entityType: param('entityType')
    .isIn(['category', 'field_definition'])
    .withMessage('Entity type must be "category" or "field_definition"'),

  entityId: param('entityId')
    .isUUID()
    .withMessage('Invalid entity ID'),

  languageCode: param('languageCode')
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Language code must be in format "en" or "en-US"'),

  fieldName: param('fieldName')
    .isIn(['name', 'description', 'field_label', 'help_text'])
    .withMessage('Invalid field name'),

  value: body('value')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Translation value must be a string (max 5000 characters)'),

  translations: body()
    .isObject()
    .withMessage('Request body must be an object with field names as keys')
};

module.exports = {
  getTranslations,
  getAllTranslations,
  setTranslations,
  setTranslation,
  deleteTranslation,
  translationValidation
};
