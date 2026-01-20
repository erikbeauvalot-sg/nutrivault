'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Permission code in format: resource.action (e.g., patients.create)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Resource type: patients, visits, billing, users, etc.'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Action type: create, read, update, delete, etc.'
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

    await queryInterface.addIndex('permissions', ['code']);
    await queryInterface.addIndex('permissions', ['resource']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('permissions');
  }
};
