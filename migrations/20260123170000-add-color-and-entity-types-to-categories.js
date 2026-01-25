'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper to check if column exists (SQLite)
    const columnExists = async (table, column) => {
      try {
        const [results] = await queryInterface.sequelize.query(`PRAGMA table_info(${table})`);
        return results.some(col => col.name === column);
      } catch (e) {
        return false;
      }
    };

    // Add color column if not exists
    if (!(await columnExists('custom_field_categories', 'color'))) {
      await queryInterface.addColumn('custom_field_categories', 'color', {
        type: Sequelize.STRING(7),
        allowNull: false,
        defaultValue: '#3498db'
      });
    }

    // Add entity_types column if not exists
    if (!(await columnExists('custom_field_categories', 'entity_types'))) {
      await queryInterface.addColumn('custom_field_categories', 'entity_types', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '["patient"]'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('custom_field_categories', 'entity_types').catch(() => {});
    await queryInterface.removeColumn('custom_field_categories', 'color').catch(() => {});
  }
};
