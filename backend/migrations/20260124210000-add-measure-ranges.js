'use strict';

/**
 * Migration: Add Normal Ranges & Alert Thresholds to Measure Definitions
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(measure_definitions)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    if (!hasColumn('normal_range_min')) {
      await queryInterface.addColumn('measure_definitions', 'normal_range_min', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      });
    }

    if (!hasColumn('normal_range_max')) {
      await queryInterface.addColumn('measure_definitions', 'normal_range_max', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      });
    }

    if (!hasColumn('alert_threshold_min')) {
      await queryInterface.addColumn('measure_definitions', 'alert_threshold_min', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      });
    }

    if (!hasColumn('alert_threshold_max')) {
      await queryInterface.addColumn('measure_definitions', 'alert_threshold_max', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      });
    }

    if (!hasColumn('enable_alerts')) {
      await queryInterface.addColumn('measure_definitions', 'enable_alerts', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    console.log('✅ Measure range fields added successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('measure_definitions', 'enable_alerts').catch(() => {});
    await queryInterface.removeColumn('measure_definitions', 'alert_threshold_max').catch(() => {});
    await queryInterface.removeColumn('measure_definitions', 'alert_threshold_min').catch(() => {});
    await queryInterface.removeColumn('measure_definitions', 'normal_range_max').catch(() => {});
    await queryInterface.removeColumn('measure_definitions', 'normal_range_min').catch(() => {});
  }
};
