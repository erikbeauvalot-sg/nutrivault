'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      request_method: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      request_path: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changes: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      api_key_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'api_keys',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });

    await queryInterface.addIndex('audit_logs', ['timestamp']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['severity']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('audit_logs');
  }
};
