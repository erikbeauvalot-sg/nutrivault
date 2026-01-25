'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'language_preference', {
      type: Sequelize.STRING(5),
      allowNull: true,
      defaultValue: 'fr',
      comment: 'Patient preferred language for communications (fr, en, es, nl, de)'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patients', 'language_preference');
  }
};
