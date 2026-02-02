/**
 * Ingredient Category Controller
 *
 * HTTP request handlers for ingredient category management.
 */

const ingredientCategoryService = require('../services/ingredientCategory.service');

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
 * GET /api/ingredients/categories - Get all categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      search: req.query.search,
      is_active: req.query.is_active
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await ingredientCategoryService.getCategories(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ingredients/categories/stats - Get category statistics
 */
exports.getCategoryStats = async (req, res, next) => {
  try {
    const user = req.user;
    const result = await ingredientCategoryService.getCategoryStats(user);

    res.json({
      success: true,
      data: result.stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ingredients/categories/:id - Get category by ID
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const category = await ingredientCategoryService.getCategoryById(id, user, requestMetadata);

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ingredients/categories - Create new category
 */
exports.createCategory = async (req, res, next) => {
  try {
    const categoryData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const category = await ingredientCategoryService.createCategory(categoryData, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: category,
      message: 'Ingredient category created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/ingredients/categories/:id - Update category
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const category = await ingredientCategoryService.updateCategory(id, updateData, user, requestMetadata);

    res.json({
      success: true,
      data: category,
      message: 'Ingredient category updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ingredients/categories/:id - Delete category
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await ingredientCategoryService.deleteCategory(id, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ingredients/categories/reorder - Reorder categories
 */
exports.reorderCategories = async (req, res, next) => {
  try {
    const { ordered_ids } = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await ingredientCategoryService.reorderCategories(ordered_ids, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
