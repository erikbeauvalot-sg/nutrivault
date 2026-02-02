'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'websites', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of website URLs associated with the user'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'websites');
  }
};
