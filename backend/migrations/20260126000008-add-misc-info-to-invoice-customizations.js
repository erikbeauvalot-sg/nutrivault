'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(invoice_customizations)`);
    if (!cols.some(c => c.name === 'misc_info')) {
      await queryInterface.addColumn('invoice_customizations', 'misc_info', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('invoice_customizations', 'misc_info').catch(() => {});
  }
};
