'use strict';

/**
 * Migration: Create payments table
 * Stores individual payment transactions for invoices
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
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
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Payment amount'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'CASH, CREDIT_CARD, BANK_TRANSFER, CHECK, INSURANCE, OTHER'
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Date of payment'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Payment notes'
      },
      recorded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who recorded this payment'
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
    await queryInterface.addIndex('payments', ['billing_id']);
    await queryInterface.addIndex('payments', ['payment_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payments');
  }
};
