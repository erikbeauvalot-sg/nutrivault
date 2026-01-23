'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('custom_field_definitions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'custom_field_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      field_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Internal field name (lowercase, underscores only)'
      },
      field_label: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Display label shown to users'
      },
      field_type: {
        type: Sequelize.ENUM('text', 'number', 'date', 'select', 'boolean', 'textarea'),
        allowNull: false
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      validation_rules: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON validation rules (min, max, pattern, etc.)'
      },
      select_options: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of options for select type fields'
      },
      help_text: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Helpful description shown to users'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Add indexes
    await queryInterface.addIndex('custom_field_definitions', ['category_id', 'is_active', 'display_order']);
    await queryInterface.addIndex('custom_field_definitions', ['field_name']);
    await queryInterface.addIndex('custom_field_definitions', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('custom_field_definitions');
  }
};
