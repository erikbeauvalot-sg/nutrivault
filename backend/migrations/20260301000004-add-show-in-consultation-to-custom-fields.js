'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('custom_field_definitions');
    if (!tableInfo.show_in_consultation) {
      await queryInterface.addColumn('custom_field_definitions', 'show_in_consultation', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: 'visible_on_creation'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('custom_field_definitions', 'show_in_consultation');
  }
};
