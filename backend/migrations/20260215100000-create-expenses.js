'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'RENT, EQUIPMENT, SOFTWARE, INSURANCE, TRAINING, MARKETING, UTILITIES, STAFF, PROFESSIONAL_FEES, SUPPLIES, TRAVEL, OTHER'
      },
      expense_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      vendor: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      receipt_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'CASH, CREDIT_CARD, BANK_TRANSFER, CHECK, OTHER'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_recurring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      recurring_period: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'MONTHLY, QUARTERLY, YEARLY'
      },
      recurring_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      tax_deductible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    await queryInterface.addIndex('expenses', ['created_by'], { name: 'idx_expenses_created_by' });
    await queryInterface.addIndex('expenses', ['category'], { name: 'idx_expenses_category' });
    await queryInterface.addIndex('expenses', ['expense_date'], { name: 'idx_expenses_date' });
    await queryInterface.addIndex('expenses', ['is_active'], { name: 'idx_expenses_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expenses');
  }
};
