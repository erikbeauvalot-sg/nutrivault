const { v4: uuidv4 } = require('uuid');
const db = require('../../../models');
const { SidebarCategory, SidebarMenuConfig } = db;

/**
 * Convert a label to a URL-safe slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'category';
}

/**
 * Get all categories ordered by section + display_order
 */
async function getAllCategories() {
  return SidebarCategory.findAll({
    order: [['section', 'ASC'], ['display_order', 'ASC']]
  });
}

/**
 * Create a new category
 */
async function createCategory(data) {
  const { label, icon, section, is_default_open } = data;
  if (!label || !label.trim()) throw new Error('label is required');

  const safeSection = section === 'settings' ? 'settings' : 'main';

  // Generate unique key from label
  let baseKey = slugify(label.trim());
  let key = baseKey;
  let counter = 1;
  while (await SidebarCategory.findOne({ where: { key } })) {
    key = `${baseKey}-${counter++}`;
  }

  // Get next display_order for this section
  const maxOrder = await SidebarCategory.max('display_order', { where: { section: safeSection } });
  const display_order = (maxOrder || 0) + 1;

  return SidebarCategory.create({
    id: uuidv4(),
    key,
    label: label.trim(),
    icon: icon || '📁',
    section: safeSection,
    display_order,
    is_default_open: is_default_open !== undefined ? Boolean(is_default_open) : true
  });
}

/**
 * Update a category (key is immutable)
 */
async function updateCategory(id, data) {
  const category = await SidebarCategory.findByPk(id);
  if (!category) throw new Error('Category not found');

  const updates = {};
  if (data.label !== undefined) updates.label = data.label.trim();
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.is_default_open !== undefined) updates.is_default_open = Boolean(data.is_default_open);

  await category.update(updates);
  return category;
}

/**
 * Delete a category — only if no items are assigned to it
 */
async function deleteCategory(id) {
  const category = await SidebarCategory.findByPk(id);
  if (!category) throw new Error('Category not found');

  const count = await SidebarMenuConfig.count({ where: { category_key: category.key } });
  if (count > 0) {
    const err = new Error('Category has items assigned to it');
    err.code = 'HAS_ITEMS';
    err.count = count;
    throw err;
  }

  await category.destroy();
}

/**
 * Reorder categories within a section
 * @param {string} section - 'main' or 'settings'
 * @param {string[]} orderedIds - category IDs in new order
 */
async function reorderCategories(section, orderedIds) {
  const transaction = await db.sequelize.transaction();
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await SidebarCategory.update(
        { display_order: i + 1 },
        { where: { id: orderedIds[i], section }, transaction }
      );
    }
    await transaction.commit();
    return getAllCategories();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
