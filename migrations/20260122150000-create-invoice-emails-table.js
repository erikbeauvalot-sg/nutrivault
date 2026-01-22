'use strict';

/**
 * Migration: Create invoice_emails table
 * Tracks each email send for invoices
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invoice_emails', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      billing_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'billing',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the invoice'
      },
      sent_to: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email address of recipient'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when email was sent'
      },
      sent_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who sent the email'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'SUCCESS',
        comment: 'Email send status: SUCCESS, FAILED'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if failed'
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

    // Add indexes
    await queryInterface.addIndex('invoice_emails', ['billing_id']);
    await queryInterface.addIndex('invoice_emails', ['sent_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('invoice_emails');
  }
};
