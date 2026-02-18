const { Op } = require('sequelize');
const db = require('../../../models');

const {
  ConsultationTemplate,
  ConsultationTemplateItem,
  ConsultationNote,
  CustomFieldCategory,
  CustomFieldDefinition,
  MeasureDefinition,
  User
} = db;

const INCLUDE_ITEMS = [
  {
    model: ConsultationTemplateItem,
    as: 'items',
    separate: true,
    order: [['display_order', 'ASC']]
  },
  {
    model: User,
    as: 'creator',
    attributes: ['id', 'first_name', 'last_name', 'email']
  }
];

/**
 * Check if user can access a template (own, shared, or admin)
 */
function canAccess(template, user) {
  if (!user) return true;
  if (user.role?.name === 'ADMIN') return true;
  if (template.created_by === user.id) return true;
  if (template.visibility === 'shared') return true;
  return false;
}

/**
 * Enrich template items with their referenced data
 * - category items: load CustomFieldCategory + field_definitions
 * - measure items: load MeasureDefinition
 * - instruction items: already have inline data
 */
async function enrichTemplateItems(items) {
  if (!items || items.length === 0) return [];

  const enriched = [];

  for (const item of items) {
    const itemData = item.toJSON ? item.toJSON() : { ...item };

    if (item.item_type === 'category' && item.reference_id) {
      const category = await CustomFieldCategory.findByPk(item.reference_id, {
        include: [{
          model: CustomFieldDefinition,
          as: 'field_definitions',
          where: { is_active: true },
          required: false,
          order: [['display_order', 'ASC']]
        }]
      });
      itemData.category = category ? category.toJSON() : null;
    } else if (item.item_type === 'measure' && item.reference_id) {
      const measure = await MeasureDefinition.findByPk(item.reference_id);
      itemData.measure = measure ? measure.toJSON() : null;
    }

    enriched.push(itemData);
  }

  return enriched;
}

async function getTemplates(user, filters = {}) {
  const where = { is_active: true };

  if (filters.is_active !== undefined) {
    where.is_active = filters.is_active;
  }

  if (filters.template_type) {
    where.template_type = filters.template_type;
  }

  if (filters.search) {
    where.name = { [Op.like]: `%${filters.search}%` };
  }

  // RBAC: ADMIN sees all, others see own + shared
  if (user && user.role?.name !== 'ADMIN') {
    where[Op.or] = [
      { created_by: user.id },
      { visibility: 'shared' }
    ];
  }

  return ConsultationTemplate.findAll({
    where,
    include: INCLUDE_ITEMS,
    order: [['is_default', 'DESC'], ['updated_at', 'DESC']]
  });
}

async function getTemplateById(id, user) {
  const template = await ConsultationTemplate.findByPk(id, {
    include: INCLUDE_ITEMS
  });

  if (!template) {
    throw new Error('Template not found');
  }

  if (!canAccess(template, user)) {
    throw new Error('You do not have permission to view this template');
  }

  // Enrich items with referenced data
  const templateJson = template.toJSON();
  templateJson.items = await enrichTemplateItems(template.items);

  return templateJson;
}

