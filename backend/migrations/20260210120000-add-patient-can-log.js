'use strict';

/**
 * Migration: Add patient_can_log to measure_definitions
 *
 * Allows patients to self-log certain measures via their portal.
 * When true, patients can submit values for this measure type.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('measure_definitions', 'patient_can_log', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether patients can self-log this measure via the portal'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('measure_definitions', 'patient_can_log');
  }
};
