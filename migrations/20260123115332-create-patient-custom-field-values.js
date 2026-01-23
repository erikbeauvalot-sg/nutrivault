'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('patient_custom_field_values', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
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
        comment: 'Used for text, textarea, date field types'
      },
      value_number: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Used for number field type'
      },
      value_boolean: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Used for boolean field type'
      },
      value_json: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Used for complex select field type'
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

    // Add indexes
    await queryInterface.addIndex('patient_custom_field_values', ['patient_id']);
    await queryInterface.addIndex('patient_custom_field_values', ['field_definition_id']);

    // Add unique constraint to prevent duplicate values for same patient+field
    await queryInterface.addConstraint('patient_custom_field_values', {
      fields: ['patient_id', 'field_definition_id'],
      type: 'unique',
      name: 'unique_patient_field'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('patient_custom_field_values');
  }
};
