/**
 * Recipe Category Service
 *
 * Business logic for recipe category management with RBAC and audit logging.
 */

const db = require('../../../models');
const RecipeCategory = db.RecipeCategory;
const User = db.User;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all recipe categories
 *
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Filter criteria
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Categories list
 */
async function getCategories(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = {};

    // By default, only show active categories
    if (filters.is_active !== undefined) {
      whereClause.is_active = filters.is_active === 'true' || filters.is_active === true;
    } else {
      whereClause.is_active = true;
    }

    if (filters.search) {
      const sanitizedSearch = filters.search.replace(/[%_]/g, '\\$&');
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${sanitizedSearch}%` } },
        { description: { [Op.like]: `%${sanitizedSearch}%` } }
      ];
    }

    const categories = await RecipeCategory.findAll({
      where: whereClause,
      order: [['display_order', 'ASC'], ['name', 'ASC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'recipe_categories',
      resource_id: null,
      changes: { count: categories.length },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return { categories };
  } catch (error) {
    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'READ',
      resource_type: 'recipe_categories',
      status_code: 500,
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Get category by ID
 *
 * @param {string} id - Category UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Category object
 */
async function getCategoryById(id, user, requestMetadata = {}) {
  try {
    const category = await RecipeCategory.findOne({
      where: { id, is_active: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    if (!category) {
      const error = new Error('Recipe category not found');
      error.statusCode = 404;
      throw error;
    }

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'recipe_categories',
      resource_id: id,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return category;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Create a new recipe category
 *
 * @param {Object} categoryData - Category data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Created category
 */
async function createCategory(categoryData, user, requestMetadata = {}) {
  try {
    // Get max display_order for new category
    const maxOrder = await RecipeCategory.max('display_order') || 0;

    const category = await RecipeCategory.create({
      name: categoryData.name,
      description: categoryData.description,
      icon: categoryData.icon,
      color: categoryData.color,
      display_order: categoryData.display_order ?? maxOrder + 1,
      created_by: user.id
    });

    // Reload with associations
    await category.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'recipe_categories',
      resource_id: category.id,
      changes: { after: category.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 201
    });

    return category;
  } catch (error) {
    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'CREATE',
      resource_type: 'recipe_categories',
      status_code: error.statusCode || 500,
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Update a recipe category
 *
 * @param {string} id - Category UUID
 * @param {Object} updateData - Updated data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Updated category
 */
async function updateCategory(id, updateData, user, requestMetadata = {}) {
  try {
    const category = await RecipeCategory.findOne({
      where: { id, is_active: true }
    });

    if (!category) {
      const error = new Error('Recipe category not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = category.toJSON();

    // Update allowed fields
    const allowedFields = ['name', 'description', 'icon', 'color', 'display_order'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        category[field] = updateData[field];
      }
    });

    await category.save();

    // Reload with associations
    await category.reload({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'recipe_categories',
      resource_id: id,
      changes: { before: beforeState, after: category.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return category;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Delete a recipe category (soft delete)
 *
 * @param {string} id - Category UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Result
 */
async function deleteCategory(id, user, requestMetadata = {}) {
  try {
    const category = await RecipeCategory.findOne({
      where: { id, is_active: true }
    });

    if (!category) {
      const error = new Error('Recipe category not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = category.toJSON();

    // Soft delete
    category.is_active = false;
    await category.save();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'recipe_categories',
      resource_id: id,
      changes: { before: beforeState },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return { success: true, message: 'Recipe category deleted successfully' };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Reorder categories
 *
 * @param {Array} orderedIds - Array of category IDs in new order
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Result
 */
async function reorderCategories(orderedIds, user, requestMetadata = {}) {
  try {
    const transaction = await db.sequelize.transaction();

    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await RecipeCategory.update(
          { display_order: i },
          { where: { id: orderedIds[i] }, transaction }
        );
      }

      await transaction.commit();

      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        resource_type: 'recipe_categories',
        resource_id: null,
        changes: { reordered: orderedIds },
        ip_address: requestMetadata.ip,
        user_agent: requestMetadata.userAgent,
        request_method: requestMetadata.method,
        request_path: requestMetadata.path,
        status_code: 200
      });

      return { success: true, message: 'Categories reordered successfully' };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
