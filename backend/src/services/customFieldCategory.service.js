/**
 * Custom Field Category Service
 *
 * Business logic for managing custom field categories.
 * Handles CRUD operations with RBAC and audit logging.
 */

const db = require('../../../models');
const CustomFieldCategory = db.CustomFieldCategory;
const CustomFieldDefinition = db.CustomFieldDefinition;
const auditService = require('./audit.service');
const translationService = require('./customFieldTranslation.service');
const { Op } = db.Sequelize;

/**
 * Get all categories
 *
 * @param {Object} user - Authenticated user object
 * @param {Object} filters - Filter criteria
 * @param {boolean} filters.is_active - Filter by active status
 * @param {string} filters.language - Language code for translations (optional)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Categories
 */
async function getAllCategories(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = {};

    if (filters.is_active !== undefined) {
      whereClause.is_active = filters.is_active === true || filters.is_active === 'true';
    }

    const categories = await CustomFieldCategory.findAll({
      where: whereClause,
      order: [['display_order', 'ASC'], ['name', 'ASC']],
      include: [
        {
          model: CustomFieldDefinition,
          as: 'field_definitions',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'field_name', 'field_label', 'field_type', 'is_required', 'display_order', 'select_options', 'validation_rules', 'help_text']
        }
      ]
    });

    // Apply translations if language specified and not French (default)
    let translatedCategories = categories;
    if (filters.language && filters.language !== 'fr') {
      translatedCategories = await Promise.all(
        categories.map(async (category) => {
          const translatedCategory = await translationService.applyTranslations(
            category,
            'category',
            filters.language
          );

          // Also translate field definitions if present
          if (translatedCategory.field_definitions && translatedCategory.field_definitions.length > 0) {
            translatedCategory.field_definitions = await Promise.all(
              translatedCategory.field_definitions.map(definition =>
                translationService.applyTranslations(definition, 'field_definition', filters.language)
              )
            );
          }

          return translatedCategory;
        })
      );
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'custom_field_categories',
      resource_id: null,
      ...requestMetadata
    });

    return translatedCategories;
  } catch (error) {
    console.error('Error in getAllCategories:', error);
    throw error;
  }
}

/**
 * Get category by ID
 *
 * @param {Object} user - Authenticated user object
 * @param {string} categoryId - Category UUID
 * @param {string} language - Language code for translations (optional)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Category
 */
async function getCategoryById(user, categoryId, language = null, requestMetadata = {}) {
  try {
    const category = await CustomFieldCategory.findByPk(categoryId, {
      include: [
        {
          model: CustomFieldDefinition,
          as: 'field_definitions',
          order: [['display_order', 'ASC']]
        }
      ]
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Apply translations if language specified and not French (default)
    let translatedCategory = category;
    if (language && language !== 'fr') {
      translatedCategory = await translationService.applyTranslations(
        category,
        'category',
        language
      );

      // Also translate field definitions if present
      if (translatedCategory.field_definitions && translatedCategory.field_definitions.length > 0) {
        translatedCategory.field_definitions = await Promise.all(
          translatedCategory.field_definitions.map(definition =>
            translationService.applyTranslations(definition, 'field_definition', language)
          )
        );
      }
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'custom_field_category',
      resource_id: categoryId,
      ...requestMetadata
    });

    return translatedCategory;
  } catch (error) {
    console.error('Error in getCategoryById:', error);
    throw error;
  }
}

/**
 * Create a new category (Admin only)
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {Object} categoryData - Category data
 * @param {string} categoryData.name - Category name
 * @param {string} categoryData.description - Category description
 * @param {number} categoryData.display_order - Display order
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created category
 */
async function createCategory(user, categoryData, requestMetadata = {}) {
  try {
    const category = await CustomFieldCategory.create({
      name: categoryData.name,
      description: categoryData.description,
      display_order: categoryData.display_order || 0,
      is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
      color: categoryData.color || '#3498db',
      entity_types: categoryData.entity_types || ['patient'],
      visit_types: categoryData.visit_types || null,
      display_layout: categoryData.display_layout || { type: 'columns', columns: 1 },
      created_by: user.id
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'custom_field_category',
      resource_id: category.id,
      changes: { after: category.toJSON() },
      ...requestMetadata
    });

    return category;
  } catch (error) {
    console.error('Error in createCategory:', error);
    throw error;
  }
}

/**
 * Update a category (Admin only)
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {string} categoryId - Category UUID
 * @param {Object} updateData - Data to update
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated category
 */
async function updateCategory(user, categoryId, updateData, requestMetadata = {}) {
  try {
    const category = await CustomFieldCategory.findByPk(categoryId);

    if (!category) {
      throw new Error('Category not found');
    }

    const beforeData = category.toJSON();

    console.log('Updating category with data:', updateData);
    console.log('Color before:', category.color);

    // Update fields
    if (updateData.name !== undefined) category.name = updateData.name;
    if (updateData.description !== undefined) category.description = updateData.description;
    if (updateData.display_order !== undefined) category.display_order = updateData.display_order;
    if (updateData.is_active !== undefined) category.is_active = updateData.is_active;
    if (updateData.color !== undefined) category.color = updateData.color;
    if (updateData.entity_types !== undefined) category.entity_types = updateData.entity_types;
    if (updateData.visit_types !== undefined) category.visit_types = updateData.visit_types;
    if (updateData.display_layout !== undefined) category.display_layout = updateData.display_layout;

    console.log('Color after assignment:', category.color);

    await category.save();

    console.log('Color after save:', category.color);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'custom_field_category',
      resource_id: categoryId,
      changes: { before: beforeData, after: category.toJSON() },
      ...requestMetadata
    });

    return category;
  } catch (error) {
    console.error('Error in updateCategory:', error);
    throw error;
  }
}

