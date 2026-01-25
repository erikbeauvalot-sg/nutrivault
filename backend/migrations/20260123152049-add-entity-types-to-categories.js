'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(custom_field_categories)`);
    if (cols.some(c => c.name === 'entity_types')) {
      console.log('Column entity_types already exists, skipping');
      return;
    }

    await queryInterface.addColumn('custom_field_categories', 'entity_types', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: '["patient"]',
      comment: 'Array of entity types where this category applies: patient, visit'
    });

    await queryInterface.sequelize.query(`
      UPDATE custom_field_categories
      SET entity_types = '["patient"]'
      WHERE entity_types IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('custom_field_categories', 'entity_types').catch(() => {});
  }
};
