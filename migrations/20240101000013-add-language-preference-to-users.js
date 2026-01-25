'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(users)`);
    if (!cols.some(c => c.name === 'language_preference')) {
      await queryInterface.addColumn('users', 'language_preference', {
        type: Sequelize.STRING(2), // Use STRING for SQLite compatibility
        allowNull: false,
        defaultValue: 'fr',
        comment: 'User preferred language (fr=french, en=english)'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'language_preference').catch(() => {});
  }
};