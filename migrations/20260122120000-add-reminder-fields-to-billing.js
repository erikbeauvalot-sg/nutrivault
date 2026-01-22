'use strict';

/**
 * Migration: Add reminder tracking fields to billing table
 * Adds reminders_sent (count) and last_reminder_date (timestamp)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('billing', 'reminders_sent', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of payment reminder emails sent'
    });

    await queryInterface.addColumn('billing', 'last_reminder_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last payment reminder sent'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('billing', 'reminders_sent');
    await queryInterface.removeColumn('billing', 'last_reminder_date');
  }
};
