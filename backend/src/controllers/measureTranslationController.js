/**
 * Measure Translation Controller
 *
 * Handles HTTP requests for measure translation management
 * Sprint 4: US-5.4.2 - Calculated Measures (Translation Support)
 */

const translationService = require('../services/measureTranslation.service');
const { param, body, validationResult } = require('express-validator');

/**
 * Get translations for a measure definition in a specific language
 * GET /api/measures/:measureId/translations/:languageCode
 */
const getTranslations = async (req, res) => {
  try {
    const { measureId, languageCode } = req.params;

    const translations = await translationService.getTranslations(
      measureId,
      languageCode
    );

    res.json({
      success: true,
      data: translations
    });
  } catch (error) {
    console.error('Get measure translations error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get translations'
    });
  }
};

/**
 * Get all translations for a measure definition (all languages)
 * GET /api/measures/:measureId/translations
 */
const getAllTranslations = async (req, res) => {
  try {
    const { measureId } = req.params;

    const translations = await translationService.getAllTranslationsForMeasure(measureId);

    res.json({
      success: true,
      data: translations
    });
  } catch (error) {
    console.error('Get all measure translations error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get translations'
    });
  }
};

/**
 * Set translations for a measure definition in a specific language (bulk)
 * POST /api/measures/:measureId/translations/:languageCode
 * Body: { display_name: "...", description: "...", unit: "..." }
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

    const { measureId, languageCode } = req.params;
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
      measureId,
      languageCode,
      translations,
      requestMetadata
    );

    res.json({
      success: true,
      data: result,
      message: 'Translations saved successfully'
    });
  } catch (error) {
    console.error('Set measure translations error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to set translations'
    });
  }
};

/**
 * Set a single translation field
 * PUT /api/measures/:measureId/translations/:languageCode/:fieldName
 * Body: { value: "translated text" }
 */
const setTranslation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { measureId, languageCode, fieldName } = req.params;
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
      measureId,
      languageCode,
      fieldName,
      value,
      requestMetadata
    );

    res.json({
      success: true,
      data: result,
      message: 'Translation updated successfully'
    });
  } catch (error) {
    console.error('Set measure translation error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update translation'
    });
  }
};

/**
 * Delete a translation
 * DELETE /api/measures/translations/:translationId
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

    await translationService.deleteTranslation(user, translationId, requestMetadata);

    res.json({
      success: true,
      message: 'Translation deleted successfully'
    });
  } catch (error) {
    console.error('Delete measure translation error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete translation'
    });
  }
};

/**
 * Get measure definition with translations applied
 * GET /api/measures/:measureId/translated/:languageCode
 * Optional query param: ?fallback=en
 */
const getMeasureWithTranslations = async (req, res) => {
  try {
    const { measureId, languageCode } = req.params;
    const fallbackLanguage = req.query.fallback || 'en';

    const measure = await translationService.getMeasureWithTranslations(
      measureId,
      languageCode,
      fallbackLanguage
    );

    res.json({
      success: true,
      data: measure
    });
  } catch (error) {
    console.error('Get measure with translations error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get measure with translations'
    });
  }
};

module.exports = {
  getTranslations,
  getAllTranslations,
  setTranslations,
  setTranslation,
  deleteTranslation,
  getMeasureWithTranslations
};
