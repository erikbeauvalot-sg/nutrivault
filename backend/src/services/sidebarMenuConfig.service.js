const { v4: uuidv4 } = require('uuid');
const db = require('../../../models');
const { SidebarMenuConfig } = db;

/**
 * Default sidebar config matching the current hardcoded sidebar
 */
const DEFAULT_ITEMS = [
  // Main section
  { item_key: 'dashboard',         section: 'main',     display_order: 1,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'clinic' },
  { item_key: 'patients',          section: 'main',     display_order: 2,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'clinic' },
  { item_key: 'clients',           section: 'main',     display_order: 3,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'clinic' },
  { item_key: 'agenda',            section: 'main',     display_order: 4,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'clinic' },
  { item_key: 'visits',            section: 'main',     display_order: 5,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'clinic' },
  { item_key: 'consultation-templates', section: 'main', display_order: 6, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'clinic' },
  { item_key: 'recipes',           section: 'main',     display_order: 7,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'nutrition' },
  { item_key: 'campaigns',         section: 'main',     display_order: 8,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'communication' },
  { item_key: 'messages',          section: 'main',     display_order: 9,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'communication' },
  { item_key: 'billing',           section: 'main',     display_order: 10, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'finance' },
  { item_key: 'quotes',            section: 'main',     display_order: 11, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'finance' },
  { item_key: 'finance',           section: 'main',     display_order: 12, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'finance' },
  { item_key: 'documents',         section: 'main',     display_order: 13, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'data' },
  { item_key: 'analytics',         section: 'main',     display_order: 14, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'data' },
  { item_key: 'users',             section: 'main',     display_order: 15, allowed_roles: ['ADMIN'],                                 category_key: 'admin' },
  // Settings section
  { item_key: 'myProfile',         section: 'settings', display_order: 1,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'settings' },
  { item_key: 'themes',            section: 'settings', display_order: 2,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'settings' },
  { item_key: 'email-templates',   section: 'settings', display_order: 3,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'settings' },
  { item_key: 'email-config',      section: 'settings', display_order: 4,  allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'settings' },
  { item_key: 'invoice-customization', section: 'settings', display_order: 5, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'settings' },
  { item_key: 'custom-fields',     section: 'settings', display_order: 6,  allowed_roles: ['ADMIN'],                                 category_key: 'settings' },
  { item_key: 'measures',          section: 'settings', display_order: 7,  allowed_roles: ['ADMIN'],                                 category_key: 'settings' },
  { item_key: 'roles',             section: 'settings', display_order: 8,  allowed_roles: ['ADMIN'],                                 category_key: 'settings' },
  { item_key: 'ai-config',         section: 'settings', display_order: 9,  allowed_roles: ['ADMIN'],                                 category_key: 'settings' },
  { item_key: 'scheduled-tasks',   section: 'settings', display_order: 10, allowed_roles: ['ADMIN'],                                 category_key: 'settings' },
  { item_key: 'discord',           section: 'settings', display_order: 11, allowed_roles: ['ADMIN'],                                 category_key: 'settings' },
  { item_key: 'dashboard-settings',section: 'settings', display_order: 12, allowed_roles: ['ADMIN','DIETITIAN','ASSISTANT','VIEWER'], category_key: 'settings' },
  { item_key: 'sidebar-config',    section: 'settings', display_order: 13, allowed_roles: ['ADMIN'],                                 category_key: 'settings' },
];

/**
 * Get all sidebar menu configs sorted by section + display_order
 */
async function getAllConfigs() {
  const configs = await SidebarMenuConfig.findAll({
    order: [['section', 'ASC'], ['display_order', 'ASC']]
  });
  return configs;
}

/**
 * Bulk update sidebar menu items
 * @param {Array} items - Array of { item_key, display_order, is_visible, allowed_roles, section }
 */
async function bulkUpdate(items) {
  const transaction = await db.sequelize.transaction();
  try {
    for (const item of items) {
      const updateData = {};
      if (item.display_order !== undefined) updateData.display_order = item.display_order;
      if (item.is_visible !== undefined) updateData.is_visible = item.is_visible;
      if (item.allowed_roles !== undefined) updateData.allowed_roles = item.allowed_roles;
      if (item.section !== undefined) updateData.section = item.section;
      if (item.category_key !== undefined) updateData.category_key = item.category_key;

      await SidebarMenuConfig.update(updateData, {
        where: { item_key: item.item_key },
        transaction
      });
    }
    await transaction.commit();
    return getAllConfigs();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Reorder items within a section
 * @param {string} section - 'main' or 'settings'
 * @param {Array} orderData - Array of { item_key, display_order }
 */
async function reorderItems(section, orderData) {
  const transaction = await db.sequelize.transaction();
  try {
    for (const item of orderData) {
      await SidebarMenuConfig.update(
        { display_order: item.display_order },
        { where: { item_key: item.item_key, section }, transaction }
      );
    }
    await transaction.commit();
    return getAllConfigs();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Reset all sidebar configs to defaults
 */
async function resetToDefaults() {
  const transaction = await db.sequelize.transaction();
  try {
    await SidebarMenuConfig.destroy({ where: {}, transaction });

    const rows = DEFAULT_ITEMS.map(item => ({
      id: uuidv4(),
      item_key: item.item_key,
      section: item.section,
      display_order: item.display_order,
      is_visible: true,
      allowed_roles: item.allowed_roles,
      category_key: item.category_key || null,
    }));

    await SidebarMenuConfig.bulkCreate(rows, { transaction });
    await transaction.commit();
    return getAllConfigs();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  getAllConfigs,
  bulkUpdate,
  reorderItems,
  resetToDefaults,
  DEFAULT_ITEMS
};
