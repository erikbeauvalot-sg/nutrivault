'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add Google Calendar sync tracking fields to visits table

    // ETag for detecting Google changes
    await queryInterface.addColumn('visits', 'google_event_etag', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Google Calendar event ETag for change detection'
    });

    // Sync status enum
    await queryInterface.addColumn('visits', 'sync_status', {
      type: Sequelize.ENUM('synced', 'pending_to_google', 'pending_from_google', 'conflict', 'error'),
      allowNull: true,
      defaultValue: null,
      comment: 'Current synchronization status'
    });

    // Last successful sync timestamp
    await queryInterface.addColumn('visits', 'last_sync_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last successful synchronization'
    });

    // Source of last sync
    await queryInterface.addColumn('visits', 'last_sync_source', {
      type: Sequelize.ENUM('nutrivault', 'google', 'manual'),
      allowNull: true,
      comment: 'Source of the last synchronization'
    });

    // Local modification timestamp
    await queryInterface.addColumn('visits', 'local_modified_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last local modification in NutriVault'
    });

    // Remote modification timestamp
    await queryInterface.addColumn('visits', 'remote_modified_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last modification in Google Calendar'
    });

    // Sync error message
    await queryInterface.addColumn('visits', 'sync_error_message', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Error message from last failed sync attempt'
    });

    // Sync error count
    await queryInterface.addColumn('visits', 'sync_error_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of consecutive sync failures'
    });

    // Google event deleted flag
    await queryInterface.addColumn('visits', 'google_event_deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the Google Calendar event has been deleted'
    });

    // Add index for sync status to optimize queries
    await queryInterface.addIndex('visits', ['sync_status'], {
      name: 'visits_sync_status_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('visits', 'visits_sync_status_idx');

    // Remove columns
    await queryInterface.removeColumn('visits', 'google_event_etag');
    await queryInterface.removeColumn('visits', 'sync_status');
    await queryInterface.removeColumn('visits', 'last_sync_at');
    await queryInterface.removeColumn('visits', 'last_sync_source');
    await queryInterface.removeColumn('visits', 'local_modified_at');
    await queryInterface.removeColumn('visits', 'remote_modified_at');
    await queryInterface.removeColumn('visits', 'sync_error_message');
    await queryInterface.removeColumn('visits', 'sync_error_count');
    await queryInterface.removeColumn('visits', 'google_event_deleted');

    // Drop ENUM types (PostgreSQL only)
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_visits_sync_status";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_visits_last_sync_source";');
    } catch (error) {
      // SQLite doesn't have ENUM types, ignore errors
      console.log('Note: ENUM cleanup skipped (likely SQLite)');
    }
  }
};
