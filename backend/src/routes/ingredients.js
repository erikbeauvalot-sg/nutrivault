/**
 * Ingredient Routes
 *
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const ingredientController = require('../controllers/ingredientController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * GET /api/ingredients/search - Search ingredients (autocomplete)
 * Must be before /:id route
 */
router.get(
  '/search',
  authenticate,
  requirePermission('recipes.read'),
  [
    query('q')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Search query must be at least 2 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    validate
  ],
  ingredientController.searchIngredients
);

/**
 * GET /api/ingredients/lookup/:query - Lookup nutritional data from external APIs
 * Must be before /:id route
 */
router.get(
  '/lookup/:query',
  authenticate,
  requirePermission('recipes.create'),
  ingredientController.lookupNutrition
);

/**
 * GET /api/ingredients/categories - Get ingredient categories
 */
router.get(
  '/categories',
  authenticate,
  requirePermission('recipes.read'),
  ingredientController.getCategories
);

/**
 * GET /api/ingredients - Get all ingredients
 */
router.get(
  '/',
  authenticate,
  requirePermission('recipes.read'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate
  ],
  ingredientController.getAllIngredients
);

/**
 * GET /api/ingredients/:id - Get ingredient by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('recipes.read'),
  [
    param('id').isUUID().withMessage('Ingredient ID must be a valid UUID'),
    validate
  ],
  ingredientController.getIngredientById
);

/**
 * POST /api/ingredients - Create new ingredient
 */
router.post(
  '/',
  authenticate,
  requirePermission('recipes.create'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 200 })
      .withMessage('Name must be less than 200 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('default_unit')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Default unit must be less than 50 characters'),
    body('nutrition_per_100g')
      .optional()
      .isObject()
      .withMessage('Nutrition must be an object'),
    body('allergens')
      .optional()
      .isArray()
      .withMessage('Allergens must be an array'),
    validate
  ],
  ingredientController.createIngredient
);

/**
 * PUT /api/ingredients/:id - Update ingredient
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('recipes.update'),
  [
    param('id').isUUID().withMessage('Ingredient ID must be a valid UUID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Name must be less than 200 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('default_unit')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Default unit must be less than 50 characters'),
    body('nutrition_per_100g')
      .optional()
      .isObject()
      .withMessage('Nutrition must be an object'),
    body('allergens')
      .optional()
      .isArray()
      .withMessage('Allergens must be an array'),
    validate
  ],
  ingredientController.updateIngredient
);

/**
 * DELETE /api/ingredients/:id - Delete ingredient
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('recipes.delete'),
  [
    param('id').isUUID().withMessage('Ingredient ID must be a valid UUID'),
    validate
  ],
  ingredientController.deleteIngredient
);

/**
 * POST /api/ingredients/:id/duplicate - Duplicate ingredient
 */
router.post(
  '/:id/duplicate',
  authenticate,
  requirePermission('recipes.create'),
  [
    param('id').isUUID().withMessage('Ingredient ID must be a valid UUID'),
    validate
  ],
  ingredientController.duplicateIngredient
);

module.exports = router;
