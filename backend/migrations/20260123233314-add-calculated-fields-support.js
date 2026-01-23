/**
 * Migration: Add calculated fields support
 *
 * Adds formula and dependencies columns to custom_field_definitions
 * to support calculated fields with formulas.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add formula column for storing calculation formulas
    await queryInterface.addColumn('custom_field_definitions', 'formula', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Formula for calculated fields (e.g., "{weight} / ({height} * {height})")'
    });

    // Add dependencies column to track which fields this calculated field depends on
    await queryInterface.addColumn('custom_field_definitions', 'dependencies', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Array of field names this calculated field depends on'
    });

    // Add decimal_places column for controlling precision of calculated results
    await queryInterface.addColumn('custom_field_definitions', 'decimal_places', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 2,
      comment: 'Number of decimal places for calculated field results (0-4)'
    });

    // Add is_calculated column to easily identify calculated fields
    await queryInterface.addColumn('custom_field_definitions', 'is_calculated', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is a calculated field'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('custom_field_definitions', 'formula');
    await queryInterface.removeColumn('custom_field_definitions', 'dependencies');
    await queryInterface.removeColumn('custom_field_definitions', 'decimal_places');
    await queryInterface.removeColumn('custom_field_definitions', 'is_calculated');
  }
};
