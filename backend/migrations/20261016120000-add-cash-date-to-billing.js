'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('billing', 'cash_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
      comment: "Date d'encaissement (bank deposit date). NULL = same as invoice_date"
    });
    await queryInterface.addIndex('billing', ['cash_date'], { name: 'idx_billing_cash_date' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('billing', 'idx_billing_cash_date');
    await queryInterface.removeColumn('billing', 'cash_date');
  }
};
