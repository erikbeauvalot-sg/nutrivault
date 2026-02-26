'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('consultation_notes', 'ai_summary', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'summary'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('consultation_notes', 'ai_summary');
  }
};
