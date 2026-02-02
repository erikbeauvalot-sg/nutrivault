'use strict';

/**
 * Migration: Add show_in_visit_list to custom_field_definitions
 * Allows custom fields to be shown as columns in the visits list
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('custom_field_definitions', 'show_in_visit_list', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('custom_field_definitions', 'show_in_visit_list');
  }
};
