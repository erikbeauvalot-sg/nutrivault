'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('accounting_entries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      entry_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Signed amount: positive=credit, negative=debit'
      },
      entry_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'CREDIT or DEBIT'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'ADJUSTMENT, REFUND, CORRECTION, BANK_FEE, TAX, OTHER'
      },
      reference: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('accounting_entries', ['created_by'], { name: 'idx_accounting_entries_created_by' });
    await queryInterface.addIndex('accounting_entries', ['entry_date'], { name: 'idx_accounting_entries_date' });
    await queryInterface.addIndex('accounting_entries', ['entry_type'], { name: 'idx_accounting_entries_type' });
    await queryInterface.addIndex('accounting_entries', ['is_active'], { name: 'idx_accounting_entries_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('accounting_entries');
  }
};
