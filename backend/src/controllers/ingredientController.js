/**
 * Ingredient Controller
 *
 * HTTP request handlers for ingredient management.
 */

const ingredientService = require('../services/ingredient.service');
const nutritionLookupService = require('../services/nutritionLookup.service');

/**
 * Extract request metadata for audit logging
 */
function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

/**
 * GET /api/ingredients - Get all ingredients
 */
exports.getAllIngredients = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      search: req.query.search,
      category: req.query.category,
      page: req.query.page,
      limit: req.query.limit
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await ingredientService.getIngredients(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.ingredients,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ingredients/search - Search ingredients (autocomplete)
 */
exports.searchIngredients = async (req, res, next) => {
  try {
    const user = req.user;
    const { q, limit } = req.query;
    const requestMetadata = getRequestMetadata(req);

    const ingredients = await ingredientService.searchIngredients(user, q, limit, requestMetadata);

    res.json({
      success: true,
      data: ingredients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ingredients/categories - Get ingredient categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ingredientService.getCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ingredients/:id - Get ingredient by ID
 */
exports.getIngredientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const ingredient = await ingredientService.getIngredientById(id, user, requestMetadata);

    res.json({
      success: true,
      data: ingredient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ingredients - Create new ingredient
 */
exports.createIngredient = async (req, res, next) => {
  try {
    const ingredientData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const ingredient = await ingredientService.createIngredient(ingredientData, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: ingredient,
      message: 'Ingredient created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/ingredients/:id - Update ingredient
 */
exports.updateIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const ingredient = await ingredientService.updateIngredient(id, updateData, user, requestMetadata);

    res.json({
      success: true,
      data: ingredient,
      message: 'Ingredient updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ingredients/:id - Delete ingredient
 */
exports.deleteIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await ingredientService.deleteIngredient(id, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ingredients/:id/duplicate - Duplicate ingredient
 */
exports.duplicateIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const ingredient = await ingredientService.duplicateIngredient(id, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: ingredient,
      message: 'Ingredient duplicated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ingredients/lookup/:query - Lookup nutritional data for an ingredient
 */
exports.lookupNutrition = async (req, res, next) => {
  try {
    const { query } = req.params;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }

    const nutritionData = await nutritionLookupService.searchNutrition(query);

    if (!nutritionData) {
      return res.status(404).json({
        success: false,
        error: 'No nutritional data found for this ingredient'
      });
    }

    res.json({
      success: true,
      data: nutritionData
    });
  } catch (error) {
    next(error);
  }
};
