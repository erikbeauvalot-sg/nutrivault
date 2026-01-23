/**
 * Custom Field Translation Service
 *
 * Business logic for managing translations of custom field categories and definitions.
 * Supports multi-language interface with fallback logic.
 */

const db = require('../../../models');
const CustomFieldTranslation = db.CustomFieldTranslation;
const CustomFieldCategory = db.CustomFieldCategory;
const CustomFieldDefinition = db.CustomFieldDefinition;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all translations for an entity
 *
 * @param {string} entityId - Entity UUID (category or field_definition)
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} languageCode - Language code (e.g., 'fr', 'en')
 * @returns {Promise<Object>} Object with field names as keys and translations as values
 */
async function getTranslations(entityId, entityType, languageCode) {
  try {
    const translations = await CustomFieldTranslation.findAll({
      where: {
        entity_id: entityId,
        entity_type: entityType,
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
 * @param {string} entityId - Entity UUID
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} languageCode - Language code
 * @param {string} fieldName - Field name to translate
 * @returns {Promise<string|null>} Translated value or null
 */
async function getTranslation(entityId, entityType, languageCode, fieldName) {
  try {
    const translation = await CustomFieldTranslation.findOne({
      where: {
        entity_id: entityId,
        entity_type: entityType,
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
 * @param {string} entityId - Entity UUID
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} languageCode - Language code
 * @param {string} fieldName - Field name to translate
 * @param {string} translatedValue - Translated text
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created or updated translation
 */
async function setTranslation(user, entityId, entityType, languageCode, fieldName, translatedValue, requestMetadata = {}) {
  try {
    // Validate entity exists
    const entityExists = await validateEntity(entityId, entityType);
    if (!entityExists) {
      const error = new Error(`${entityType} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Validate field name
    const validFieldNames = getValidFieldNames(entityType);
    if (!validFieldNames.includes(fieldName)) {
      const error = new Error(`Invalid field name for ${entityType}: ${fieldName}`);
      error.statusCode = 400;
      throw error;
    }

    // Find or create translation
    const [translation, created] = await CustomFieldTranslation.findOrCreate({
      where: {
        entity_id: entityId,
        entity_type: entityType,
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
        resource_type: 'custom_field_translation',
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
        resource_type: 'custom_field_translation',
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
 * Set multiple translations at once for an entity
 *
 * @param {Object} user - Authenticated user object
 * @param {string} entityId - Entity UUID
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} languageCode - Language code
 * @param {Object} translations - Object with field names as keys and translations as values
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Array of created/updated translations
 */
async function bulkSetTranslations(user, entityId, entityType, languageCode, translations, requestMetadata = {}) {
  try {
    // Validate entity exists
    const entityExists = await validateEntity(entityId, entityType);
    if (!entityExists) {
      const error = new Error(`${entityType} not found`);
      error.statusCode = 404;
      throw error;
    }

    const validFieldNames = getValidFieldNames(entityType);
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

        const [translation, created] = await CustomFieldTranslation.findOrCreate({
          where: {
            entity_id: entityId,
            entity_type: entityType,
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
        resource_type: 'custom_field_translations',
        resource_id: entityId,
        changes: {
          after: {
            entity_type: entityType,
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
 * @returns {Promise<Object>} Result
 */
async function deleteTranslation(user, translationId, requestMetadata = {}) {
  try {
    const translation = await CustomFieldTranslation.findByPk(translationId);

    if (!translation) {
      const error = new Error('Translation not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeData = translation.toJSON();
    await translation.destroy();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'custom_field_translation',
      resource_id: translationId,
      changes: { before: beforeData },
      ...requestMetadata
    });

    return { message: 'Translation deleted successfully' };
  } catch (error) {
    console.error('Error in deleteTranslation:', error);
    throw error;
  }
}

/**
 * Get entity with translations applied
 * Includes fallback logic: requested language → 'en' → original value
 *
 * @param {Object} entity - Category or Definition object
 * @param {string} entityType - 'category' or 'field_definition'
 * @param {string} languageCode - Desired language code
 * @returns {Promise<Object>} Entity with translated fields
 */
async function applyTranslations(entity, entityType, languageCode) {
  try {
    // If requesting the default language (French/original), return as-is
    if (languageCode === 'fr') {
      return entity;
    }

    const entityJson = entity.toJSON ? entity.toJSON() : entity;
    const translatedEntity = { ...entityJson };

    // Get translations for requested language
    const translations = await getTranslations(entity.id, entityType, languageCode);

    // If no translations found for requested language, try fallback to English
    let fallbackTranslations = {};
    if (Object.keys(translations).length === 0 && languageCode !== 'en') {
      fallbackTranslations = await getTranslations(entity.id, entityType, 'en');
    }

    // Apply translations to appropriate fields
    const fieldNames = getValidFieldNames(entityType);
    fieldNames.forEach(fieldName => {
      if (translations[fieldName]) {
        translatedEntity[fieldName] = translations[fieldName];
      } else if (fallbackTranslations[fieldName]) {
        translatedEntity[fieldName] = fallbackTranslations[fieldName];
      }
      // Otherwise, keep original value
    });

    return translatedEntity;
  } catch (error) {
    console.error('Error in applyTranslations:', error);
    // On error, return original entity
    return entity.toJSON ? entity.toJSON() : entity;
  }
}

/**
 * Get all translations for an entity across all languages
 *
 * @param {string} entityId - Entity UUID
 * @param {string} entityType - 'category' or 'field_definition'
 * @returns {Promise<Object>} Object with language codes as keys
 */
async function getAllTranslations(entityId, entityType) {
  try {
    const translations = await CustomFieldTranslation.findAll({
      where: {
        entity_id: entityId,
        entity_type: entityType
      }
    });

    // Group by language code
    const byLanguage = {};
    translations.forEach(t => {
      if (!byLanguage[t.language_code]) {
        byLanguage[t.language_code] = {};
      }
      byLanguage[t.language_code][t.field_name] = t.translated_value;
    });

    return byLanguage;
  } catch (error) {
    console.error('Error in getAllTranslations:', error);
    throw error;
  }
}

// Helper functions

/**
 * Validate that an entity exists
 *
 * @param {string} entityId - Entity UUID
 * @param {string} entityType - 'category' or 'field_definition'
 * @returns {Promise<boolean>} True if entity exists
 */
async function validateEntity(entityId, entityType) {
  if (entityType === 'category') {
    const category = await CustomFieldCategory.findByPk(entityId);
    return !!category;
  } else if (entityType === 'field_definition') {
    const definition = await CustomFieldDefinition.findByPk(entityId);
    return !!definition;
  }
  return false;
}

/**
 * Get valid field names for an entity type
 *
 * @param {string} entityType - 'category' or 'field_definition'
 * @returns {Array<string>} Valid field names
 */
function getValidFieldNames(entityType) {
  if (entityType === 'category') {
    return ['name', 'description'];
  } else if (entityType === 'field_definition') {
    return ['field_label', 'help_text'];
  }
  return [];
}

module.exports = {
  getTranslations,
  getTranslation,
  setTranslation,
  bulkSetTranslations,
  deleteTranslation,
  applyTranslations,
  getAllTranslations
};
