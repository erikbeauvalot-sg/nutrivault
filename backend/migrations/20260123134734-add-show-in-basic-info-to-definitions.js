'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(custom_field_definitions)`);
    if (!cols.some(c => c.name === 'show_in_basic_info')) {
      await queryInterface.addColumn('custom_field_definitions', 'show_in_basic_info', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('custom_field_definitions', 'show_in_basic_info').catch(() => {});
  }
};
