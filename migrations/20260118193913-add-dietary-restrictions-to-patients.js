'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add dietary_restrictions field to patients table
    await queryInterface.addColumn('patients', 'dietary_restrictions', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Dietary restrictions (gluten-free, lactose-free, vegan, halal, kosher, etc.)'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove dietary_restrictions field
    await queryInterface.removeColumn('patients', 'dietary_restrictions');
  }
};
