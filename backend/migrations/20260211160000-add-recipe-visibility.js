'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('recipes', 'visibility', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'private'
    });

    await queryInterface.addIndex('recipes', ['visibility'], {
      name: 'recipes_visibility'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('recipes', 'recipes_visibility');
    await queryInterface.removeColumn('recipes', 'visibility');
  }
};
