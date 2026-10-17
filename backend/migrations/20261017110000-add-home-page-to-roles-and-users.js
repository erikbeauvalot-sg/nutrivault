'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('roles', 'home_page', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Sidebar item_key opened after login. NULL = dashboard or first visible menu entry'
    });
    await queryInterface.addColumn('users', 'home_page', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Sidebar item_key opened after login, overrides the role setting. NULL = role setting'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'home_page');
    await queryInterface.removeColumn('roles', 'home_page');
  }
};
