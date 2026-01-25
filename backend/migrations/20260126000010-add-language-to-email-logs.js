'use strict';

/**
 * Migration: Add language_code to email_logs
 * US-5.5.6: Email Template Multi-Language Support
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(email_logs)`);
    if (!cols.some(c => c.name === 'language_code')) {
      await queryInterface.addColumn('email_logs', 'language_code', {
        type: Sequelize.STRING(5),
        allowNull: true,
        comment: 'Language code used for this email (e.g., "en", "fr")'
      });
    }

    try {
      await queryInterface.addIndex('email_logs', ['language_code'], {
        name: 'idx_email_logs_language_code'
      });
    } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('email_logs', 'idx_email_logs_language_code').catch(() => {});
    await queryInterface.removeColumn('email_logs', 'language_code').catch(() => {});
  }
};
