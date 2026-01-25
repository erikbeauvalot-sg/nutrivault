/**
 * Email Template Service
 * Handles CRUD operations for email templates
 *
 * Sprint 5: US-5.5.2 - Email Templates
 */

const db = require('../../../models');
const EmailTemplate = db.EmailTemplate;
const { getAvailableVariablesByCategory } = require('./templateRenderer.service');
const { Op } = db.Sequelize;

/**
 * Get all email templates with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} filters.category - Filter by category
 * @param {boolean} filters.is_active - Filter by active status
 * @param {boolean} filters.is_system - Filter by system status
 * @param {string} filters.search - Search in name or description
 * @returns {Promise<Array>} Array of templates
 */
async function getAllTemplates(filters = {}) {
  const where = {};

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.is_active !== undefined) {
    where.is_active = filters.is_active;
  }

  if (filters.is_system !== undefined) {
    where.is_system = filters.is_system;
  }

  if (filters.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${filters.search}%` } },
      { description: { [Op.like]: `%${filters.search}%` } },
      { slug: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  return EmailTemplate.findAll({
    where,
    order: [
      ['is_system', 'DESC'], // System templates first
      ['category', 'ASC'],
      ['name', 'ASC']
    ]
  });
}

/**
 * Get template by ID
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Template object
 */
async function getTemplateById(id) {
  const template = await EmailTemplate.findByPk(id);

  if (!template) {
    throw new Error(`Template not found: ${id}`);
  }

  return template;
}

/**
 * Get template by slug
 * @param {string} slug - Template slug
 * @returns {Promise<Object>} Template object
 */
async function getTemplateBySlug(slug) {
  const template = await EmailTemplate.findOne({
    where: { slug }
  });

  if (!template) {
    throw new Error(`Template not found: ${slug}`);
  }

  return template;
}

/**
 * Create new email template
 * @param {Object} data - Template data
 * @param {string} userId - User creating the template
 * @returns {Promise<Object>} Created template
 */
async function createTemplate(data, userId) {
  // Set available variables based on category if not provided
  if (!data.available_variables) {
    data.available_variables = getAvailableVariablesByCategory(data.category);
  }

  // Set created_by
  data.created_by = userId;

  const template = await EmailTemplate.create(data);
  return template;
}

/**
 * Update email template
 * @param {string} id - Template ID
 * @param {Object} data - Updated template data
 * @param {string} userId - User updating the template
 * @returns {Promise<Object>} Updated template
 */
async function updateTemplate(id, data, userId) {
  const template = await getTemplateById(id);

  // Update available variables if category changed
  if (data.category && data.category !== template.category) {
    data.available_variables = getAvailableVariablesByCategory(data.category);
  }

  // Set updated_by
  data.updated_by = userId;

  await template.update(data);
  return template;
}

/**
 * Delete email template (soft delete)
 * @param {string} id - Template ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteTemplate(id) {
  const template = await getTemplateById(id);

  // System templates cannot be deleted (enforced by model hook)
  await template.destroy();
  return true;
}

/**
 * Duplicate template
 * @param {string} id - Template ID to duplicate
 * @param {Object} overrides - Fields to override in the duplicate
 * @param {string} userId - User creating the duplicate
 * @returns {Promise<Object>} New template
 */
async function duplicateTemplate(id, overrides = {}, userId) {
  const template = await getTemplateById(id);

  // Set created_by for the duplicate
  overrides.created_by = userId;

  return template.duplicate(overrides);
}

/**
 * Toggle template active status
 * @param {string} id - Template ID
 * @param {string} userId - User updating the template
 * @returns {Promise<Object>} Updated template
 */
async function toggleActive(id, userId) {
  const template = await getTemplateById(id);

  await template.update({
    is_active: !template.is_active,
    updated_by: userId
  });

  return template;
}

/**
 * Get templates by category
 * @param {string} category - Template category
 * @param {boolean} activeOnly - Only return active templates
 * @returns {Promise<Array>} Array of templates
 */
async function getTemplatesByCategory(category, activeOnly = true) {
  const where = { category };

  if (activeOnly) {
    where.is_active = true;
  }

  return EmailTemplate.findAll({
    where,
    order: [['name', 'ASC']]
  });
}

/**
 * Check if slug is available
 * @param {string} slug - Slug to check
 * @param {string} excludeId - Template ID to exclude (for updates)
 * @returns {Promise<boolean>} True if slug is available
 */
async function isSlugAvailable(slug, excludeId = null) {
  const where = { slug };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const existing = await EmailTemplate.findOne({ where });
  return !existing;
}

/**
 * Get template statistics
 * @returns {Promise<Object>} Template statistics
 */
async function getTemplateStats() {
  const total = await EmailTemplate.count();
  const active = await EmailTemplate.count({ where: { is_active: true } });
  const system = await EmailTemplate.count({ where: { is_system: true } });

  const byCategory = await EmailTemplate.findAll({
    attributes: [
      'category',
      [EmailTemplate.sequelize.fn('COUNT', EmailTemplate.sequelize.col('id')), 'count']
    ],
    group: ['category']
  });

  return {
    total,
    active,
    system,
    inactive: total - active,
    byCategory: byCategory.map(item => ({
      category: item.category,
      count: parseInt(item.get('count'))
    }))
  };
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  getTemplateBySlug,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  toggleActive,
  getTemplatesByCategory,
  isSlugAvailable,
  getTemplateStats
};
