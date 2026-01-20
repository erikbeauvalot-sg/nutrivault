'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add medical_conditions field to patients table
    await queryInterface.addColumn('patients', 'medical_conditions', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Medical conditions and chronic diseases (diabetes, hypertension, etc.)'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove medical_conditions field
    await queryInterface.removeColumn('patients', 'medical_conditions');
  }
};
