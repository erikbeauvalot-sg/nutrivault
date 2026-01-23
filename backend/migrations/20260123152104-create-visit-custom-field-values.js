'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visit_custom_field_values', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      visit_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'visits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      field_definition_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'custom_field_definitions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      value_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Stores text, textarea, date, and select field values'
      },
      value_number: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Stores numeric field values'
      },
      value_boolean: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Stores boolean field values'
      },
      value_json: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Stores complex data structures if needed'
      },
      updated_by: {
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

    // Add unique constraint
    await queryInterface.addConstraint('visit_custom_field_values', {
      fields: ['visit_id', 'field_definition_id'],
      type: 'unique',
      name: 'unique_visit_field'
    });

    // Add indexes for performance
    await queryInterface.addIndex('visit_custom_field_values', ['visit_id'], {
      name: 'idx_visit_custom_field_values_visit_id'
    });

    await queryInterface.addIndex('visit_custom_field_values', ['field_definition_id'], {
      name: 'idx_visit_custom_field_values_definition_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('visit_custom_field_values');
  }
};
