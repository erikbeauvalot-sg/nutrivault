'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(patients)`);
    if (!cols.some(c => c.name === 'language_preference')) {
      await queryInterface.addColumn('patients', 'language_preference', {
        type: Sequelize.STRING(5),
        allowNull: true,
        defaultValue: 'fr',
        comment: 'Patient preferred language for communications (fr, en, es, nl, de)'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patients', 'language_preference').catch(() => {});
  }
};
