'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        unique: true,
        allowNull: false
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('permissions', ['name']);
    await queryInterface.addIndex('permissions', ['resource']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('permissions');
  }
};
