'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(patients)`);
    if (!cols.some(c => c.name === 'dietary_restrictions')) {
      await queryInterface.addColumn('patients', 'dietary_restrictions', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Dietary restrictions (gluten-free, lactose-free, vegan, halal, kosher, etc.)'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('patients', 'dietary_restrictions').catch(() => {});
  }
};
