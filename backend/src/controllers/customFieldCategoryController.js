const customFieldCategoryService = require('../services/customFieldCategory.service');
const { body, param, validationResult } = require('express-validator');

/**
 * Custom Field Category Controller
 * Handles HTTP requests for custom field category management
 */

/**
 * Get all categories
 * GET /api/custom-fields/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const user = req.user;
    const filters = {
      is_active: req.query.is_active,
      language: req.query.language || user.language_preference || 'fr'
    };

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const categories = await customFieldCategoryService.getAllCategories(user, filters, requestMetadata);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get categories'
    });
  }
};

/**
 * Get category by ID
 * GET /api/custom-fields/categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const language = req.query.language || user.language_preference || 'fr';

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const category = await customFieldCategoryService.getCategoryById(user, id, language, requestMetadata);

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get category'
    });
  }
};

/**
 * Create a new category (Admin only)
 * POST /api/custom-fields/categories
 */
const createCategory = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user;
    const categoryData = req.body;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const category = await customFieldCategoryService.createCategory(user, categoryData, requestMetadata);

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create category'
    });
  }
};

/**
 * Update a category (Admin only)
 * PUT /api/custom-fields/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const user = req.user;
    const updateData = req.body;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const category = await customFieldCategoryService.updateCategory(user, id, updateData, requestMetadata);

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update category'
    });
  }
};

/**
 * Delete a category (Admin only)
 * DELETE /api/custom-fields/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await customFieldCategoryService.deleteCategory(user, id, requestMetadata);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete category'
    });
  }
};

/**
 * Reorder categories (Admin only)
 * POST /api/custom-fields/categories/reorder
 */
const reorderCategories = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user;
    const { order } = req.body;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await customFieldCategoryService.reorderCategories(user, order, requestMetadata);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reorder categories'
    });
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
    const { id } = req.params;
    const user = req.user;
    const overrides = req.body || {};

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const duplicatedCategory = await customFieldCategoryService.duplicateCategory(user, id, overrides, requestMetadata);

    res.status(201).json({
      success: true,
      data: duplicatedCategory,
      message: 'Category duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate category error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to duplicate category'
    });
  }
};

/**
 * Export categories with their field definitions
 * POST /api/custom-fields/export
 */
const exportCategories = async (req, res) => {
  try {
    const user = req.user;
    const { categoryIds } = req.body; // Array of category IDs (empty = all)

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const exportData = await customFieldCategoryService.exportCategories(
      user,
      categoryIds || [],
      requestMetadata
    );

    res.json({
      success: true,
      data: exportData,
      message: 'Categories exported successfully'
    });
  } catch (error) {
    console.error('Export categories error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to export categories'
    });
  }
};

/**
 * Import categories with their field definitions
 * POST /api/custom-fields/import
 */
const importCategories = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user;
    const { importData, options } = req.body;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const results = await customFieldCategoryService.importCategories(
      user,
      importData,
      options || {},
      requestMetadata
    );

    res.json({
      success: true,
      data: results,
      message: 'Import completed successfully'
    });
  } catch (error) {
    console.error('Import categories error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to import categories'
    });
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
