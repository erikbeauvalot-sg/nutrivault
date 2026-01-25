'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(custom_field_categories)`);
    if (cols.some(c => c.name === 'color')) {
      console.log('Column color already exists, skipping');
      return;
    }

    await queryInterface.addColumn('custom_field_categories', 'color', {
      type: Sequelize.STRING(7),
      allowNull: false,
      defaultValue: '#3498db'
    });

    const defaultColors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

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
    await queryInterface.removeColumn('custom_field_categories', 'color').catch(() => {});
  }
};
