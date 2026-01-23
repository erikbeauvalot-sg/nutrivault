/**
 * CustomFieldTranslation Model
 * Stores translations for custom field categories and definitions
 * Supports multi-language interface without modifying core tables
 */

module.exports = (sequelize, DataTypes) => {
  const CustomFieldTranslation = sequelize.define('CustomFieldTranslation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.ENUM('category', 'field_definition'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['category', 'field_definition']],
          msg: 'Entity type must be either "category" or "field_definition"'
        }
      },
      comment: 'Type of entity being translated'
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        isUUID: 4
      },
      comment: 'ID of the category or field_definition being translated'
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
        len: [1, 50],
        isValidFieldName(value) {
          // Valid field names for categories: name, description
          // Valid field names for definitions: field_label, help_text
          const validFields = ['name', 'description', 'field_label', 'help_text'];
          if (!validFields.includes(value)) {
            throw new Error(`Field name must be one of: ${validFields.join(', ')}`);
          }
        }
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
    tableName: 'custom_field_translations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['entity_id', 'language_code', 'field_name'],
        name: 'unique_translation_per_entity_language_field'
      },
      {
        fields: ['entity_type', 'entity_id'],
        name: 'idx_translations_entity'
      },
      {
        fields: ['language_code'],
        name: 'idx_translations_language'
      },
      {
        fields: ['entity_id', 'language_code'],
        name: 'idx_translations_entity_language'
      }
    ]
  });

  CustomFieldTranslation.associate = function(models) {
    // Polymorphic associations - handled at service layer
    // We can't use standard Sequelize associations for polymorphic relationships
    // Instead, we'll query directly in the service layer based on entity_type and entity_id
  };

  return CustomFieldTranslation;
};
