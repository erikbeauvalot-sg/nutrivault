/**
 * Migration: Add calculated fields support
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(custom_field_definitions)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    if (!hasColumn('formula')) {
      await queryInterface.addColumn('custom_field_definitions', 'formula', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!hasColumn('dependencies')) {
      await queryInterface.addColumn('custom_field_definitions', 'dependencies', {
        type: Sequelize.JSON,
        allowNull: true
      });
    }

    if (!hasColumn('decimal_places')) {
      await queryInterface.addColumn('custom_field_definitions', 'decimal_places', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2
      });
    }

    if (!hasColumn('is_calculated')) {
      await queryInterface.addColumn('custom_field_definitions', 'is_calculated', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('custom_field_definitions', 'formula').catch(() => {});
    await queryInterface.removeColumn('custom_field_definitions', 'dependencies').catch(() => {});
    await queryInterface.removeColumn('custom_field_definitions', 'decimal_places').catch(() => {});
    await queryInterface.removeColumn('custom_field_definitions', 'is_calculated').catch(() => {});
  }
};
