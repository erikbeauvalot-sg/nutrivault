'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('visits', 'reminders_sent');
    await queryInterface.removeColumn('visits', 'last_reminder_date');
  }
};
