/**
 * Migration: Add show_in_list to custom_field_definitions
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(custom_field_definitions)`);
    if (!cols.some(c => c.name === 'show_in_list')) {
      await queryInterface.addColumn('custom_field_definitions', 'show_in_list', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this field should appear as a column in list views'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('custom_field_definitions', 'show_in_list').catch(() => {});
  }
};
