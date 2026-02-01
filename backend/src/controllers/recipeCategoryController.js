/**
 * Recipe Category Controller
 *
 * HTTP request handlers for recipe category management.
 */

const recipeCategoryService = require('../services/recipeCategory.service');

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
 * GET /api/recipe-categories - Get all categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const user = req.user;
    const filters = {
      search: req.query.search,
      is_active: req.query.is_active
    };
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeCategoryService.getCategories(user, filters, requestMetadata);

    res.json({
      success: true,
      data: result.categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recipe-categories/:id - Get category by ID
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const category = await recipeCategoryService.getCategoryById(id, user, requestMetadata);

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipe-categories - Create new category
 */
exports.createCategory = async (req, res, next) => {
  try {
    const categoryData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const category = await recipeCategoryService.createCategory(categoryData, user, requestMetadata);

    res.status(201).json({
      success: true,
      data: category,
      message: 'Recipe category created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/recipe-categories/:id - Update category
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const category = await recipeCategoryService.updateCategory(id, updateData, user, requestMetadata);

    res.json({
      success: true,
      data: category,
      message: 'Recipe category updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/recipe-categories/:id - Delete category
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeCategoryService.deleteCategory(id, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recipe-categories/reorder - Reorder categories
 */
exports.reorderCategories = async (req, res, next) => {
  try {
    const { ordered_ids } = req.body;
    const user = req.user;
    const requestMetadata = getRequestMetadata(req);

    const result = await recipeCategoryService.reorderCategories(ordered_ids, user, requestMetadata);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
