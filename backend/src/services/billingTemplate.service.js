/**
 * Billing Template Service
 * Handles business logic for billing templates
 */

const { Op } = require('sequelize');
const db = require('../../../models');

const { BillingTemplate, BillingTemplateItem, User } = db;

/**
 * Get all billing templates with filters
 * @param {Object} filters - Query filters
 * @param {Object} user - User making the request (for role-based filtering)
 * @returns {Promise<Array>} List of templates
 */
async function getAllTemplates(filters = {}, user = null) {
  try {
    const where = {};

    // Filter by active status
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    // Search by name
    if (filters.search) {
      where.name = {
        [Op.like]: `%${filters.search}%`
      };
    }

    // Role-based filtering:
    // - ADMIN: sees all templates
    // - DIETITIAN: sees only their own templates
    if (user && user.role?.name !== 'ADMIN') {
      where.created_by = user.id;
    }

    const templates = await BillingTemplate.findAll({
      where,
      include: [
        {
          model: BillingTemplateItem,
          as: 'items',
          attributes: ['id', 'item_name', 'description', 'quantity', 'unit_price', 'sort_order'],
          separate: true, // Prevents cartesian product
          order: [['sort_order', 'ASC']]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [
        ['is_default', 'DESC'], // Default template first
        ['name', 'ASC']
      ]
    });

    // Calculate totals for each template
    const templatesWithTotals = templates.map(template => {
      const plainTemplate = template.toJSON();
      const total = plainTemplate.items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }, 0);
      plainTemplate.total_amount = parseFloat(total.toFixed(2));
      plainTemplate.item_count = plainTemplate.items.length;
      return plainTemplate;
    });

    return templatesWithTotals;
  } catch (error) {
    console.error('[BillingTemplateService] Error getting all templates:', error);
    throw error;
  }
}

/**
 * Get template by ID with items
 * @param {string} templateId - Template ID
 * @param {Object} user - User making the request (optional, for permission check)
 * @returns {Promise<Object>} Template with items
 */
