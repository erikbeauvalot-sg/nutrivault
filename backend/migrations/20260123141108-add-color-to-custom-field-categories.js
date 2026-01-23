'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add color column to custom_field_categories
    await queryInterface.addColumn('custom_field_categories', 'color', {
      type: Sequelize.STRING(7),
      allowNull: false,
      defaultValue: '#3498db', // Default blue color
      validate: {
        is: /^#[0-9A-Fa-f]{6}$/ // Hex color format validation
      }
    });

    // Set default colors for existing categories based on display_order
    const defaultColors = [
      '#3498db', // Blue
      '#2ecc71', // Green
      '#e74c3c', // Red
      '#f39c12', // Orange
      '#9b59b6', // Purple
      '#1abc9c', // Turquoise
      '#34495e', // Dark Gray
      '#e67e22'  // Dark Orange
    ];

    // Update existing categories with colors based on their display_order
    await queryInterface.sequelize.query(`
      UPDATE custom_field_categories
      SET color = CASE display_order
        WHEN 1 THEN '${defaultColors[0]}'
        WHEN 2 THEN '${defaultColors[1]}'
        WHEN 3 THEN '${defaultColors[2]}'
        WHEN 4 THEN '${defaultColors[3]}'
        WHEN 5 THEN '${defaultColors[4]}'
        WHEN 6 THEN '${defaultColors[5]}'
        WHEN 7 THEN '${defaultColors[6]}'
        WHEN 8 THEN '${defaultColors[7]}'
        ELSE '${defaultColors[0]}'
      END
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove color column
    await queryInterface.removeColumn('custom_field_categories', 'color');
  }
};
