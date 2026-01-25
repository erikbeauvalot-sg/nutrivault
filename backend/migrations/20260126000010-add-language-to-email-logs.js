'use strict';

/**
 * Migration: Add language_code to email_logs
 * US-5.5.6: Email Template Multi-Language Support
 *
 * Track which language was used when sending each email.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add language_code column to email_logs
    await queryInterface.addColumn('email_logs', 'language_code', {
      type: Sequelize.STRING(5),
      allowNull: true,
      comment: 'Language code used for this email (e.g., "en", "fr")'
    });

    // Add index for language_code queries
    await queryInterface.addIndex('email_logs', ['language_code'], {
      name: 'idx_email_logs_language_code'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('email_logs', 'idx_email_logs_language_code');
    await queryInterface.removeColumn('email_logs', 'language_code');
  }
};
