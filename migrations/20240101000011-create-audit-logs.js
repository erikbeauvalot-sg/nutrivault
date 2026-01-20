'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'No FK constraint - audit logs must persist even if user deleted'
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Denormalized for audit trail'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.'
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'patient, visit, billing, user, document, etc.'
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of affected resource'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IPv4 or IPv6 address'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      request_method: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'GET, POST, PUT, DELETE'
      },
      request_path: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON string of before/after values (TEXT for SQLite, JSONB for PostgreSQL)'
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      error_message: {
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

    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['timestamp']);
    await queryInterface.addIndex('audit_logs', ['resource_type']);
    await queryInterface.addIndex('audit_logs', ['resource_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('audit_logs');
  }
};
