/**
 * Migration: Add show_in_list to custom_field_definitions
 *
 * Adds a boolean flag to control whether a custom field
 * should be displayed as a column in patient list views.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('custom_field_definitions', 'show_in_list', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this field should appear as a column in list views'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('custom_field_definitions', 'show_in_list');
  }
};
