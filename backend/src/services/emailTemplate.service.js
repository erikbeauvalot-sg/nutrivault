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

  // User-specific filtering: dietitian sees their own + system templates
  if (filters.userId) {
    where[Op.or] = where[Op.or] || [];
    // Merge with existing Op.or (search) or create new
    const userFilter = { [Op.or]: [{ user_id: filters.userId }, { user_id: null }] };
    if (where[Op.or].length > 0) {
      // Wrap existing search OR in an AND with user filter
      const searchOr = where[Op.or];
      delete where[Op.or];
      where[Op.and] = [
        { [Op.or]: searchOr },
        userFilter
      ];
    } else {
      delete where[Op.or];
      Object.assign(where, userFilter);
    }
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
 * Get template by slug (system template only - user_id IS NULL)
 * @param {string} slug - Template slug
 * @returns {Promise<Object>} Template object
 */
async function getTemplateBySlug(slug) {
  const template = await EmailTemplate.findOne({
    where: { slug, user_id: null }
  });

  if (!template) {
    throw new Error(`Template not found: ${slug}`);
  }

  return template;
}

/**
 * Get template by slug for a specific user (user override → system fallback)
 * @param {string} slug - Template slug
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Template object
 */
async function getTemplateBySlugForUser(slug, userId) {
  // Try user-specific template first
  if (userId) {
    const userTemplate = await EmailTemplate.findOne({
      where: { slug, user_id: userId }
    });
    if (userTemplate) return userTemplate;
  }

  // Fallback to system template
  return getTemplateBySlug(slug);
}

/**
 * Clone a system template for a dietitian (customize)
 * @param {string} templateId - System template ID to clone
 * @param {string} userId - User ID of the dietitian
 * @returns {Promise<Object>} New user-owned template
 */
async function customizeTemplate(templateId, userId) {
  const source = await getTemplateById(templateId);

  // Only system templates (user_id IS NULL) can be customized
  if (source.user_id) {
    throw new Error('Can only customize system templates');
  }

  // Check if user already has an override for this slug
  const existing = await EmailTemplate.findOne({
    where: { slug: source.slug, user_id: userId }
  });
  if (existing) {
    throw new Error('You already have a custom version of this template');
  }

  const clone = await EmailTemplate.create({
    name: source.name,
    slug: source.slug,
    category: source.category,
    description: source.description,
    subject: source.subject,
    body_html: source.body_html,
    body_text: source.body_text,
    available_variables: source.available_variables,
    is_active: true,
    is_system: false,
    user_id: userId,
    created_by: userId,
    version: 1
  });

  return clone;
}

/**
 * Delete a user's template override (reset to system default)
 * @param {string} templateId - User template ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function resetToDefault(templateId, userId) {
  const template = await getTemplateById(templateId);

  if (!template.user_id || template.user_id !== userId) {
    throw new Error('Can only reset your own template overrides');
  }

  await template.destroy({ force: true });
  return true;
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

// Fields to export for email templates (excludes IDs, timestamps, version)
const TEMPLATE_EXPORT_FIELDS = [
  'name', 'slug', 'category', 'description', 'subject', 'body_html', 'body_text',
  'available_variables', 'is_active', 'is_system'
];

function pickFields(obj, fields) {
  return fields.reduce((result, field) => {
    if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
    return result;
  }, {});
}

/**
 * Export email templates with their translations
 * @param {Array<string>} categories - Category filter (empty = all)
 * @returns {Promise<Object>} Export data
 */
async function exportTemplates(categories = []) {
  const MeasureTranslation = db.MeasureTranslation;
  const where = {};
  if (categories && categories.length > 0) {
    where.category = { [Op.in]: categories };
  }

  const templates = await EmailTemplate.findAll({
    where,
    order: [['category', 'ASC'], ['name', 'ASC']]
  });

  const exportData = {
    version: '1.0',
    type: 'email_templates',
    exportDate: new Date().toISOString(),
    templates: []
  };

  for (const template of templates) {
    const templateJson = template.toJSON();
    const exported = pickFields(templateJson, TEMPLATE_EXPORT_FIELDS);

    // Fetch translations for this template
    const translations = await MeasureTranslation.findAll({
      where: {
        entity_type: 'email_template',
        entity_id: template.id
      },
      order: [['language_code', 'ASC'], ['field_name', 'ASC']]
    });

    if (translations.length > 0) {
      exported.translations = {};
      for (const tr of translations) {
        if (!exported.translations[tr.language_code]) {
          exported.translations[tr.language_code] = {};
        }
        exported.translations[tr.language_code][tr.field_name] = tr.translated_value;
      }
    }

    exportData.templates.push(exported);
  }

  return exportData;
}

/**
 * Import email templates with their translations
 * @param {Object} importData - Import data with templates array
 * @param {Object} options - { skipExisting, updateExisting }
 * @param {string} userId - User performing the import
 * @returns {Promise<Object>} Import results
 */
async function importTemplates(importData, options = {}, userId) {
  const MeasureTranslation = db.MeasureTranslation;
  const transaction = await db.sequelize.transaction();

  try {
    const { skipExisting = true, updateExisting = false } = options;
    const results = {
      templatesCreated: 0,
      templatesUpdated: 0,
      templatesSkipped: 0,
      translationsCreated: 0,
      errors: []
    };

    if (!importData?.templates || !Array.isArray(importData.templates)) {
      throw new Error('Invalid import data format');
    }

    for (const tplData of importData.templates) {
      try {
        if (!tplData.slug || !tplData.name) {
          results.errors.push({
            type: 'template',
            name: tplData.name || 'unknown',
            error: 'Missing required fields: name, slug'
          });
          continue;
        }

        const existingTemplate = await EmailTemplate.findOne({
          where: { slug: tplData.slug },
          paranoid: false,
          transaction
        });

        let template;
        const translations = tplData.translations || {};
        const cleanData = pickFields(tplData, TEMPLATE_EXPORT_FIELDS);

        if (existingTemplate) {
          if (updateExisting) {
            const updateData = { ...cleanData };
            delete updateData.slug;
            delete updateData.is_system;
            updateData.updated_by = userId;

            if (existingTemplate.deleted_at) {
              await existingTemplate.restore({ transaction });
            }
            await existingTemplate.update(updateData, { transaction });
            template = existingTemplate;
            results.templatesUpdated++;
          } else if (skipExisting) {
            template = null;
            results.templatesSkipped++;
          } else {
            // Create with "(imported)" suffix
            template = await EmailTemplate.create({
              ...cleanData,
              slug: `${tplData.slug}_imported`,
              name: `${tplData.name} (imported)`,
              is_system: false,
              created_by: userId
            }, { transaction });
            results.templatesCreated++;
          }
        } else {
          template = await EmailTemplate.create({
            ...cleanData,
            is_system: tplData.is_system || false,
            created_by: userId
          }, { transaction });
          results.templatesCreated++;
        }

        // Import translations
        if (template && Object.keys(translations).length > 0) {
          for (const [langCode, fields] of Object.entries(translations)) {
            for (const [fieldName, value] of Object.entries(fields)) {
              if (!value) continue;

              const existingTr = await MeasureTranslation.findOne({
                where: {
                  entity_type: 'email_template',
                  entity_id: template.id,
                  language_code: langCode,
                  field_name: fieldName
                },
                transaction
              });

              if (existingTr) {
                if (updateExisting || !existingTemplate) {
                  await existingTr.update({ translated_value: value }, { transaction });
                  results.translationsCreated++;
                }
              } else {
                await MeasureTranslation.create({
                  entity_type: 'email_template',
                  entity_id: template.id,
                  language_code: langCode,
                  field_name: fieldName,
                  translated_value: value
                }, { transaction });
                results.translationsCreated++;
              }
            }
          }
        }
      } catch (tplError) {
        results.errors.push({
          type: 'template',
          name: tplData.name || 'unknown',
          error: tplError.message
        });
      }
    }

    await transaction.commit();
    return results;
  } catch (error) {
    await transaction.rollback();
    console.error('Error in importTemplates:', error);
    throw error;
  }
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  getTemplateBySlug,
  getTemplateBySlugForUser,
  customizeTemplate,
  resetToDefault,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  toggleActive,
  getTemplatesByCategory,
  isSlugAvailable,
  getTemplateStats,
  exportTemplates,
  importTemplates
};
