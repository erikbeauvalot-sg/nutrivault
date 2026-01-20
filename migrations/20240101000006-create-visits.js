'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('visits', {
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
        onDelete: 'RESTRICT'
      },
      visit_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      visit_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Initial, Follow-up, Final, etc.'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'SCHEDULED',
        comment: 'SCHEDULED, COMPLETED, CANCELLED, NO_SHOW'
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      chief_complaint: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      assessment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      recommendations: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      next_visit_date: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('visits', ['patient_id']);
    await queryInterface.addIndex('visits', ['dietitian_id']);
    await queryInterface.addIndex('visits', ['visit_date']);
    await queryInterface.addIndex('visits', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('visits');
  }
};
