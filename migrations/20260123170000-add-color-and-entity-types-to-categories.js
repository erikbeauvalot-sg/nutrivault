'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add color column
    await queryInterface.addColumn('custom_field_categories', 'color', {
      type: Sequelize.STRING(7),
      allowNull: false,
      defaultValue: '#3498db'
    });

    // Add entity_types column
    await queryInterface.addColumn('custom_field_categories', 'entity_types', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: '["patient"]'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('custom_field_categories', 'entity_types');
    await queryInterface.removeColumn('custom_field_categories', 'color');
  }
};
