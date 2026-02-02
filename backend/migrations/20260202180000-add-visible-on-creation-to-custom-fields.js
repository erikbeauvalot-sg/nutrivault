'use strict';

/**
 * Migration: Add visible_on_creation to custom_field_definitions
 * Allows custom fields to be shown in the patient creation modal
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('custom_field_definitions', 'visible_on_creation', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('custom_field_definitions', 'visible_on_creation');
  }
};
