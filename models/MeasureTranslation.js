/**
 * MeasureTranslation Model
 *
 * Stores translations for measure definitions and email templates
 * Supports multi-language interface using a polymorphic pattern
 *
 * Sprint 4: US-5.4.2 - Calculated Measures (Translation Support)
 * Sprint 5: US-5.5.6 - Email Template Multi-Language Support
 */

// Valid field names per entity type
const VALID_FIELDS_BY_ENTITY_TYPE = {
  measure_definition: ['display_name', 'description', 'unit'],
  email_template: ['subject', 'body_html', 'body_text']
};

const VALID_ENTITY_TYPES = Object.keys(VALID_FIELDS_BY_ENTITY_TYPE);

module.exports = (sequelize, DataTypes) => {
  const MeasureTranslation = sequelize.define('MeasureTranslation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'measure_definition',
      validate: {
        isIn: {
          args: [VALID_ENTITY_TYPES],
          msg: `Entity type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`
        }
      },
      comment: 'Type of entity being translated (measure_definition, email_template)'
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        isUUID: 4
      },
      comment: 'ID of the entity being translated'
    },
    language_code: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: {
        len: [2, 5],
        isValidLanguageCode(value) {
          // Support standard language codes: en, fr, es, en-US, fr-CA, etc.
          const languageCodePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
          if (!languageCodePattern.test(value)) {
            throw new Error('Language code must be in format "en" or "en-US"');
          }
        }
      },
      comment: 'Language code (e.g., "fr", "en", "es", "en-US")'
    },
    field_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50]
      },
      comment: 'Name of the field being translated'
    },
    translated_value: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 5000] // Reasonable max length for translations
      },
      comment: 'The translated text value'
    }
  }, {
    tableName: 'measure_translations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['entity_id', 'language_code', 'field_name'],
        name: 'unique_measure_translation_per_entity_language_field'
      },
      {
        fields: ['entity_type', 'entity_id'],
        name: 'idx_measure_translations_entity'
      },
      {
        fields: ['language_code'],
        name: 'idx_measure_translations_language'
      },
      {
        fields: ['entity_id', 'language_code'],
        name: 'idx_measure_translations_entity_language'
      }
    ]
  });

  MeasureTranslation.associate = function(models) {
    // Polymorphic association with MeasureDefinition
    // Handled at service layer based on entity_type and entity_id
    MeasureTranslation.belongsTo(models.MeasureDefinition, {
      foreignKey: 'entity_id',
      constraints: false,
      as: 'measureDefinition'
    });

    // Polymorphic association with EmailTemplate
    MeasureTranslation.belongsTo(models.EmailTemplate, {
      foreignKey: 'entity_id',
      constraints: false,
      as: 'emailTemplate'
    });
  };

  /**
   * Get valid field names for a given entity type
   * @param {string} entityType - The entity type
   * @returns {string[]} Array of valid field names
   */
  MeasureTranslation.getValidFieldNames = function(entityType) {
    return VALID_FIELDS_BY_ENTITY_TYPE[entityType] || [];
  };

  /**
   * Check if a field name is valid for a given entity type
   * @param {string} entityType - The entity type
   * @param {string} fieldName - The field name to validate
   * @returns {boolean} True if valid
   */
  MeasureTranslation.isValidFieldName = function(entityType, fieldName) {
    const validFields = VALID_FIELDS_BY_ENTITY_TYPE[entityType];
    return validFields ? validFields.includes(fieldName) : false;
  };

  /**
   * Get all valid entity types
   * @returns {string[]} Array of valid entity types
   */
  MeasureTranslation.getValidEntityTypes = function() {
    return VALID_ENTITY_TYPES;
  };

  return MeasureTranslation;
};
