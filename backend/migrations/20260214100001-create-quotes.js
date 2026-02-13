'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quotes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quote_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      quote_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      validity_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      amount_subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_tax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'DRAFT'
      },
      accepted_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      declined_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      declined_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      billing_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'billing',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    await queryInterface.addIndex('quotes', ['client_id'], { name: 'idx_quotes_client_id' });
    await queryInterface.addIndex('quotes', ['quote_number'], { name: 'idx_quotes_number' });
    await queryInterface.addIndex('quotes', ['status'], { name: 'idx_quotes_status' });
    await queryInterface.addIndex('quotes', ['created_by'], { name: 'idx_quotes_created_by' });
    await queryInterface.addIndex('quotes', ['billing_id'], { name: 'idx_quotes_billing_id' });
    await queryInterface.addIndex('quotes', ['validity_date'], { name: 'idx_quotes_validity' });
    await queryInterface.addIndex('quotes', ['is_active'], { name: 'idx_quotes_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('quotes');
  }
};
