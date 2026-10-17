'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bank_accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Stable value stored on financial records'
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      iban: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Account given to new expenses and entries'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    await queryInterface.addIndex('bank_accounts', ['is_active', 'display_order']);

    // Every financial record belongs to an account (NULL = not assigned yet)
    for (const table of ['billing', 'expenses', 'accounting_entries']) {
      await queryInterface.addColumn(table, 'bank_account_code', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
        comment: 'Bank account (bank_accounts.code)'
      });
      await queryInterface.addIndex(table, ['bank_account_code'], { name: `idx_${table}_bank_account_code` });
    }

    // Default account for the revenue of each location
    await queryInterface.addColumn('practice_locations', 'bank_account_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Default bank account of invoices at this location'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('practice_locations', 'bank_account_code');
    for (const table of ['billing', 'expenses', 'accounting_entries']) {
      await queryInterface.removeIndex(table, `idx_${table}_bank_account_code`);
      await queryInterface.removeColumn(table, 'bank_account_code');
    }
    await queryInterface.dropTable('bank_accounts');
  }
};
