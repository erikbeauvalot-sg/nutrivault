'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add entity_types column to custom_field_categories
    await queryInterface.addColumn('custom_field_categories', 'entity_types', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: '["patient"]',
      comment: 'Array of entity types where this category applies: patient, visit'
    });

    // Set default value for all existing categories to ["patient"] for backward compatibility
    await queryInterface.sequelize.query(`
      UPDATE custom_field_categories
      SET entity_types = '["patient"]'
      WHERE entity_types IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove entity_types column
    await queryInterface.removeColumn('custom_field_categories', 'entity_types');
  }
};
