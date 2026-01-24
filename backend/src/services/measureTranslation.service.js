/**
 * Measure Translation Service
 *
 * Business logic for managing translations of measure definitions.
 * Supports multi-language interface with fallback logic.
 *
 * Sprint 4: US-5.4.2 - Calculated Measures (Translation Support)
 */

const db = require('../../../models');
const MeasureTranslation = db.MeasureTranslation;
const MeasureDefinition = db.MeasureDefinition;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all translations for a measure definition
 *
 * @param {string} measureDefinitionId - MeasureDefinition UUID
 * @param {string} languageCode - Language code (e.g., 'fr', 'en')
 * @returns {Promise<Object>} Object with field names as keys and translations as values
 */
async function getTranslations(measureDefinitionId, languageCode) {
  try {
    const translations = await MeasureTranslation.findAll({
      where: {
        entity_id: measureDefinitionId,
        entity_type: 'measure_definition',
        language_code: languageCode
      }
    });

    // Convert to object format for easier access
    const translationMap = {};
    translations.forEach(t => {
      translationMap[t.field_name] = t.translated_value;
    });

    return translationMap;
  } catch (error) {
    console.error('Error in getTranslations:', error);
    throw error;
  }
}

/**
 * Get a specific translation
 *
 * @param {string} measureDefinitionId - MeasureDefinition UUID
 * @param {string} languageCode - Language code
 * @param {string} fieldName - Field name to translate (display_name, description, unit)
 * @returns {Promise<string|null>} Translated value or null
 */
async function getTranslation(measureDefinitionId, languageCode, fieldName) {
  try {
    const translation = await MeasureTranslation.findOne({
      where: {
        entity_id: measureDefinitionId,
        entity_type: 'measure_definition',
        language_code: languageCode,
        field_name: fieldName
      }
    });

    return translation ? translation.translated_value : null;
  } catch (error) {
    console.error('Error in getTranslation:', error);
    throw error;
  }
}

/**
 * Set a translation (create or update)
 *
 * @param {Object} user - Authenticated user object
 * @param {string} measureDefinitionId - MeasureDefinition UUID
 * @param {string} languageCode - Language code
 * @param {string} fieldName - Field name to translate
 * @param {string} translatedValue - Translated text
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created or updated translation
 */
