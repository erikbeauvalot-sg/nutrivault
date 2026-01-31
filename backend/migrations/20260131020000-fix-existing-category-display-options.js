'use strict';

/**
 * Migration: Fix existing categories with missing display options
 *
 * Updates any existing categories that have NULL values for
 * visit_types or display_layout columns
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First check if the columns exist
    const tableInfo = await queryInterface.describeTable('custom_field_categories');

    if (!tableInfo.display_layout) {
      console.log('ℹ️  display_layout column does not exist yet, skipping fix');
      return;
    }

    // Update categories with NULL display_layout to default value
    const [results] = await queryInterface.sequelize.query(`
      UPDATE custom_field_categories
      SET display_layout = '{"type":"columns","columns":1}'
      WHERE display_layout IS NULL
    `);

    console.log('✅ Updated categories with missing display_layout to default values');

    // Note: visit_types can be NULL (meaning "all types"), so we don't update it
  },

  down: async (queryInterface, Sequelize) => {
    // Nothing to undo - we don't want to set values back to NULL
    console.log('ℹ️  No rollback needed for display options fix');
  }
};