/**
 * Delete a category (Admin only)
 * - If category is active: Soft delete by setting is_active to false
 * - If category is already inactive: Hard delete (remove from database)
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {string} categoryId - Category UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function deleteCategory(user, categoryId, requestMetadata = {}) {
  try {
    const category = await CustomFieldCategory.findByPk(categoryId);

    if (!category) {
      throw new Error('Category not found');
    }

    // Check if category has active field definitions
    const activeDefinitions = await CustomFieldDefinition.count({
      where: {
        category_id: categoryId,
        is_active: true
      }
    });

    if (activeDefinitions > 0) {
      throw new Error('Cannot delete category with active field definitions');
    }

    const beforeData = category.toJSON();

    // If category is already inactive, do a hard delete
    if (!category.is_active) {
      // Also check for any field definitions (active or inactive)
      const allDefinitions = await CustomFieldDefinition.count({
        where: { category_id: categoryId }
      });

      if (allDefinitions > 0) {
        throw new Error('Cannot permanently delete category with field definitions. Delete all fields first.');
      }

      // Hard delete the category
      await category.destroy();

      // Audit log
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'DELETE',
        resource_type: 'custom_field_category',
        resource_id: categoryId,
        changes: { before: beforeData, permanent: true },
        ...requestMetadata
      });

      return { message: 'Category permanently deleted', deleted: true };
    }

    // Soft delete (first delete)
    category.is_active = false;
    await category.save();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'custom_field_category',
      resource_id: categoryId,
      changes: { before: beforeData },
      ...requestMetadata
    });

    return { message: 'Category deactivated successfully', deleted: false };
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    throw error;
  }
}

/**
 * Reorder categories (Admin only)
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {Array} orderData - Array of {id, display_order} objects
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function reorderCategories(user, orderData, requestMetadata = {}) {
  try {
    const transaction = await db.sequelize.transaction();

    try {
      for (const item of orderData) {
        await CustomFieldCategory.update(
          { display_order: item.display_order },
          { where: { id: item.id }, transaction }
        );
      }

      await transaction.commit();

      // Audit log
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        resource_type: 'custom_field_categories',
        resource_id: null,
        changes: { after: { reorder: orderData } },
        ...requestMetadata
      });

      return { message: 'Categories reordered successfully' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error in reorderCategories:', error);
    throw error;
  }
}

/**
 * Duplicate a category
 *
 * @param {Object} user - Authenticated user object
 * @param {string} categoryId - ID of the category to duplicate
 * @param {Object} overrides - Optional overrides for the duplicated category
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Duplicated category
 */
async function duplicateCategory(user, categoryId, overrides = {}, requestMetadata = {}) {
  try {
    // Get the original category
    const originalCategory = await CustomFieldCategory.findByPk(categoryId);
    if (!originalCategory) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    // Create the duplicated category data
    const duplicatedData = {
      name: overrides.name || `${originalCategory.name} (Copy)`,
      description: overrides.description !== undefined ? overrides.description : originalCategory.description,
      color: overrides.color || originalCategory.color,
      display_order: overrides.display_order !== undefined ? overrides.display_order : originalCategory.display_order + 1,
      entity_types: overrides.entity_types || originalCategory.entity_types,
      visit_types: overrides.visit_types !== undefined ? overrides.visit_types : originalCategory.visit_types,
      display_layout: overrides.display_layout !== undefined ? overrides.display_layout : originalCategory.display_layout,
      is_active: overrides.is_active !== undefined ? overrides.is_active : true
    };

    // Create the duplicated category
    const duplicatedCategory = await CustomFieldCategory.create(duplicatedData);

    // Log the action
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'CustomFieldCategory',
      resource_id: duplicatedCategory.id,
      changes: {
        action: 'DUPLICATE',
        original_id: categoryId,
        duplicated_data: duplicatedData
      },
      ...requestMetadata
    });

    // Get the full duplicated category with translations
    const result = await getCategoryById(user, duplicatedCategory.id, {}, requestMetadata);

    return result;
  } catch (error) {
    console.error('Error in duplicateCategory:', error);
    throw error;
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  duplicateCategory,
  reorderCategories
};
