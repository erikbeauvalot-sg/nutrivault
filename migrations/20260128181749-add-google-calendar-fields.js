'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add Google Calendar fields to users table
    await queryInterface.addColumn('users', 'google_access_token', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Google OAuth access token for Calendar API'
    });

    await queryInterface.addColumn('users', 'google_refresh_token', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Google OAuth refresh token for Calendar API'
    });

    await queryInterface.addColumn('users', 'google_token_expiry', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Google OAuth token expiry date'
    });

    await queryInterface.addColumn('users', 'google_calendar_sync_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether Google Calendar sync is enabled for this user'
    });

    await queryInterface.addColumn('users', 'google_calendar_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: 'primary',
      comment: 'Google Calendar ID to sync with (default: primary)'
    });

    // Add Google Calendar event ID to visits table
    await queryInterface.addColumn('visits', 'google_event_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Google Calendar event ID for this visit'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove Google Calendar fields from users table
    await queryInterface.removeColumn('users', 'google_access_token');
    await queryInterface.removeColumn('users', 'google_refresh_token');
    await queryInterface.removeColumn('users', 'google_token_expiry');
    await queryInterface.removeColumn('users', 'google_calendar_sync_enabled');
    await queryInterface.removeColumn('users', 'google_calendar_id');

    // Remove Google Calendar event ID from visits table
    await queryInterface.removeColumn('visits', 'google_event_id');
  }
};
