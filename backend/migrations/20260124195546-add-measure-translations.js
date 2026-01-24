/**
 * Migration: Add Measure Translations Table
 *
 * Creates measure_translations table for multi-language support
 * Similar pattern to custom_field_translations
 *
 * Sprint 4: US-5.4.2 - Calculated Measures (Translation Support)
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('measure_translations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.ENUM('measure_definition'),
        allowNull: false,
        defaultValue: 'measure_definition',
        comment: 'Type of entity being translated'
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of the measure_definition being translated'
      },
      language_code: {
        type: Sequelize.STRING(5),
        allowNull: false,
        comment: 'Language code (e.g., "fr", "en", "es", "en-US")'
      },
      field_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Name of the field being translated (display_name, description, unit)'
      },
      translated_value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'The translated text value'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('measure_translations',
      ['entity_id', 'language_code', 'field_name'],
      {
        unique: true,
        name: 'unique_measure_translation_per_entity_language_field'
      }
    );

    await queryInterface.addIndex('measure_translations',
      ['entity_type', 'entity_id'],
      {
        name: 'idx_measure_translations_entity'
      }
    );

    await queryInterface.addIndex('measure_translations',
      ['language_code'],
      {
        name: 'idx_measure_translations_language'
      }
    );

    await queryInterface.addIndex('measure_translations',
      ['entity_id', 'language_code'],
      {
        name: 'idx_measure_translations_entity_language'
      }
    );

    // Add foreign key constraint
    await queryInterface.addConstraint('measure_translations', {
      fields: ['entity_id'],
      type: 'foreign key',
      name: 'fk_measure_translations_measure_definition',
      references: {
        table: 'measure_definitions',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('measure_translations');
  }
};
