'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('recipes', 'source_url', {
      type: Sequelize.STRING(1000),
      allowNull: true,
      after: 'nutrition_per_serving'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('recipes', 'source_url');
  }
};
