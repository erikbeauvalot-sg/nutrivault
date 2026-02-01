/**
 * Ingredient Service
 *
 * Business logic for ingredient management with RBAC and audit logging.
 */

const db = require('../../../models');
const Ingredient = db.Ingredient;
const User = db.User;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all ingredients with filtering and pagination
 *
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Filter criteria
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Ingredients list with pagination
 */
async function getIngredients(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = { is_active: true };

    // Category filter
    if (filters.category) {
      whereClause.category = filters.category;
    }

    // Search filter (normalized search)
    if (filters.search) {
      const normalizedSearch = filters.search
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[%_]/g, '\\$&');

      whereClause.name_normalized = { [Op.like]: `%${normalizedSearch}%` };
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await Ingredient.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['name', 'ASC']],
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
      action: 'READ',
      resource_type: 'ingredients',
      resource_id: null,
      changes: { filter_count: count },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return {
      ingredients: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'READ',
      resource_type: 'ingredients',
      status_code: 500,
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Search ingredients (autocomplete)
 *
 * @param {Object} user - Authenticated user
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Array>} Matching ingredients
 */
async function searchIngredients(user, query, limit = 10, requestMetadata = {}) {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[%_]/g, '\\$&');

    const ingredients = await Ingredient.findAll({
      where: {
        is_active: true,
        name_normalized: { [Op.like]: `%${normalizedQuery}%` }
      },
      limit: parseInt(limit),
      order: [
        // Prioritize exact matches at start
        [db.sequelize.literal(`CASE WHEN name_normalized LIKE '${normalizedQuery}%' THEN 0 ELSE 1 END`), 'ASC'],
        ['name', 'ASC']
      ],
      attributes: ['id', 'name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens']
    });

    return ingredients;
  } catch (error) {
    console.error('Error searching ingredients:', error);
    throw error;
  }
}

/**
 * Get ingredient by ID
 *
 * @param {string} id - Ingredient UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Ingredient object
 */
async function getIngredientById(id, user, requestMetadata = {}) {
  try {
    const ingredient = await Ingredient.findOne({
      where: { id, is_active: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        }
      ]
    });

    if (!ingredient) {
      const error = new Error('Ingredient not found');
      error.statusCode = 404;
      throw error;
    }

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'ingredients',
      resource_id: id,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return ingredient;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Create a new ingredient
 *
 * @param {Object} ingredientData - Ingredient data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Created ingredient
 */
async function createIngredient(ingredientData, user, requestMetadata = {}) {
  try {
    const ingredient = await Ingredient.create({
      name: ingredientData.name,
      category: ingredientData.category,
      default_unit: ingredientData.default_unit || 'g',
      nutrition_per_100g: ingredientData.nutrition_per_100g || {},
      allergens: ingredientData.allergens || [],
      is_system: false,
      created_by: user.id
    });

    // Reload with associations
    await ingredient.reload({
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
      resource_type: 'ingredients',
      resource_id: ingredient.id,
      changes: { after: ingredient.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 201
    });

    return ingredient;
  } catch (error) {
    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'CREATE',
      resource_type: 'ingredients',
      status_code: error.statusCode || 500,
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Update an ingredient
 *
 * @param {string} id - Ingredient UUID
 * @param {Object} updateData - Updated data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Updated ingredient
 */
async function updateIngredient(id, updateData, user, requestMetadata = {}) {
  try {
    const ingredient = await Ingredient.findOne({
      where: { id, is_active: true }
    });

    if (!ingredient) {
      const error = new Error('Ingredient not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = ingredient.toJSON();

    // Update allowed fields
    const allowedFields = ['name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        ingredient[field] = updateData[field];
      }
    });

    await ingredient.save();

    // Reload with associations
    await ingredient.reload({
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
      resource_type: 'ingredients',
      resource_id: id,
      changes: { before: beforeState, after: ingredient.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return ingredient;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Delete an ingredient (soft delete)
 *
 * @param {string} id - Ingredient UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Result
 */
async function deleteIngredient(id, user, requestMetadata = {}) {
  try {
    const ingredient = await Ingredient.findOne({
      where: { id, is_active: true }
    });

    if (!ingredient) {
      const error = new Error('Ingredient not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = ingredient.toJSON();

    // Soft delete
    ingredient.is_active = false;
    await ingredient.save();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'ingredients',
      resource_id: id,
      changes: { before: beforeState },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return { success: true, message: 'Ingredient deleted successfully' };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Duplicate an ingredient
 *
 * @param {string} id - Ingredient UUID to duplicate
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Duplicated ingredient
 */
async function duplicateIngredient(id, user, requestMetadata = {}) {
  try {
    const original = await Ingredient.findOne({
      where: { id, is_active: true }
    });

    if (!original) {
      const error = new Error('Ingredient not found');
      error.statusCode = 404;
      throw error;
    }

    // Create duplicate with "(Copy)" suffix
    const duplicated = await Ingredient.create({
      name: `${original.name} (Copy)`,
      category: original.category,
      default_unit: original.default_unit,
      nutrition_per_100g: original.nutrition_per_100g,
      allergens: original.allergens,
      is_system: false,
      created_by: user.id
    });

    // Reload with associations
    await duplicated.reload({
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
      resource_type: 'ingredients',
      resource_id: duplicated.id,
      changes: { duplicated_from: id, after: duplicated.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 201
    });

    return duplicated;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Get ingredient categories
 *
 * @returns {Promise<Array>} List of unique categories
 */
async function getCategories() {
  try {
    const categories = await Ingredient.findAll({
      where: { is_active: true },
      attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('category')), 'category']],
      raw: true
    });

    return categories
      .map(c => c.category)
      .filter(c => c !== null)
      .sort();
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getIngredients,
  searchIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  duplicateIngredient,
  getCategories
};