async function createTemplate(data, userId) {
  const transaction = await db.sequelize.transaction();

  try {
    const { name, description, template_type, visibility, is_default, tags, color, items } = data;

    const template = await ConsultationTemplate.create({
      name,
      description,
      template_type: template_type || 'general',
      visibility: visibility || 'private',
      is_default: is_default || false,
      tags: tags || [],
      color,
      created_by: userId
    }, { transaction });

    // Create items
    if (items && items.length > 0) {
      const itemsToCreate = items.map((item, i) => ({
        template_id: template.id,
        item_type: item.item_type,
        reference_id: item.reference_id || null,
        display_order: item.display_order !== undefined ? item.display_order : i,
        is_required: item.is_required || false,
        instruction_title: item.instruction_title || null,
        instruction_content: item.instruction_content || null,
        layout_override: item.layout_override ? JSON.stringify(item.layout_override) : null
      }));
      await ConsultationTemplateItem.bulkCreate(itemsToCreate, { transaction });
    }

    await transaction.commit();
    return getTemplateById(template.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function updateTemplate(id, data, user) {
  const transaction = await db.sequelize.transaction();

  try {
    const template = await ConsultationTemplate.findByPk(id, { transaction });

    if (!template) {
      throw new Error('Template not found');
    }

    if (user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
      throw new Error('You do not have permission to update this template');
    }

    const { name, description, template_type, visibility, is_default, tags, color, items } = data;

    await template.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(template_type !== undefined && { template_type }),
      ...(visibility !== undefined && { visibility }),
      ...(is_default !== undefined && { is_default }),
      ...(tags !== undefined && { tags }),
      ...(color !== undefined && { color })
    }, { transaction });

    // Replace items if provided
    if (items !== undefined) {
      await ConsultationTemplateItem.destroy({
        where: { template_id: id },
        transaction
      });

      if (items.length > 0) {
        const itemsToCreate = items.map((item, i) => ({
          template_id: id,
          item_type: item.item_type,
          reference_id: item.reference_id || null,
          display_order: item.display_order !== undefined ? item.display_order : i,
          is_required: item.is_required || false,
          instruction_title: item.instruction_title || null,
          instruction_content: item.instruction_content || null,
          layout_override: item.layout_override ? JSON.stringify(item.layout_override) : null
        }));
        await ConsultationTemplateItem.bulkCreate(itemsToCreate, { transaction });
      }
    }

    await transaction.commit();
    return getTemplateById(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function deleteTemplate(id, user) {
  const template = await ConsultationTemplate.findByPk(id);

  if (!template) {
    throw new Error('Template not found');
  }

  if (user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
    throw new Error('You do not have permission to delete this template');
  }

  // Check if notes exist — soft delete if so
  const noteCount = await ConsultationNote.count({ where: { template_id: id } });

  if (noteCount > 0) {
    await template.update({ is_active: false });
    return { success: true, message: 'Template deactivated (has existing notes)' };
  }

  await template.destroy();
  return { success: true, message: 'Template deleted successfully' };
}

async function duplicateTemplate(id, name, userId) {
  const transaction = await db.sequelize.transaction();

  try {
    const original = await ConsultationTemplate.findByPk(id, {
      include: [{
        model: ConsultationTemplateItem,
        as: 'items'
      }],
      transaction
    });

    if (!original) {
      throw new Error('Template not found');
    }

    const clone = await ConsultationTemplate.create({
      name: name || `${original.name} (Copy)`,
      description: original.description,
      template_type: original.template_type,
      visibility: 'private',
      is_default: false,
      tags: original.tags,
      color: original.color,
      created_by: userId
    }, { transaction });

    // Clone items
    if (original.items && original.items.length > 0) {
      const itemsToCreate = original.items.map(item => ({
        template_id: clone.id,
        item_type: item.item_type,
        reference_id: item.reference_id,
        display_order: item.display_order,
        is_required: item.is_required,
        instruction_title: item.instruction_title,
        instruction_content: item.instruction_content,
        layout_override: item.getDataValue('layout_override')
      }));
      await ConsultationTemplateItem.bulkCreate(itemsToCreate, { transaction });
    }

    await transaction.commit();
    return getTemplateById(clone.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Item CRUD
async function addItem(templateId, data, user) {
  const template = await ConsultationTemplate.findByPk(templateId);
  if (!template) throw new Error('Template not found');
  if (user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
    throw new Error('You do not have permission to update this template');
  }

  const maxOrder = await ConsultationTemplateItem.max('display_order', {
    where: { template_id: templateId }
  });

  return ConsultationTemplateItem.create({
    template_id: templateId,
    item_type: data.item_type,
    reference_id: data.reference_id || null,
    display_order: data.display_order !== undefined ? data.display_order : (maxOrder || 0) + 1,
    is_required: data.is_required || false,
    instruction_title: data.instruction_title || null,
    instruction_content: data.instruction_content || null,
    layout_override: data.layout_override || null
  });
}

async function updateItem(itemId, data, user) {
  const item = await ConsultationTemplateItem.findByPk(itemId, {
    include: [{ model: ConsultationTemplate, as: 'template' }]
  });

  if (!item) throw new Error('Item not found');
  if (user.role?.name !== 'ADMIN' && item.template.created_by !== user.id) {
    throw new Error('You do not have permission to update this template');
  }

  return item.update({
    ...(data.item_type !== undefined && { item_type: data.item_type }),
    ...(data.reference_id !== undefined && { reference_id: data.reference_id }),
    ...(data.display_order !== undefined && { display_order: data.display_order }),
    ...(data.is_required !== undefined && { is_required: data.is_required }),
    ...(data.instruction_title !== undefined && { instruction_title: data.instruction_title }),
    ...(data.instruction_content !== undefined && { instruction_content: data.instruction_content }),
    ...(data.layout_override !== undefined && { layout_override: data.layout_override })
  });
}

async function removeItem(itemId, user) {
  const item = await ConsultationTemplateItem.findByPk(itemId, {
    include: [{ model: ConsultationTemplate, as: 'template' }]
  });

  if (!item) throw new Error('Item not found');
  if (user.role?.name !== 'ADMIN' && item.template.created_by !== user.id) {
    throw new Error('You do not have permission to delete this item');
  }

  await item.destroy();
  return { success: true, message: 'Item removed successfully' };
}

async function reorderItems(templateId, itemIds, user) {
  const template = await ConsultationTemplate.findByPk(templateId);
  if (!template) throw new Error('Template not found');
  if (user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
    throw new Error('You do not have permission to update this template');
  }

  const transaction = await db.sequelize.transaction();
  try {
    for (let i = 0; i < itemIds.length; i++) {
      await ConsultationTemplateItem.update(
        { display_order: i },
        { where: { id: itemIds[i], template_id: templateId }, transaction }
      );
    }
    await transaction.commit();
    return { success: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  enrichTemplateItems,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  addItem,
  updateItem,
  removeItem,
  reorderItems
};
