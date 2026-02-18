'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if sidebar_menu_configs table exists
    try {
      await queryInterface.sequelize.query('SELECT 1 FROM sidebar_menu_configs LIMIT 1');
    } catch {
      console.log('ℹ️  sidebar_menu_configs table does not exist, skipping');
      return;
    }

    // Check if item already exists
    const existing = await queryInterface.sequelize.query(
      "SELECT item_key FROM sidebar_menu_configs WHERE item_key = 'dashboard-settings'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      console.log('ℹ️  dashboard-settings sidebar item already exists, skipping');
      return;
    }

    // Get max display_order in settings section
    const maxOrder = await queryInterface.sequelize.query(
      "SELECT MAX(display_order) as max_order FROM sidebar_menu_configs WHERE section = 'settings'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const nextOrder = (maxOrder[0]?.max_order || 10) + 1;
    const now = new Date();

    await queryInterface.bulkInsert('sidebar_menu_configs', [{
      id: uuidv4(),
      item_key: 'dashboard-settings',
      section: 'settings',
      display_order: nextOrder,
      is_visible: true,
      allowed_roles: JSON.stringify(['ADMIN', 'DIETITIAN', 'ASSISTANT']),
      created_at: now,
      updated_at: now
    }]);

    console.log('✅ Added dashboard-settings sidebar item');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('sidebar_menu_configs', {
      item_key: 'dashboard-settings'
    });
  }
};
