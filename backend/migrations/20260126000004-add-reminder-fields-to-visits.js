'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        if (dialect === 'postgres') {
          const [results] = await queryInterface.sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}' AND column_name = '${columnName}'
          `);
          return results.length > 0;
        } else {
          const [results] = await queryInterface.sequelize.query(`PRAGMA table_info(${tableName})`);
          return results.some(col => col.name === columnName);
        }
      } catch (error) {
        return false;
      }
    };

    // Add reminder tracking fields to visits table (only if they don't exist)
    if (!(await columnExists('visits', 'reminders_sent'))) {
      await queryInterface.addColumn('visits', 'reminders_sent', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of appointment reminders sent for this visit'
      });
      console.log('✅ Added column: reminders_sent');
    } else {
      console.log('Column reminders_sent already exists, skipping');
    }

    if (!(await columnExists('visits', 'last_reminder_date'))) {
      await queryInterface.addColumn('visits', 'last_reminder_date', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of last reminder sent'
      });
      console.log('✅ Added column: last_reminder_date');
    } else {
      console.log('Column last_reminder_date already exists, skipping');
    }

    // Add index for efficient querying of visits needing reminders
    try {
      await queryInterface.addIndex('visits', ['status', 'visit_date', 'reminders_sent'], {
        name: 'idx_visits_scheduled_reminders',
        comment: 'Optimize queries for scheduled visits needing reminders'
      });
      console.log('✅ Added index: idx_visits_scheduled_reminders');
    } catch (error) {
      console.log(`Index idx_visits_scheduled_reminders may already exist: ${error.message}`);
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index first (ignore if not exists)
    try {
      await queryInterface.removeIndex('visits', 'idx_visits_scheduled_reminders');
    } catch (error) {
      console.log(`Could not remove index: ${error.message}`);
    }

    // Remove columns (ignore if not exists)
    try {
      await queryInterface.removeColumn('visits', 'last_reminder_date');
    } catch (error) {
      console.log(`Could not remove column: ${error.message}`);
    }
    try {
      await queryInterface.removeColumn('visits', 'reminders_sent');
    } catch (error) {
      console.log(`Could not remove column: ${error.message}`);
    }
  }
};
