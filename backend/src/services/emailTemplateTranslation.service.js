/**
 * Email Template Translation Service
 * US-5.5.6: Email Template Multi-Language Support
 *
 * Manages translations for email templates using the MeasureTranslation model
 * with entity_type = 'email_template'
 */

const db = require('../../../models');
const { MeasureTranslation, EmailTemplate } = db;
const { Op } = db.Sequelize;

const ENTITY_TYPE = 'email_template';
const VALID_FIELDS = ['subject', 'body_html', 'body_text'];

// Supported languages configuration
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

const DEFAULT_LANGUAGE = process.env.DEFAULT_EMAIL_LANGUAGE || 'en';
const FALLBACK_LANGUAGE = process.env.FALLBACK_EMAIL_LANGUAGE || 'en';

/**
 * Get all translations for a template
 * @param {string} templateId - Email template UUID
 * @returns {Promise<Object>} Object keyed by language code with translations
 */
async function getTranslations(templateId) {
  const translations = await MeasureTranslation.findAll({
    where: {
      entity_type: ENTITY_TYPE,
      entity_id: templateId
    },
    order: [['language_code', 'ASC'], ['field_name', 'ASC']]
  });

  // Group by language code
  const grouped = {};
  translations.forEach(t => {
    if (!grouped[t.language_code]) {
      grouped[t.language_code] = {};
    }
    grouped[t.language_code][t.field_name] = t.translated_value;
  });

  return grouped;
}

/**
 * Get translation for a specific language
 * @param {string} templateId - Email template UUID
 * @param {string} languageCode - Language code (e.g., 'fr')
 * @returns {Promise<Object|null>} Translation object or null
 */
async function getTranslation(templateId, languageCode) {
  const translations = await MeasureTranslation.findAll({
    where: {
      entity_type: ENTITY_TYPE,
      entity_id: templateId,
      language_code: languageCode
    }
  });

  if (translations.length === 0) {
    return null;
  }

  const result = { language_code: languageCode };
  translations.forEach(t => {
    result[t.field_name] = t.translated_value;
  });

  return result;
}

/**
 * Get available languages for a template
 * @param {string} templateId - Email template UUID
 * @returns {Promise<string[]>} Array of language codes
 */
async function getAvailableLanguages(templateId) {
  const translations = await MeasureTranslation.findAll({
    where: {
      entity_type: ENTITY_TYPE,
      entity_id: templateId
    },
    attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('language_code')), 'language_code']],
    raw: true
  });

  return translations.map(t => t.language_code);
}

/**
 * Set translation for a specific field
 * @param {string} templateId - Email template UUID
 * @param {string} languageCode - Language code
 * @param {string} fieldName - Field name (subject, body_html, body_text)
 * @param {string} value - Translated value
 * @returns {Promise<Object>} Created/updated translation
 */
async function setTranslation(templateId, languageCode, fieldName, value) {
  if (!VALID_FIELDS.includes(fieldName)) {
    throw new Error(`Invalid field name. Must be one of: ${VALID_FIELDS.join(', ')}`);
  }

  const [translation, created] = await MeasureTranslation.findOrCreate({
    where: {
      entity_type: ENTITY_TYPE,
      entity_id: templateId,
      language_code: languageCode,
      field_name: fieldName
    },
    defaults: {
      translated_value: value
    }
  });

  if (!created) {
    translation.translated_value = value;
    await translation.save();
  }

  return translation;
}

/**
 * Set all translations for a language at once
 * @param {string} templateId - Email template UUID
 * @param {string} languageCode - Language code
 * @param {Object} translations - Object with subject, body_html, body_text
 * @returns {Promise<Object>} All translations for the language
 */
async function setAllTranslations(templateId, languageCode, translations) {
  const results = {};

  for (const fieldName of VALID_FIELDS) {
    if (translations[fieldName] !== undefined) {
      const translation = await setTranslation(
        templateId,
        languageCode,
        fieldName,
        translations[fieldName]
      );
      results[fieldName] = translation.translated_value;
    }
  }

  return {
    language_code: languageCode,
    ...results
  };
}

/**
 * Delete all translations for a language
 * @param {string} templateId - Email template UUID
 * @param {string} languageCode - Language code
 * @returns {Promise<number>} Number of deleted records
 */
async function deleteTranslations(templateId, languageCode) {
  const deleted = await MeasureTranslation.destroy({
    where: {
      entity_type: ENTITY_TYPE,
      entity_id: templateId,
      language_code: languageCode
    }
  });

  return deleted;
}

/**
 * Delete all translations for a template (when template is deleted)
 * @param {string} templateId - Email template UUID
 * @returns {Promise<number>} Number of deleted records
 */
async function deleteAllTranslationsForTemplate(templateId) {
  const deleted = await MeasureTranslation.destroy({
    where: {
      entity_type: ENTITY_TYPE,
      entity_id: templateId
    }
  });

  return deleted;
}

/**
 * Get translated template content with fallback logic
 * @param {string} templateId - Email template UUID
 * @param {string} preferredLanguage - Patient's preferred language
 * @returns {Promise<Object>} Template content in best available language
 */
async function getTemplateInLanguage(templateId, preferredLanguage) {
  // Get base template
  const template = await EmailTemplate.findByPk(templateId);
  if (!template) {
    throw new Error('Email template not found');
  }

  // Try preferred language first
  if (preferredLanguage) {
    const translation = await getTranslation(templateId, preferredLanguage);
    if (translation && translation.subject && translation.body_html) {
      return {
        subject: translation.subject,
        body_html: translation.body_html,
        body_text: translation.body_text || template.body_text,
        language_used: preferredLanguage,
        is_translation: true
      };
    }
  }

  // Try fallback language
  if (FALLBACK_LANGUAGE !== preferredLanguage) {
    const fallbackTranslation = await getTranslation(templateId, FALLBACK_LANGUAGE);
    if (fallbackTranslation && fallbackTranslation.subject && fallbackTranslation.body_html) {
      return {
        subject: fallbackTranslation.subject,
        body_html: fallbackTranslation.body_html,
        body_text: fallbackTranslation.body_text || template.body_text,
        language_used: FALLBACK_LANGUAGE,
        is_translation: true
      };
    }
  }

  // Use base template
  return {
    subject: template.subject,
    body_html: template.body_html,
    body_text: template.body_text,
    language_used: null,
    is_translation: false
  };
}

/**
 * Copy base template content as starting point for translation
 * @param {string} templateId - Email template UUID
 * @returns {Promise<Object>} Base template content
 */
async function getBaseTemplateContent(templateId) {
  const template = await EmailTemplate.findByPk(templateId);
  if (!template) {
    throw new Error('Email template not found');
  }

  return {
    subject: template.subject,
    body_html: template.body_html,
    body_text: template.body_text
  };
}

/**
 * Get supported languages list
 * @returns {Array} Array of supported language objects
 */
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

module.exports = {
  getTranslations,
  getTranslation,
  getAvailableLanguages,
  setTranslation,
  setAllTranslations,
  deleteTranslations,
  deleteAllTranslationsForTemplate,
  getTemplateInLanguage,
  getBaseTemplateContent,
  getSupportedLanguages,
  VALID_FIELDS,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE
};
