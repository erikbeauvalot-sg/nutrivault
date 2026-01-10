'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'language_preference', {
      type: Sequelize.ENUM('fr', 'en'),
      allowNull: false,
      defaultValue: 'fr',
      comment: 'User preferred language (fr=french, en=english)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'language_preference');
  }
};