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

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  validateCreateCategory,
  validateUpdateCategory,
  validateReorderCategories
};