async function getTemplateById(templateId, user = null) {
  try {
    const template = await BillingTemplate.findByPk(templateId, {
      include: [
        {
          model: BillingTemplateItem,
          as: 'items',
          order: [['sort_order', 'ASC']]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Permission check: ADMIN can see all, DIETITIAN can only see their own
    if (user && user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
      throw new Error('You do not have permission to view this template');
    }

    // Calculate total
    const plainTemplate = template.toJSON();
    const total = plainTemplate.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);
    plainTemplate.total_amount = parseFloat(total.toFixed(2));

    return plainTemplate;
  } catch (error) {
    console.error('[BillingTemplateService] Error getting template by ID:', error);
    throw error;
  }
}

/**
 * Create billing template with items
 * @param {Object} data - Template data with items
 * @param {string} userId - User creating the template
 * @returns {Promise<Object>} Created template
 */
async function createTemplate(data, userId) {
  const transaction = await db.sequelize.transaction();

  try {
    const { name, description, is_default, is_active, items } = data;

    // Validate items
    if (!items || items.length === 0) {
      throw new Error('Template must have at least one item');
    }

    // Create template
    const template = await BillingTemplate.create({
      name,
      description,
      is_default: is_default || false,
      is_active: is_active !== undefined ? is_active : true,
      created_by: userId
    }, { transaction });

    // Create items with sort order
    const itemsWithOrder = items.map((item, index) => ({
      billing_template_id: template.id,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity || 1.00,
      unit_price: item.unit_price,
      sort_order: item.sort_order !== undefined ? item.sort_order : index + 1
    }));

    await BillingTemplateItem.bulkCreate(itemsWithOrder, { transaction });

    await transaction.commit();

    // Fetch and return complete template
    return await getTemplateById(template.id);
  } catch (error) {
    await transaction.rollback();
    console.error('[BillingTemplateService] Error creating template:', error);
    throw error;
  }
}

/**
 * Update billing template
 * @param {string} templateId - Template ID
 * @param {Object} data - Updated template data
 * @param {Object} user - User updating the template (contains id and role)
 * @returns {Promise<Object>} Updated template
 */
async function updateTemplate(templateId, data, user) {
  const transaction = await db.sequelize.transaction();

  try {
    const template = await BillingTemplate.findByPk(templateId, { transaction });

    if (!template) {
      throw new Error('Template not found');
    }

    // Permission check: only ADMIN or template creator can update
    if (user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
      throw new Error('You do not have permission to update this template');
    }

    const { name, description, is_default, is_active, items } = data;

    // Update template
    await template.update({
      name: name !== undefined ? name : template.name,
      description: description !== undefined ? description : template.description,
      is_default: is_default !== undefined ? is_default : template.is_default,
      is_active: is_active !== undefined ? is_active : template.is_active
    }, { transaction });

    // Update items if provided
    if (items) {
      // Delete existing items
      await BillingTemplateItem.destroy({
        where: { billing_template_id: templateId },
        transaction
      });

      // Create new items
      const itemsWithOrder = items.map((item, index) => ({
        billing_template_id: templateId,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity || 1.00,
        unit_price: item.unit_price,
        sort_order: item.sort_order !== undefined ? item.sort_order : index + 1
      }));

      await BillingTemplateItem.bulkCreate(itemsWithOrder, { transaction });
    }

    await transaction.commit();

    // Fetch and return complete template
    return await getTemplateById(templateId);
  } catch (error) {
    await transaction.rollback();
    console.error('[BillingTemplateService] Error updating template:', error);
    throw error;
  }
}

/**
 * Delete billing template
 * @param {string} templateId - Template ID
 * @param {Object} user - User deleting the template (contains id and role)
 * @returns {Promise<Object>} Deletion result
 */
async function deleteTemplate(templateId, user) {
  try {
    const template = await BillingTemplate.findByPk(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // Permission check: only ADMIN or template creator can delete
    if (user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
      throw new Error('You do not have permission to delete this template');
    }

    // Prevent deletion of default template
    if (template.is_default) {
      throw new Error('Cannot delete default template. Set another template as default first.');
    }

    await template.destroy();

    return {
      success: true,
      message: 'Template deleted successfully'
    };
  } catch (error) {
    console.error('[BillingTemplateService] Error deleting template:', error);
    throw error;
  }
}

/**
 * Clone billing template
 * @param {string} templateId - Template ID to clone
 * @param {string} newName - Name for cloned template
 * @param {string} userId - User creating the clone
 * @returns {Promise<Object>} Cloned template
 */
async function cloneTemplate(templateId, newName, userId) {
  const transaction = await db.sequelize.transaction();

  try {
    const originalTemplate = await BillingTemplate.findByPk(templateId, {
      include: [{
        model: BillingTemplateItem,
        as: 'items',
        order: [['sort_order', 'ASC']]
      }],
      transaction
    });

    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    // Create cloned template
    const clonedTemplate = await BillingTemplate.create({
      name: newName || `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description,
      is_default: false, // Clones are never default
      is_active: true,
      created_by: userId
    }, { transaction });

    // Clone items
    const clonedItems = originalTemplate.items.map(item => ({
      billing_template_id: clonedTemplate.id,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: item.sort_order
    }));

    await BillingTemplateItem.bulkCreate(clonedItems, { transaction });

    await transaction.commit();

    // Fetch and return complete cloned template
    return await getTemplateById(clonedTemplate.id);
  } catch (error) {
    await transaction.rollback();
    console.error('[BillingTemplateService] Error cloning template:', error);
    throw error;
  }
}

/**
 * Get default billing template
 * @param {Object} user - User making the request (optional, for role-based filtering)
 * @returns {Promise<Object>} Default template
 */
async function getDefaultTemplate(user = null) {
  try {
    const where = {
      is_default: true,
      is_active: true
    };

    // Role-based filtering:
    // - ADMIN: gets global default template
    // - DIETITIAN: gets their own default template
    if (user && user.role?.name !== 'ADMIN') {
      where.created_by = user.id;
    }

    const template = await BillingTemplate.findOne({
      where,
      include: [{
        model: BillingTemplateItem,
        as: 'items',
        order: [['sort_order', 'ASC']]
      }]
    });

    if (!template) {
      return null;
    }

    const plainTemplate = template.toJSON();
    const total = plainTemplate.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);
    plainTemplate.total_amount = parseFloat(total.toFixed(2));

    return plainTemplate;
  } catch (error) {
    console.error('[BillingTemplateService] Error getting default template:', error);
    throw error;
  }
}

/**
 * Set template as default
 * @param {string} templateId - Template ID to set as default
 * @param {Object} user - User making the request (contains id and role)
 * @returns {Promise<Object>} Updated template
 */
async function setAsDefault(templateId, user) {
  const transaction = await db.sequelize.transaction();

  try {
    const template = await BillingTemplate.findByPk(templateId, { transaction });

    if (!template) {
      throw new Error('Template not found');
    }

    // Permission check: only ADMIN or template creator can set as default
    if (user.role?.name !== 'ADMIN' && template.created_by !== user.id) {
      throw new Error('You do not have permission to set this template as default');
    }

    // Clear all other defaults
    await BillingTemplate.update(
      { is_default: false },
      {
        where: { is_default: true },
        transaction
      }
    );

    // Set this template as default
    await template.update({ is_default: true }, { transaction });

    await transaction.commit();

    return await getTemplateById(templateId, null); // null = skip permission check (already verified)
  } catch (error) {
    await transaction.rollback();
    console.error('[BillingTemplateService] Error setting default template:', error);
    throw error;
  }
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  getDefaultTemplate,
  setAsDefault
};
