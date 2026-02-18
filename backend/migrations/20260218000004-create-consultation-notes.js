'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consultation_notes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      visit_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'visits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'consultation_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      dietitian_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'draft'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      summary: {
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

    await queryInterface.addIndex('consultation_notes', ['visit_id'], {
      name: 'idx_consultation_notes_visit'
    });
    await queryInterface.addIndex('consultation_notes', ['patient_id'], {
      name: 'idx_consultation_notes_patient'
    });
    await queryInterface.addIndex('consultation_notes', ['template_id'], {
      name: 'idx_consultation_notes_template'
    });
    await queryInterface.addIndex('consultation_notes', ['dietitian_id'], {
      name: 'idx_consultation_notes_dietitian'
    });
    await queryInterface.addIndex('consultation_notes', ['status'], {
      name: 'idx_consultation_notes_status'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('consultation_notes');
  }
};
