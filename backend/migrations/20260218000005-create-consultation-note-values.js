'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation_note_values', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      note_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'consultation_notes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      field_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'consultation_template_fields',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      section_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'consultation_template_sections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      value_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      value_number: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      value_boolean: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      value_json: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('consultation_note_values', ['note_id'], {
      name: 'idx_consultation_values_note'
    });
    await queryInterface.addIndex('consultation_note_values', ['field_id'], {
      name: 'idx_consultation_values_field'
    });
    await queryInterface.addIndex('consultation_note_values', ['note_id', 'field_id'], {
      name: 'idx_consultation_values_note_field',
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation_note_values');
  }
};
