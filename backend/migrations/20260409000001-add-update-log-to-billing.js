'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('billing', 'update_log', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'JSON array of update history entries (payment_method changes, etc.)'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('billing', 'update_log');
  }
};
