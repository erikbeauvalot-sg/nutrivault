'use strict';

// Maps item_key → category_key based on registry group definitions
const ITEM_CATEGORY_MAP = {
  dashboard:                'clinic',
  patients:                 'clinic',
  clients:                  'clinic',
  agenda:                   'clinic',
  visits:                   'clinic',
  'consultation-templates': 'clinic',
  recipes:                  'nutrition',
  campaigns:                'communication',
  messages:                 'communication',
  billing:                  'finance',
  quotes:                   'finance',
  finance:                  'finance',
  documents:                'data',
  analytics:                'data',
  users:                    'admin',
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sidebar_menu_configs', 'category_key', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null
    });

    // Populate category_key for main section items
    for (const [itemKey, categoryKey] of Object.entries(ITEM_CATEGORY_MAP)) {
      await queryInterface.sequelize.query(
        `UPDATE sidebar_menu_configs SET category_key = ? WHERE item_key = ?`,
        { replacements: [categoryKey, itemKey] }
      );
    }

    // Settings section items get 'settings' category
    await queryInterface.sequelize.query(
      `UPDATE sidebar_menu_configs SET category_key = 'settings' WHERE section = 'settings'`
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sidebar_menu_configs', 'category_key');
  }
};
