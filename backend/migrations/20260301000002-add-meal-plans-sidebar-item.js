'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.sequelize.query(
      "SELECT item_key FROM sidebar_menu_configs WHERE item_key = 'meal-plans'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      // Ensure category_key is set if missing
      await queryInterface.sequelize.query(
        "UPDATE sidebar_menu_configs SET category_key = 'nutrition' WHERE item_key = 'meal-plans' AND (category_key IS NULL OR category_key = '')",
        { type: Sequelize.QueryTypes.UPDATE }
      );
      return;
    }

    // Shift items after recipes (display_order >= 8) to make room
    await queryInterface.sequelize.query(
      "UPDATE sidebar_menu_configs SET display_order = display_order + 1 WHERE section = 'main' AND display_order >= 8",
      { type: Sequelize.QueryTypes.UPDATE }
    );

    await queryInterface.bulkInsert('sidebar_menu_configs', [{
      id: uuidv4(),
      item_key: 'meal-plans',
      section: 'main',
      display_order: 8,
      is_visible: true,
      allowed_roles: JSON.stringify(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER']),
      category_key: 'nutrition',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('sidebar_menu_configs', { item_key: 'meal-plans' });
    // Shift back
    await queryInterface.sequelize.query(
      "UPDATE sidebar_menu_configs SET display_order = display_order - 1 WHERE section = 'main' AND display_order > 8",
      { type: Sequelize.QueryTypes.UPDATE }
    );
  }
};
