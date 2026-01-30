'use strict';

/**
 * Migration: Add default duration and price to Visit Types
 *
 * Adds:
 * - duration_minutes: Default duration for this visit type
 * - default_price: Default price/tariff for this visit type
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add duration_minutes column
    await queryInterface.addColumn('visit_types', 'duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Default duration in minutes for this visit type'
    });

    // Add default_price column
    await queryInterface.addColumn('visit_types', 'default_price', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Default price/tariff for this visit type'
    });

    // Update existing visit types with sensible defaults
    await queryInterface.sequelize.query(`
      UPDATE visit_types SET duration_minutes = 60, default_price = 80.00 WHERE name = 'Consultation initiale'
    `);
    await queryInterface.sequelize.query(`
      UPDATE visit_types SET duration_minutes = 30, default_price = 50.00 WHERE name = 'Suivi'
    `);
    await queryInterface.sequelize.query(`
      UPDATE visit_types SET duration_minutes = 90, default_price = 120.00 WHERE name = 'Bilan'
    `);
    await queryInterface.sequelize.query(`
      UPDATE visit_types SET duration_minutes = 30, default_price = 70.00 WHERE name = 'Urgence'
    `);

    console.log('✅ Added duration_minutes and default_price columns to visit_types');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('visit_types', 'duration_minutes');
    await queryInterface.removeColumn('visit_types', 'default_price');

    console.log('✅ Removed duration_minutes and default_price columns from visit_types');
  }
};
