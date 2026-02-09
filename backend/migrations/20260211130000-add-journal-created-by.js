'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('journal_entries', 'created_by_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('journal_entries', 'created_by_user_id');
  }
};
