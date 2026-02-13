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

    // Check if items already exist
    const existing = await queryInterface.sequelize.query(
      "SELECT item_key FROM sidebar_menu_configs WHERE item_key IN ('finance')",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const existingKeys = existing.map(r => r.item_key);
    const now = new Date();

    // Get max display_order in main section
    const maxOrder = await queryInterface.sequelize.query(
      "SELECT MAX(display_order) as max_order FROM sidebar_menu_configs WHERE section = 'main'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    let nextOrder = (maxOrder[0]?.max_order || 10) + 1;

    const items = [];

    if (!existingKeys.includes('finance')) {
      items.push({
        id: uuidv4(),
        item_key: 'finance',
        section: 'main',
        display_order: nextOrder++,
        is_visible: true,
        allowed_roles: JSON.stringify(['ADMIN', 'DIETITIAN', 'ASSISTANT']),
        created_at: now,
        updated_at: now
      });
    }

    if (items.length > 0) {
      await queryInterface.bulkInsert('sidebar_menu_configs', items);
      console.log(`✅ Added ${items.length} sidebar items (finance)`);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('sidebar_menu_configs', {
      item_key: ['finance']
    });
  }
};
