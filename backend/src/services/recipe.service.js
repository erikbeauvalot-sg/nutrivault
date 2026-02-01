/**
 * Recipe Service
 *
 * Business logic for recipe management with RBAC and audit logging.
 */

const db = require('../../../models');
const Recipe = db.Recipe;
const RecipeCategory = db.RecipeCategory;
const RecipeIngredient = db.RecipeIngredient;
const Ingredient = db.Ingredient;
const User = db.User;
const auditService = require('./audit.service');
const { Op } = db.Sequelize;

/**
 * Get all recipes with filtering and pagination
 *
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Filter criteria
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Recipes list with pagination
 */
async function getRecipes(user, filters = {}, requestMetadata = {}) {
  try {
    const whereClause = { is_active: true };

    // Status filter
    if (filters.status) {
      whereClause.status = filters.status;
    }

    // Category filter
    if (filters.category_id) {
      whereClause.category_id = filters.category_id;
    }

    // Difficulty filter
    if (filters.difficulty) {
      whereClause.difficulty = filters.difficulty;
    }

    // Created by filter (my recipes)
    if (filters.created_by) {
      whereClause.created_by = filters.created_by;
    }

    // Search filter
    if (filters.search) {
      const sanitizedSearch = filters.search.replace(/[%_]/g, '\\$&');
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${sanitizedSearch}%` } },
        { description: { [Op.like]: `%${sanitizedSearch}%` } }
      ];
    }

    // Tags filter (JSON contains)
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      // For SQLite, we need to check if any of the tags exist in the JSON array
      const tagConditions = filters.tags.map(tag =>
        db.sequelize.literal(`json_extract(tags, '$') LIKE '%"${tag}"%'`)
      );
      if (!whereClause[Op.or]) {
        whereClause[Op.and] = tagConditions;
      } else {
        whereClause[Op.and] = tagConditions;
      }
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    // Sorting
    let order = [['created_at', 'DESC']];
    if (filters.sort) {
      const sortField = filters.sort.replace(/^-/, '');
      const sortDir = filters.sort.startsWith('-') ? 'DESC' : 'ASC';
      order = [[sortField, sortDir]];
    }

    const { count, rows } = await Recipe.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order,
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
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
      resource_type: 'recipes',
      resource_id: null,
      changes: { filter_count: count },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return {
      recipes: rows,
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
      resource_type: 'recipes',
      status_code: 500,
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Get recipe by ID
 *
 * @param {string} id - Recipe UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Recipe object
 */
async function getRecipeById(id, user, requestMetadata = {}) {
  try {
    const recipe = await Recipe.findOne({
      where: { id, is_active: true },
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [{
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens']
          }],
          order: [['display_order', 'ASC']]
        }
      ]
    });

    if (!recipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'recipes',
      resource_id: id,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return recipe;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Get recipe by slug
 *
 * @param {string} slug - Recipe slug
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Recipe object
 */
async function getRecipeBySlug(slug, user, requestMetadata = {}) {
  try {
    const recipe = await Recipe.findOne({
      where: { slug, is_active: true },
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [{
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens']
          }],
          order: [['display_order', 'ASC']]
        }
      ]
    });

    if (!recipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'recipes',
      resource_id: recipe.id,
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return recipe;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Create a new recipe
 *
 * @param {Object} recipeData - Recipe data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Created recipe
 */
async function createRecipe(recipeData, user, requestMetadata = {}) {
  try {
    // Validate category if provided
    if (recipeData.category_id) {
      const category = await RecipeCategory.findOne({
        where: { id: recipeData.category_id, is_active: true }
      });
      if (!category) {
        const error = new Error('Invalid category');
        error.statusCode = 400;
        throw error;
      }
    }

    // Generate slug if not provided
    let slug = recipeData.slug;
    if (!slug && recipeData.title) {
      slug = Recipe.generateSlug(recipeData.title);
    }

    // Ensure unique slug
    const existingRecipe = await Recipe.findOne({ where: { slug } });
    if (existingRecipe) {
      slug = `${slug}-${Date.now()}`;
    }

    const recipe = await Recipe.create({
      title: recipeData.title,
      slug,
      description: recipeData.description,
      instructions: recipeData.instructions,
      prep_time_minutes: recipeData.prep_time_minutes,
      cook_time_minutes: recipeData.cook_time_minutes,
      servings: recipeData.servings || 4,
      difficulty: recipeData.difficulty || 'medium',
      status: recipeData.status || 'draft',
      image_url: recipeData.image_url,
      tags: recipeData.tags || [],
      nutrition_per_serving: recipeData.nutrition_per_serving || {},
      category_id: recipeData.category_id,
      created_by: user.id
    });

    // Create recipe ingredients if provided
    if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
      const ingredientPromises = recipeData.ingredients.map((ing, index) =>
        RecipeIngredient.create({
          recipe_id: recipe.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity || null,
          unit: ing.unit || 'g',
          notes: ing.notes || null,
          is_optional: ing.is_optional || false,
          display_order: ing.display_order !== undefined ? ing.display_order : index
        })
      );
      await Promise.all(ingredientPromises);
    }

    // Reload with associations
    await recipe.reload({
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [{
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens']
          }]
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'recipes',
      resource_id: recipe.id,
      changes: { after: recipe.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 201
    });

    return recipe;
  } catch (error) {
    await auditService.log({
      user_id: user?.id,
      username: user?.username,
      action: 'CREATE',
      resource_type: 'recipes',
      status_code: error.statusCode || 500,
      error_message: error.message
    });
    throw error;
  }
}

/**
 * Update a recipe
 *
 * @param {string} id - Recipe UUID
 * @param {Object} updateData - Updated data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Updated recipe
 */
async function updateRecipe(id, updateData, user, requestMetadata = {}) {
  try {
    const recipe = await Recipe.findOne({
      where: { id, is_active: true }
    });

    if (!recipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = recipe.toJSON();

    // Validate category if being updated
    if (updateData.category_id) {
      const category = await RecipeCategory.findOne({
        where: { id: updateData.category_id, is_active: true }
      });
      if (!category) {
        const error = new Error('Invalid category');
        error.statusCode = 400;
        throw error;
      }
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'instructions', 'prep_time_minutes',
      'cook_time_minutes', 'servings', 'difficulty', 'image_url',
      'tags', 'nutrition_per_serving', 'category_id'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        recipe[field] = updateData[field];
      }
    });

    // Regenerate slug if title changes
    if (updateData.title && updateData.title !== beforeState.title) {
      let newSlug = Recipe.generateSlug(updateData.title);
      const existingRecipe = await Recipe.findOne({
        where: { slug: newSlug, id: { [Op.ne]: id } }
      });
      if (existingRecipe) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      recipe.slug = newSlug;
    }

    await recipe.save();

    // Update recipe ingredients if provided
    if (updateData.ingredients !== undefined && Array.isArray(updateData.ingredients)) {
      // Delete existing ingredients
      await RecipeIngredient.destroy({ where: { recipe_id: id } });

      // Create new ingredients
      const ingredientPromises = updateData.ingredients.map((ing, index) =>
        RecipeIngredient.create({
          recipe_id: id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity || null,
          unit: ing.unit || 'g',
          notes: ing.notes || null,
          is_optional: ing.is_optional || false,
          display_order: ing.display_order !== undefined ? ing.display_order : index
        })
      );
      await Promise.all(ingredientPromises);
    }

    // Reload with associations
    await recipe.reload({
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [{
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens']
          }]
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'recipes',
      resource_id: id,
      changes: { before: beforeState, after: recipe.toJSON() },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return recipe;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Delete a recipe (soft delete)
 *
 * @param {string} id - Recipe UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Result
 */
async function deleteRecipe(id, user, requestMetadata = {}) {
  try {
    const recipe = await Recipe.findOne({
      where: { id, is_active: true }
    });

    if (!recipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = recipe.toJSON();

    // Soft delete
    recipe.is_active = false;
    await recipe.save();

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'recipes',
      resource_id: id,
      changes: { before: beforeState },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return { success: true, message: 'Recipe deleted successfully' };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Publish a recipe
 *
 * @param {string} id - Recipe UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Updated recipe
 */
async function publishRecipe(id, user, requestMetadata = {}) {
  try {
    const recipe = await Recipe.findOne({
      where: { id, is_active: true }
    });

    if (!recipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = recipe.toJSON();
    recipe.status = 'published';
    await recipe.save();

    await recipe.reload({
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
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
      resource_type: 'recipes',
      resource_id: id,
      changes: { before: beforeState, after: recipe.toJSON(), action: 'publish' },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return recipe;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Archive a recipe
 *
 * @param {string} id - Recipe UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Updated recipe
 */
async function archiveRecipe(id, user, requestMetadata = {}) {
  try {
    const recipe = await Recipe.findOne({
      where: { id, is_active: true }
    });

    if (!recipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    const beforeState = recipe.toJSON();
    recipe.status = 'archived';
    await recipe.save();

    await recipe.reload({
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
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
      resource_type: 'recipes',
      resource_id: id,
      changes: { before: beforeState, after: recipe.toJSON(), action: 'archive' },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 200
    });

    return recipe;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

/**
 * Duplicate a recipe
 *
 * @param {string} id - Recipe UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} Duplicated recipe
 */
async function duplicateRecipe(id, user, requestMetadata = {}) {
  try {
    const originalRecipe = await Recipe.findOne({
      where: { id, is_active: true }
    });

    if (!originalRecipe) {
      const error = new Error('Recipe not found');
      error.statusCode = 404;
      throw error;
    }

    // Generate new slug
    const baseSlug = Recipe.generateSlug(originalRecipe.title);
    let newSlug = `${baseSlug}-copy`;
    let counter = 1;

    while (await Recipe.findOne({ where: { slug: newSlug } })) {
      newSlug = `${baseSlug}-copy-${counter}`;
      counter++;
    }

    // Create duplicate
    const duplicatedRecipe = await Recipe.create({
      title: `${originalRecipe.title} (Copy)`,
      slug: newSlug,
      description: originalRecipe.description,
      instructions: originalRecipe.instructions,
      prep_time_minutes: originalRecipe.prep_time_minutes,
      cook_time_minutes: originalRecipe.cook_time_minutes,
      servings: originalRecipe.servings,
      difficulty: originalRecipe.difficulty,
      status: 'draft', // Always start as draft
      image_url: originalRecipe.image_url,
      tags: originalRecipe.tags,
      nutrition_per_serving: originalRecipe.nutrition_per_serving,
      category_id: originalRecipe.category_id,
      created_by: user.id
    });

    // Duplicate recipe ingredients
    const originalIngredients = await RecipeIngredient.findAll({
      where: { recipe_id: id }
    });

    if (originalIngredients.length > 0) {
      const ingredientPromises = originalIngredients.map(ing =>
        RecipeIngredient.create({
          recipe_id: duplicatedRecipe.id,
          ingredient_id: ing.ingredient_id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
          is_optional: ing.is_optional,
          display_order: ing.display_order
        })
      );
      await Promise.all(ingredientPromises);
    }

    await duplicatedRecipe.reload({
      include: [
        {
          model: RecipeCategory,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [{
            model: Ingredient,
            as: 'ingredient',
            attributes: ['id', 'name', 'category', 'default_unit', 'nutrition_per_100g', 'allergens']
          }]
        }
      ]
    });

    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'recipes',
      resource_id: duplicatedRecipe.id,
      changes: {
        after: duplicatedRecipe.toJSON(),
        duplicated_from: id
      },
      ip_address: requestMetadata.ip,
      user_agent: requestMetadata.userAgent,
      request_method: requestMetadata.method,
      request_path: requestMetadata.path,
      status_code: 201
    });

    return duplicatedRecipe;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  getRecipes,
  getRecipeById,
  getRecipeBySlug,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  publishRecipe,
  archiveRecipe,
  duplicateRecipe
};
