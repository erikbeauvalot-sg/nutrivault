'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('patient_objectives', {
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
        onDelete: 'CASCADE'
      },
      objective_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
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

    const tryAddIndex = async (table, fields, options) => {
      try {
        await queryInterface.addIndex(table, fields, options);
      } catch (e) {
        // Index may already exist
      }
    };

    await tryAddIndex('patient_objectives', ['patient_id'], { name: 'idx_patient_objectives_patient' });
    await tryAddIndex('patient_objectives', ['patient_id', 'objective_number'], {
      name: 'idx_patient_objectives_unique',
      unique: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('patient_objectives');
  }
};
