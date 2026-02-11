'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.sequelize.query(
      "PRAGMA TABLE_INFO('notification_preferences')",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const columns = tableInfo.map(c => c.name);

    if (!columns.includes('journal_comments')) {
      await queryInterface.addColumn('notification_preferences', 'journal_comments', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!columns.includes('new_messages')) {
      await queryInterface.addColumn('notification_preferences', 'new_messages', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!columns.includes('reminder_times_hours')) {
      await queryInterface.addColumn('notification_preferences', 'reminder_times_hours', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('notification_preferences', 'journal_comments');
    await queryInterface.removeColumn('notification_preferences', 'new_messages');
    await queryInterface.removeColumn('notification_preferences', 'reminder_times_hours');
  },
};
