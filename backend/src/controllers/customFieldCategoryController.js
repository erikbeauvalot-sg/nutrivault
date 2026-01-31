const customFieldCategoryService = require('../services/customFieldCategory.service');
const { body, param, validationResult } = require('express-validator');

/**
 * Custom Field Category Controller
 * Handles HTTP requests for custom field category management
 */

/**
 * Extract request metadata for audit logging
 */
function getRequestMetadata(req) {
  return {
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    request_method: req.method,
    request_path: req.originalUrl
  };
}

/**
 * Send error response with consistent format
 */
function sendError(res, error, defaultMessage) {
  console.error(`${defaultMessage}:`, error);
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || defaultMessage
  });
}

/**
 * Get all categories
 * GET /api/custom-fields/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active,
      language: req.query.language || req.user.language_preference || 'fr'
    };

    const categories = await customFieldCategoryService.getAllCategories(
      req.user,
      filters,
      getRequestMetadata(req)
    );

    res.json({ success: true, data: categories });
  } catch (error) {
    sendError(res, error, 'Failed to get categories');
  }
};

/**
 * Get category by ID
 * GET /api/custom-fields/categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const language = req.query.language || req.user.language_preference || 'fr';
    const category = await customFieldCategoryService.getCategoryById(
      req.user,
      req.params.id,
      language,
      getRequestMetadata(req)
    );

    res.json({ success: true, data: category });
  } catch (error) {
    sendError(res, error, 'Failed to get category');
  }
};

/**
 * Check validation errors and return 400 if any
 * @returns {boolean} true if validation passed, false if response was sent
 */
function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return false;
  }
  return true;
}

/**
 * Create a new category (Admin only)
 * POST /api/custom-fields/categories
 */
const createCategory = async (req, res) => {
  try {
    if (!checkValidation(req, res)) return;

    const category = await customFieldCategoryService.createCategory(
      req.user,
      req.body,
      getRequestMetadata(req)
    );

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    sendError(res, error, 'Failed to create category');
  }
};

/**
 * Update a category (Admin only)
 * PUT /api/custom-fields/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    if (!checkValidation(req, res)) return;

    const category = await customFieldCategoryService.updateCategory(
      req.user,
      req.params.id,
      req.body,
      getRequestMetadata(req)
    );

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    sendError(res, error, 'Failed to update category');
  }
};

/**
 * Delete a category (Admin only)
 * DELETE /api/custom-fields/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const result = await customFieldCategoryService.deleteCategory(
      req.user,
      req.params.id,
      getRequestMetadata(req)
    );

    res.json({ success: true, message: result.message });
  } catch (error) {
    sendError(res, error, 'Failed to delete category');
  }
};

/**
 * Reorder categories (Admin only)
 * POST /api/custom-fields/categories/reorder
 */
const reorderCategories = async (req, res) => {
  try {
    if (!checkValidation(req, res)) return;

    const result = await customFieldCategoryService.reorderCategories(
      req.user,
      req.body.order,
      getRequestMetadata(req)
    );

    res.json({ success: true, message: result.message });
  } catch (error) {
    sendError(res, error, 'Failed to reorder categories');
  }
};

// Validation middleware
const validateCreateCategory = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const validateUpdateCategory = [
  param('id').isUUID().withMessage('Invalid category ID'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const validateReorderCategories = [
  body('order')
    .isArray({ min: 1 })
    .withMessage('Order must be an array with at least one item'),
  body('order.*.id')
    .isUUID()
    .withMessage('Each item must have a valid UUID'),
  body('order.*.display_order')
    .isInt({ min: 0 })
    .withMessage('Each item must have a valid display_order')
];

/**
 * Duplicate a category
 * POST /api/custom-fields/categories/:id/duplicate
 */
const duplicateCategory = async (req, res) => {
  try {
    const duplicatedCategory = await customFieldCategoryService.duplicateCategory(
      req.user,
      req.params.id,
      req.body || {},
      getRequestMetadata(req)
    );

    res.status(201).json({
      success: true,
      data: duplicatedCategory,
      message: 'Category duplicated successfully'
    });
  } catch (error) {
    sendError(res, error, 'Failed to duplicate category');
  }
};

/**
 * Export categories with their field definitions
 * POST /api/custom-fields/export
 */
const exportCategories = async (req, res) => {
  try {
    const exportData = await customFieldCategoryService.exportCategories(
      req.user,
      req.body.categoryIds || [],
      getRequestMetadata(req)
    );

    res.json({
      success: true,
      data: exportData,
      message: 'Categories exported successfully'
    });
  } catch (error) {
    sendError(res, error, 'Failed to export categories');
  }
};

/**
 * Import categories with their field definitions
 * POST /api/custom-fields/import
 */
const importCategories = async (req, res) => {
  try {
    if (!checkValidation(req, res)) return;

    const { importData, options } = req.body;
    const results = await customFieldCategoryService.importCategories(
      req.user,
      importData,
      options || {},
      getRequestMetadata(req)
    );

    res.json({
      success: true,
      data: results,
      message: 'Import completed successfully'
    });
  } catch (error) {
    sendError(res, error, 'Failed to import categories');
  }
};

// Validation middleware for import
const validateImport = [
  body('importData')
    .isObject()
    .withMessage('Import data must be an object'),
  body('importData.categories')
    .isArray()
    .withMessage('Import data must contain a categories array'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.skipExisting')
    .optional()
    .isBoolean()
    .withMessage('skipExisting must be a boolean'),
  body('options.updateExisting')
    .optional()
    .isBoolean()
    .withMessage('updateExisting must be a boolean')
];

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  duplicateCategory,
  reorderCategories,
  exportCategories,
  importCategories,
  validateCreateCategory,
  validateUpdateCategory,
  validateReorderCategories,
  validateImport
};
