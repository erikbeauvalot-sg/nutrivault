'use strict';

/**
 * Migration: Add 'embedded' field type to CustomFieldDefinition
 *
 * This migration documents the addition of a new field type 'embedded' which allows
 * displaying patient measures directly within custom field categories.
 *
 * Configuration stored in select_options field:
 * {
 *   "measure_name": "weight"  // Name of the measure definition to display
 * }
 *
 * Note: SQLite does not enforce ENUM constraints, so this migration is primarily
 * for documentation purposes. The actual validation happens in the model.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // SQLite doesn't enforce ENUMs, so no schema change needed
    // The new 'embedded' type is handled at the application level
    console.log('Added embedded field type (SQLite - no schema change needed)');
  },

  async down(queryInterface, Sequelize) {
    // No rollback needed for SQLite
    console.log('Removed embedded field type (SQLite - no schema change needed)');
  }
};
