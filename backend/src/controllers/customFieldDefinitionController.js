const customFieldDefinitionService = require('../services/customFieldDefinition.service');
const { body, param, validationResult } = require('express-validator');

/**
 * Custom Field Definition Controller
 * Handles HTTP requests for custom field definition management
 */

/**
 * Get all active field definitions
 * GET /api/custom-fields/definitions
 */
const getAllActiveDefinitions = async (req, res) => {
  try {
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const definitions = await customFieldDefinitionService.getAllActiveDefinitions(user, requestMetadata);

    res.json({
      success: true,
      data: definitions
    });
  } catch (error) {
    console.error('Get all definitions error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get definitions'
    });
  }
};

/**
 * Get definitions by category
 * GET /api/custom-fields/definitions/category/:categoryId
 */
const getDefinitionsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const definitions = await customFieldDefinitionService.getDefinitionsByCategory(user, categoryId, requestMetadata);

    res.json({
      success: true,
      data: definitions
    });
  } catch (error) {
    console.error('Get definitions by category error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get definitions'
    });
  }
};

/**
 * Get definition by ID
 * GET /api/custom-fields/definitions/:id
 */
const getDefinitionById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const definition = await customFieldDefinitionService.getDefinitionById(user, id, requestMetadata);

    res.json({
      success: true,
      data: definition
    });
  } catch (error) {
    console.error('Get definition by ID error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get definition'
    });
  }
};

/**
 * Create a new field definition (Admin only)
 * POST /api/custom-fields/definitions
 */
const createDefinition = async (req, res) => {
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
    const definitionData = req.body;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const definition = await customFieldDefinitionService.createDefinition(user, definitionData, requestMetadata);

    res.status(201).json({
      success: true,
      data: definition,
      message: 'Field definition created successfully'
    });
  } catch (error) {
    console.error('Create definition error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create definition'
    });
  }
};

/**
 * Update a field definition (Admin only)
 * PUT /api/custom-fields/definitions/:id
 */
const updateDefinition = async (req, res) => {
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

    const definition = await customFieldDefinitionService.updateDefinition(user, id, updateData, requestMetadata);

    res.json({
      success: true,
      data: definition,
      message: 'Field definition updated successfully'
    });
  } catch (error) {
    console.error('Update definition error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update definition'
    });
  }
};

/**
 * Delete a field definition (Admin only)
 * DELETE /api/custom-fields/definitions/:id
 */
const deleteDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_method: req.method,
      request_path: req.originalUrl
    };

    const result = await customFieldDefinitionService.deleteDefinition(user, id, requestMetadata);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Delete definition error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete definition'
    });
  }
};

/**
 * Reorder field definitions (Admin only)
 * POST /api/custom-fields/definitions/reorder
 */
const reorderFields = async (req, res) => {
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

    const result = await customFieldDefinitionService.reorderFields(user, order, requestMetadata);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Reorder fields error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reorder fields'
    });
  }
};

// Validation middleware
const validateCreateDefinition = [
  body('category_id')
    .isUUID()
    .withMessage('Invalid category ID'),
  body('field_name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Field name must be between 1 and 100 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Field name can only contain lowercase letters, numbers, and underscores')
    .trim(),
  body('field_label')
    .isLength({ min: 1, max: 200 })
    .withMessage('Field label must be between 1 and 200 characters')
    .trim(),
  body('field_type')
    .isIn(['text', 'number', 'date', 'select', 'boolean', 'textarea'])
    .withMessage('Invalid field type'),
  body('is_required')
    .optional()
    .isBoolean()
    .withMessage('is_required must be a boolean'),
  body('validation_rules')
    .optional()
    .isJSON()
    .withMessage('validation_rules must be valid JSON'),
  body('select_options')
    .optional()
    .custom((value, { req }) => {
      if (req.body.field_type === 'select') {
        if (!Array.isArray(value)) {
          throw new Error('select_options must be an array for select field type');
        }
        if (value.length === 0) {
          throw new Error('select_options must have at least one option');
        }
      }
      return true;
    }),
  body('help_text')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Help text must not exceed 500 characters')
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

const validateUpdateDefinition = [
  param('id').isUUID().withMessage('Invalid definition ID'),
  body('category_id')
    .optional()
    .isUUID()
    .withMessage('Invalid category ID'),
  body('field_name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Field name must be between 1 and 100 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Field name can only contain lowercase letters, numbers, and underscores')
    .trim(),
  body('field_label')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Field label must be between 1 and 200 characters')
    .trim(),
  body('field_type')
    .optional()
    .isIn(['text', 'number', 'date', 'select', 'boolean', 'textarea'])
    .withMessage('Invalid field type'),
  body('is_required')
    .optional()
    .isBoolean()
    .withMessage('is_required must be a boolean'),
  body('validation_rules')
    .optional()
    .custom((value) => {
      if (value !== null && value !== undefined) {
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          } else if (typeof value !== 'object') {
            throw new Error('Invalid type');
          }
        } catch (e) {
          throw new Error('validation_rules must be valid JSON');
        }
      }
      return true;
    }),
  body('select_options')
    .optional()
    .custom((value) => {
      if (value !== null && value !== undefined && !Array.isArray(value)) {
        throw new Error('select_options must be an array');
      }
      return true;
    }),
  body('help_text')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Help text must not exceed 500 characters')
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

const validateReorderFields = [
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
  getAllActiveDefinitions,
  getDefinitionsByCategory,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  reorderFields,
  validateCreateDefinition,
  validateUpdateDefinition,
  validateReorderFields
};
