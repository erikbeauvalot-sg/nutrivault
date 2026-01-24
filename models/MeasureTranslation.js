/**
 * MeasureTranslation Model
 *
 * Stores translations for measure definitions
 * Supports multi-language interface without modifying core measure_definitions table
 *
 * Sprint 4: US-5.4.2 - Calculated Measures (Translation Support)
 */

module.exports = (sequelize, DataTypes) => {
  const MeasureTranslation = sequelize.define('MeasureTranslation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.ENUM('measure_definition'),
      allowNull: false,
      defaultValue: 'measure_definition',
      validate: {
        isIn: {
          args: [['measure_definition']],
          msg: 'Entity type must be "measure_definition"'
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
      comment: 'ID of the measure_definition being translated'
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
          // Valid field names for measure definitions: display_name, description, unit
          const validFields = ['display_name', 'description', 'unit'];
          if (!validFields.includes(value)) {
            throw new Error(`Field name must be one of: ${validFields.join(', ')}`);
          }
        }
      },
      comment: 'Name of the field being translated (display_name, description, unit)'
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
  };

  return MeasureTranslation;
};
