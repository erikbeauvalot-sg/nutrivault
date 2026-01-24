'use strict';

/**
 * Migration: Add Normal Ranges & Alert Thresholds to Measure Definitions
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 *
 * Adds fields to measure_definitions:
 * - normal_range_min/max: Healthy range (e.g., BMI 18.5-24.9)
 * - alert_threshold_min/max: Critical alert thresholds
 * - enable_alerts: Whether to generate alerts for this measure
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add normal range fields
    await queryInterface.addColumn('measure_definitions', 'normal_range_min', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Minimum value for normal/healthy range'
    });

    await queryInterface.addColumn('measure_definitions', 'normal_range_max', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Maximum value for normal/healthy range'
    });

    // Add alert threshold fields
    await queryInterface.addColumn('measure_definitions', 'alert_threshold_min', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Minimum threshold for critical alerts (more extreme than normal_range_min)'
    });

    await queryInterface.addColumn('measure_definitions', 'alert_threshold_max', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Maximum threshold for critical alerts (more extreme than normal_range_max)'
    });

    // Add enable_alerts flag
    await queryInterface.addColumn('measure_definitions', 'enable_alerts', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether to automatically generate alerts for out-of-range values'
    });

    console.log('✅ Measure range fields added successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns in reverse order
    await queryInterface.removeColumn('measure_definitions', 'enable_alerts');
    await queryInterface.removeColumn('measure_definitions', 'alert_threshold_max');
    await queryInterface.removeColumn('measure_definitions', 'alert_threshold_min');
    await queryInterface.removeColumn('measure_definitions', 'normal_range_max');
    await queryInterface.removeColumn('measure_definitions', 'normal_range_min');

    console.log('✅ Measure range fields removed successfully');
  }
};
