'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('roles', 'data_scope', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'own',
      comment: "Data visibility for custom roles: 'all' (whole practice) or 'own'. Ignored for system roles"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('roles', 'data_scope');
  }
};