async function setTranslation(user, measureDefinitionId, languageCode, fieldName, translatedValue, requestMetadata = {}) {
  try {
    // Validate measure definition exists
    const measureDef = await MeasureDefinition.findByPk(measureDefinitionId);
    if (!measureDef) {
      const error = new Error('Measure definition not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate field name
    const validFieldNames = ['display_name', 'description', 'unit'];
    if (!validFieldNames.includes(fieldName)) {
      const error = new Error(`Invalid field name for measure_definition: ${fieldName}. Valid fields: ${validFieldNames.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // Find or create translation
    const [translation, created] = await MeasureTranslation.findOrCreate({
      where: {
        entity_id: measureDefinitionId,
        entity_type: 'measure_definition',
        language_code: languageCode,
        field_name: fieldName
      },
      defaults: {
        translated_value: translatedValue
      }
    });

    // If it existed, update the value
    if (!created && translation.translated_value !== translatedValue) {
      const beforeData = translation.toJSON();
      translation.translated_value = translatedValue;
      await translation.save();

      // Audit log for update
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        resource_type: 'measure_translation',
        resource_id: translation.id,
        changes: { before: beforeData, after: translation.toJSON() },
        ...requestMetadata
      });
    } else if (created) {
      // Audit log for creation
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'CREATE',
        resource_type: 'measure_translation',
        resource_id: translation.id,
        changes: { after: translation.toJSON() },
        ...requestMetadata
      });
    }

    return translation;
  } catch (error) {
    console.error('Error in setTranslation:', error);
    throw error;
  }
}

/**
 * Set multiple translations at once for a measure definition
 *
 * @param {Object} user - Authenticated user object
 * @param {string} measureDefinitionId - MeasureDefinition UUID
 * @param {string} languageCode - Language code
 * @param {Object} translations - Object with field names as keys and translations as values
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Array of created/updated translations
 */
async function bulkSetTranslations(user, measureDefinitionId, languageCode, translations, requestMetadata = {}) {
  try {
    // Validate measure definition exists
    const measureDef = await MeasureDefinition.findByPk(measureDefinitionId);
    if (!measureDef) {
      const error = new Error('Measure definition not found');
      error.statusCode = 404;
      throw error;
    }

    const validFieldNames = ['display_name', 'description', 'unit'];
    const results = [];

    // Use transaction for bulk operations
    const transaction = await db.sequelize.transaction();

    try {
      for (const [fieldName, translatedValue] of Object.entries(translations)) {
        // Skip invalid field names
        if (!validFieldNames.includes(fieldName)) {
          console.warn(`Skipping invalid field name: ${fieldName}`);
          continue;
        }

        // Skip empty values
        if (!translatedValue || translatedValue.trim() === '') {
          continue;
        }

        const [translation, created] = await MeasureTranslation.findOrCreate({
          where: {
            entity_id: measureDefinitionId,
            entity_type: 'measure_definition',
            language_code: languageCode,
            field_name: fieldName
          },
          defaults: {
            translated_value: translatedValue
          },
          transaction
        });

        if (!created && translation.translated_value !== translatedValue) {
          translation.translated_value = translatedValue;
          await translation.save({ transaction });
        }

        results.push(translation);
      }

      await transaction.commit();

      // Audit log for bulk operation
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        resource_type: 'measure_translations',
        resource_id: measureDefinitionId,
        changes: {
          after: {
            language_code: languageCode,
            count: results.length
          }
        },
        ...requestMetadata
      });

      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error in bulkSetTranslations:', error);
    throw error;
  }
}

/**
 * Delete a translation
 *
 * @param {Object} user - Authenticated user object
 * @param {string} translationId - Translation UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result object
 */
async function deleteTranslation(user, translationId, requestMetadata = {}) {
  try {
    const translation = await MeasureTranslation.findByPk(translationId);

    if (!translation) {
      const error = new Error('Translation not found');
      error.statusCode = 404;
      throw error;
    }

    const translationData = translation.toJSON();
    await translation.destroy();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'measure_translation',
      resource_id: translationId,
      changes: { before: translationData },
      ...requestMetadata
    });

    return { message: 'Translation deleted successfully' };
  } catch (error) {
    console.error('Error in deleteTranslation:', error);
    throw error;
  }
}

/**
 * Get all available translations for a measure definition
 *
 * @param {string} measureDefinitionId - MeasureDefinition UUID
 * @returns {Promise<Object>} Object with language codes as keys, containing translation objects
 */
async function getAllTranslationsForMeasure(measureDefinitionId) {
  try {
    const translations = await MeasureTranslation.findAll({
      where: {
        entity_id: measureDefinitionId,
        entity_type: 'measure_definition'
      },
      order: [['language_code', 'ASC'], ['field_name', 'ASC']]
    });

    // Group by language code
    const translationsByLanguage = {};
    translations.forEach(t => {
      if (!translationsByLanguage[t.language_code]) {
        translationsByLanguage[t.language_code] = {};
      }
      translationsByLanguage[t.language_code][t.field_name] = t.translated_value;
    });

    return translationsByLanguage;
  } catch (error) {
    console.error('Error in getAllTranslationsForMeasure:', error);
    throw error;
  }
}

/**
 * Get measure definition with translations applied
 * Returns measure with translated fields based on preferred language
 *
 * @param {string} measureDefinitionId - MeasureDefinition UUID
 * @param {string} languageCode - Preferred language code
 * @param {string} fallbackLanguageCode - Fallback language (default: 'en')
 * @returns {Promise<Object>} Measure definition with translations applied
 */
async function getMeasureWithTranslations(measureDefinitionId, languageCode, fallbackLanguageCode = 'en') {
  try {
    const measureDef = await MeasureDefinition.findByPk(measureDefinitionId);

    if (!measureDef) {
      const error = new Error('Measure definition not found');
      error.statusCode = 404;
      throw error;
    }

    // Get translations for preferred language
    const translations = await getTranslations(measureDefinitionId, languageCode);

    // Get fallback translations if needed
    let fallbackTranslations = {};
    if (languageCode !== fallbackLanguageCode) {
      fallbackTranslations = await getTranslations(measureDefinitionId, fallbackLanguageCode);
    }

    // Apply translations with fallback logic
    const result = measureDef.toJSON();
    result.display_name = translations.display_name || fallbackTranslations.display_name || result.display_name;
    result.description = translations.description || fallbackTranslations.description || result.description;
    result.unit = translations.unit || fallbackTranslations.unit || result.unit;

    return result;
  } catch (error) {
    console.error('Error in getMeasureWithTranslations:', error);
    throw error;
  }
}

module.exports = {
  getTranslations,
  getTranslation,
  setTranslation,
  bulkSetTranslations,
  deleteTranslation,
  getAllTranslationsForMeasure,
  getMeasureWithTranslations
};
