'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('visits', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      visit_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'SCHEDULED'
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
      next_visit_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      private_notes: {
        type: Sequelize.TEXT,
        allowNull: true
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
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('visits', ['patient_id']);
    await queryInterface.addIndex('visits', ['dietitian_id']);
    await queryInterface.addIndex('visits', ['visit_date']);
    await queryInterface.addIndex('visits', ['status']);
    await queryInterface.addIndex('visits', ['patient_id', 'visit_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('visits');
  }
};
