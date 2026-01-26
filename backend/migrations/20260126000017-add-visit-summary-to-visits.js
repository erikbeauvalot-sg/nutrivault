'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('visits', 'visit_summary', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Auto-generated summary of changes made during the visit'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('visits', 'visit_summary');
  }
};
