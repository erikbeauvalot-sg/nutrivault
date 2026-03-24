'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const adminOnly = JSON.stringify(['ADMIN']);

    await queryInterface.bulkInsert('sidebar_menu_configs', [
      {
        id: uuidv4(),
        item_key: 'ip-blacklist',
        section: 'settings',
        display_order: 12,
        is_visible: true,
        allowed_roles: adminOnly,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('sidebar_menu_configs', {
      item_key: 'ip-blacklist'
    });
  }
};
