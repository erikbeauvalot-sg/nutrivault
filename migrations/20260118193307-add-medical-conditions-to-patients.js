'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(patients)`);
    if (!cols.some(c => c.name === 'medical_conditions')) {
      await queryInterface.addColumn('patients', 'medical_conditions', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Medical conditions and chronic diseases (diabetes, hypertension, etc.)'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('patients', 'medical_conditions').catch(() => {});
  }
};
