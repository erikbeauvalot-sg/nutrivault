'use strict';

/**
 * Migration: Add formula support to measure_definitions
 * Sprint 4: US-5.4.2 - Calculated Measures
 *
 * Adds formula, dependencies, and last_formula_change columns
 * to support calculated measures with formula evaluation
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add formula column
    await queryInterface.addColumn('measure_definitions', 'formula', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Formula for calculated measures (e.g., {weight} / ({height} * {height}))'
    });

    // Add dependencies column
    await queryInterface.addColumn('measure_definitions', 'dependencies', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of measure names this formula depends on'
    });

    // Add last_formula_change column
    await queryInterface.addColumn('measure_definitions', 'last_formula_change', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last formula modification for audit trail'
    });

    // Add index on measure_type for fast calculated measure lookups
    await queryInterface.addIndex('measure_definitions', ['measure_type'], {
      name: 'idx_measure_type'
    });

    console.log('✅ Added formula support to measure_definitions');
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('measure_definitions', 'idx_measure_type');

    // Remove columns
    await queryInterface.removeColumn('measure_definitions', 'last_formula_change');
    await queryInterface.removeColumn('measure_definitions', 'dependencies');
    await queryInterface.removeColumn('measure_definitions', 'formula');

    console.log('✅ Removed formula support from measure_definitions');
  }
};
