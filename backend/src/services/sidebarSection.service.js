const { v4: uuidv4 } = require('uuid');
const db = require('../../../models');
const { SidebarSection, SidebarCategory } = db;

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'section';
}

async function getAllSections() {
  return SidebarSection.findAll({ order: [['display_order', 'ASC']] });
}

async function createSection(data) {
  const { label, icon, is_default_open } = data;
  if (!label || !label.trim()) throw new Error('label is required');

  let baseKey = slugify(label.trim());
  let key = baseKey;
  let counter = 1;
  while (await SidebarSection.findOne({ where: { key } })) {
    key = `${baseKey}-${counter++}`;
  }

  const maxOrder = await SidebarSection.max('display_order');
  const display_order = (maxOrder || 0) + 1;

  return SidebarSection.create({
    id: uuidv4(),
    key,
    label: label.trim(),
    icon: icon || '📁',
    display_order,
    is_default_open: is_default_open !== undefined ? Boolean(is_default_open) : true
  });
}

async function updateSection(id, data) {
  const section = await SidebarSection.findByPk(id);
  if (!section) throw new Error('Section not found');

  const updates = {};
  if (data.label !== undefined) updates.label = data.label.trim();
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.is_default_open !== undefined) updates.is_default_open = Boolean(data.is_default_open);

  await section.update(updates);
  return section;
}

async function deleteSection(id) {
  const section = await SidebarSection.findByPk(id);
  if (!section) throw new Error('Section not found');

  // Prevent deleting built-in sections
  if (section.key === 'main' || section.key === 'settings') {
    const err = new Error('Cannot delete built-in section');
    err.code = 'BUILTIN';
    throw err;
  }

  // Check if any categories use this section
  const count = await SidebarCategory.count({ where: { section: section.key } });
  if (count > 0) {
    const err = new Error('Section has categories assigned to it');
    err.code = 'HAS_CATEGORIES';
    err.count = count;
    throw err;
  }

  await section.destroy();
}

async function reorderSections(orderedIds) {
  const transaction = await db.sequelize.transaction();
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await SidebarSection.update(
        { display_order: i + 1 },
        { where: { id: orderedIds[i] }, transaction }
      );
    }
    await transaction.commit();
    return getAllSections();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { getAllSections, createSection, updateSection, deleteSection, reorderSections };
