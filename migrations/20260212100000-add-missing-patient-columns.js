'use strict';

/**
 * Migration: Add missing patient columns
 * Adds columns that exist in the Patient model but were never migrated:
 * - language_preference
 * - appointment_reminders_enabled
 * - unsubscribe_token
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(patients)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    if (!hasColumn('language_preference')) {
      await queryInterface.addColumn('patients', 'language_preference', {
        type: Sequelize.STRING(5),
        allowNull: true,
        defaultValue: 'fr'
      });
    }

    if (!hasColumn('appointment_reminders_enabled')) {
      await queryInterface.addColumn('patients', 'appointment_reminders_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }

    if (!hasColumn('unsubscribe_token')) {
      await queryInterface.addColumn('patients', 'unsubscribe_token', {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patients', 'language_preference').catch(() => {});
    await queryInterface.removeColumn('patients', 'appointment_reminders_enabled').catch(() => {});
    await queryInterface.removeColumn('patients', 'unsubscribe_token').catch(() => {});
  }
};
