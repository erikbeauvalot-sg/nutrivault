'use strict';

/**
 * Migration: Add Display Options to Custom Field Categories
 *
 * Adds:
 * - visit_types: JSON array of visit type IDs (null = all types)
 * - display_layout: JSON object with layout configuration
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add visit_types column
    await queryInterface.addColumn('custom_field_categories', 'visit_types', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Array of visit type IDs, null = all types'
    });

    // Add display_layout column
    await queryInterface.addColumn('custom_field_categories', 'display_layout', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: JSON.stringify({ type: 'columns', columns: 1 }),
      comment: 'Display layout configuration'
    });

    console.log('✅ Added visit_types and display_layout columns to custom_field_categories');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('custom_field_categories', 'visit_types');
    await queryInterface.removeColumn('custom_field_categories', 'display_layout');

    console.log('✅ Removed visit_types and display_layout columns from custom_field_categories');
  }
};
