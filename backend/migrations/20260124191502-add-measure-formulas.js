'use strict';

/**
 * Migration: Add formula support to measure_definitions
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(measure_definitions)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    if (!hasColumn('formula')) {
      await queryInterface.addColumn('measure_definitions', 'formula', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!hasColumn('dependencies')) {
      await queryInterface.addColumn('measure_definitions', 'dependencies', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!hasColumn('last_formula_change')) {
      await queryInterface.addColumn('measure_definitions', 'last_formula_change', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    try {
      await queryInterface.addIndex('measure_definitions', ['measure_type'], {
        name: 'idx_measure_type'
      });
    } catch (e) {}

    console.log('✅ Added formula support to measure_definitions');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('measure_definitions', 'idx_measure_type').catch(() => {});
    await queryInterface.removeColumn('measure_definitions', 'last_formula_change').catch(() => {});
    await queryInterface.removeColumn('measure_definitions', 'dependencies').catch(() => {});
    await queryInterface.removeColumn('measure_definitions', 'formula').catch(() => {});
  }
};
