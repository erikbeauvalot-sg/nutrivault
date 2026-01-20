'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('billing', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      visit_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'visits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      invoice_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      invoice_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      service_description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      amount_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_paid: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_due: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'DRAFT',
        comment: 'DRAFT, SENT, PAID, OVERDUE, CANCELLED'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Cash, Credit Card, Insurance, etc.'
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('billing', ['patient_id']);
    await queryInterface.addIndex('billing', ['visit_id']);
    await queryInterface.addIndex('billing', ['invoice_number']);
    await queryInterface.addIndex('billing', ['status']);
    await queryInterface.addIndex('billing', ['due_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('billing');
  }
};
