'use strict';

/**
 * Migration: Add show_in_portal to custom_field_definitions
 * Allows custom fields to be displayed in the patient portal visit details
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('custom_field_definitions', 'show_in_portal', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('custom_field_definitions', 'show_in_portal');
  }
};
