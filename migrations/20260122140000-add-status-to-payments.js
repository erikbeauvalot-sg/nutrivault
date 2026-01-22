'use strict';

/**
 * Migration: Add status field to payments table
 * Allows tracking payment status (PAID, CANCELLED)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payments', 'status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'PAID',
      comment: 'Payment status: PAID, CANCELLED'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('payments', 'status');
  }
};
