'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('custom_field_translations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.ENUM('category', 'field_definition'),
        allowNull: false,
        comment: 'Type of entity being translated (category or field_definition)'
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of the category or field_definition being translated'
      },
      language_code: {
        type: Sequelize.STRING(5),
        allowNull: false,
        comment: 'Language code (e.g., "fr", "en", "es")'
      },
      field_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Name of the field being translated (e.g., "name", "description", "field_label")'
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

    // Create unique constraint: one translation per entity/language/field combination
    await queryInterface.addConstraint('custom_field_translations', {
      fields: ['entity_id', 'language_code', 'field_name'],
      type: 'unique',
      name: 'unique_translation_per_entity_language_field'
    });

    // Index for fast lookups by entity
    await queryInterface.addIndex('custom_field_translations', ['entity_type', 'entity_id'], {
      name: 'idx_translations_entity'
    });

    // Index for fast lookups by language
    await queryInterface.addIndex('custom_field_translations', ['language_code'], {
      name: 'idx_translations_language'
    });

    // Composite index for common query pattern: get all translations for an entity in a specific language
    await queryInterface.addIndex('custom_field_translations', ['entity_id', 'language_code'], {
      name: 'idx_translations_entity_language'
    });

    console.log('✅ Created custom_field_translations table with indexes');
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('custom_field_translations', 'idx_translations_entity_language');
    await queryInterface.removeIndex('custom_field_translations', 'idx_translations_language');
    await queryInterface.removeIndex('custom_field_translations', 'idx_translations_entity');

    // Drop table
    await queryInterface.dropTable('custom_field_translations');

    // Drop enum type (SQLite doesn't have enums, but this is for PostgreSQL compatibility)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_custom_field_translations_entity_type;');

    console.log('✅ Dropped custom_field_translations table');
  }
};
