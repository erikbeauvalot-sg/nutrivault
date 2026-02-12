'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sidebar_menu_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      item_key: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      section: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'main'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowed_roles: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '["ADMIN","DIETITIAN"]'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    const allRoles = JSON.stringify(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER']);
    const adminOnly = JSON.stringify(['ADMIN']);

    const items = [
      // Main section
      { item_key: 'dashboard',         section: 'main',     display_order: 1,  allowed_roles: allRoles },
      { item_key: 'patients',          section: 'main',     display_order: 2,  allowed_roles: allRoles },
      { item_key: 'agenda',            section: 'main',     display_order: 3,  allowed_roles: allRoles },
      { item_key: 'visits',            section: 'main',     display_order: 4,  allowed_roles: allRoles },
      { item_key: 'recipes',           section: 'main',     display_order: 5,  allowed_roles: allRoles },
      { item_key: 'campaigns',         section: 'main',     display_order: 6,  allowed_roles: allRoles },
      { item_key: 'messages',          section: 'main',     display_order: 7,  allowed_roles: allRoles },
      { item_key: 'billing',           section: 'main',     display_order: 8,  allowed_roles: allRoles },
      { item_key: 'documents',         section: 'main',     display_order: 9,  allowed_roles: allRoles },
      { item_key: 'analytics',         section: 'main',     display_order: 10, allowed_roles: allRoles },
      { item_key: 'users',             section: 'main',     display_order: 11, allowed_roles: adminOnly },
      // Settings section
      { item_key: 'myProfile',         section: 'settings', display_order: 1,  allowed_roles: allRoles },
      { item_key: 'themes',            section: 'settings', display_order: 2,  allowed_roles: allRoles },
      { item_key: 'email-templates',   section: 'settings', display_order: 3,  allowed_roles: allRoles },
      { item_key: 'email-config',      section: 'settings', display_order: 4,  allowed_roles: allRoles },
      { item_key: 'invoice-customization', section: 'settings', display_order: 5, allowed_roles: allRoles },
      { item_key: 'custom-fields',     section: 'settings', display_order: 6,  allowed_roles: adminOnly },
      { item_key: 'measures',          section: 'settings', display_order: 7,  allowed_roles: adminOnly },
      { item_key: 'roles',             section: 'settings', display_order: 8,  allowed_roles: adminOnly },
      { item_key: 'ai-config',         section: 'settings', display_order: 9,  allowed_roles: adminOnly },
      { item_key: 'scheduled-tasks',   section: 'settings', display_order: 10, allowed_roles: adminOnly },
      { item_key: 'discord',           section: 'settings', display_order: 11, allowed_roles: adminOnly },
      { item_key: 'sidebar-config',    section: 'settings', display_order: 12, allowed_roles: adminOnly },
    ];

    const rows = items.map(item => ({
      id: uuidv4(),
      item_key: item.item_key,
      section: item.section,
      display_order: item.display_order,
      is_visible: true,
      allowed_roles: item.allowed_roles,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await queryInterface.bulkInsert('sidebar_menu_configs', rows);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sidebar_menu_configs');
  }
};
