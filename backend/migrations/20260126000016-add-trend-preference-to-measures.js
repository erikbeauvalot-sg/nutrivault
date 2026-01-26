'use strict';

/**
 * Migration: Add trend_preference to measure_definitions
 *
 * Adds a field to determine if an increase or decrease is considered positive:
 * - 'increase' (default): An increase in value is good (e.g., muscle mass)
 * - 'decrease': A decrease in value is good (e.g., weight for weight loss)
 * - 'neutral': Neither direction is inherently good or bad
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('measure_definitions', 'trend_preference', {
      type: Sequelize.ENUM('increase', 'decrease', 'neutral'),
      allowNull: false,
      defaultValue: 'increase',
      comment: 'Whether increase or decrease is considered positive for this measure'
    });

    // Update weight measure to prefer decrease (common use case)
    await queryInterface.sequelize.query(`
      UPDATE measure_definitions
      SET trend_preference = 'decrease'
      WHERE name IN ('weight', 'weight_kg', 'body_fat_percentage', 'bmi', 'waist_circumference')
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('measure_definitions', 'trend_preference');

    // Drop the ENUM type (PostgreSQL specific, SQLite ignores this)
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_measure_definitions_trend_preference";');
    } catch (error) {
      // Ignore error for SQLite
    }
  }
};
