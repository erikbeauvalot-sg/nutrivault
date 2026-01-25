'use strict';

/**
 * Migration: Add status field to payments table
 * Allows tracking payment status (PAID, CANCELLED)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(payments)`);
    if (!cols.some(c => c.name === 'status')) {
      await queryInterface.addColumn('payments', 'status', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'PAID',
        comment: 'Payment status: PAID, CANCELLED'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('payments', 'status').catch(() => {});
  }
};
