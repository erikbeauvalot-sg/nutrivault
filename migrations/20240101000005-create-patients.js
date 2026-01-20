'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('patients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      gender: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      zip_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      emergency_contact_name: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      emergency_contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      medical_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      allergies: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      dietary_preferences: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      assigned_dietitian_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('patients', ['email']);
    await queryInterface.addIndex('patients', ['assigned_dietitian_id']);
    await queryInterface.addIndex('patients', ['last_name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('patients');
  }
};
