'use strict';

/**
 * Allow the same email to exist for a dietitian User and a patient User.
 * Patients log in by email, dietitians by username — no conflict.
 * Drops the unique constraint on users.email.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // SQLite: must recreate the index without UNIQUE
    // First, remove the unique index that was auto-created by Sequelize
    try {
      await queryInterface.removeIndex('users', 'users_email_unique');
    } catch (e) {
      // Index name may vary
    }
    try {
      await queryInterface.removeIndex('users', 'users_email');
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Re-add a non-unique index on email for query performance
    await queryInterface.addIndex('users', ['email'], {
      name: 'users_email_idx',
      unique: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('users', 'users_email_idx');
    } catch (e) {
      // Ignore
    }
    await queryInterface.addIndex('users', ['email'], {
      name: 'users_email_unique',
      unique: true
    });
  }
};
