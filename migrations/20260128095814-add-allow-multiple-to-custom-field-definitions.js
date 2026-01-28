'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('custom_field_definitions', 'allow_multiple', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'select_options' // Add after select_options column
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('custom_field_definitions', 'allow_multiple');
  }
};
