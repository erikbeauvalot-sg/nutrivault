'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add reminder tracking fields to visits table
    await queryInterface.addColumn('visits', 'reminders_sent', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of appointment reminders sent for this visit'
    });

    await queryInterface.addColumn('visits', 'last_reminder_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last reminder sent'
    });

    // Add index for efficient querying of visits needing reminders
    await queryInterface.addIndex('visits', ['status', 'visit_date', 'reminders_sent'], {
      name: 'idx_visits_scheduled_reminders',
      comment: 'Optimize queries for scheduled visits needing reminders'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('visits', 'idx_visits_scheduled_reminders');

    // Remove columns
    await queryInterface.removeColumn('visits', 'last_reminder_date');
    await queryInterface.removeColumn('visits', 'reminders_sent');
  }
};
