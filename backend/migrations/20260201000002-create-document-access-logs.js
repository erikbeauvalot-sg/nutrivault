'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_access_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      document_share_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'document_shares',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the accessor (supports IPv6)'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/client user agent string'
      },
      action: {
        type: Sequelize.ENUM('view', 'download', 'password_attempt'),
        allowNull: false,
        comment: 'Type of access action'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the action was successful'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('document_access_logs', ['document_share_id'], {
      name: 'idx_document_access_logs_share_id'
    });

    await queryInterface.addIndex('document_access_logs', ['action'], {
      name: 'idx_document_access_logs_action'
    });

    await queryInterface.addIndex('document_access_logs', ['created_at'], {
      name: 'idx_document_access_logs_created_at'
    });

    await queryInterface.addIndex('document_access_logs', ['ip_address'], {
      name: 'idx_document_access_logs_ip_address'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('document_access_logs');
  }
};
