/**
 * Ingredient Routes
 *
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const ingredientController = require('../controllers/ingredientController');
const ingredientCategoryController = require('../controllers/ingredientCategoryController');
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

// ==========================================
// Ingredient Category Routes
// ==========================================

/**
 * GET /api/ingredients/categories - Get all ingredient categories
 */
router.get(
  '/categories',
  authenticate,
  requirePermission('recipes.read'),
  ingredientCategoryController.getAllCategories
);

/**
 * GET /api/ingredients/categories/stats - Get category statistics
 */
router.get(
  '/categories/stats',
  authenticate,
  requirePermission('recipes.read'),
  ingredientCategoryController.getCategoryStats
);

/**
 * GET /api/ingredients/categories/:id - Get category by ID
 */
router.get(
  '/categories/:id',
  authenticate,
  requirePermission('recipes.read'),
  [
    param('id').isUUID().withMessage('Category ID must be a valid UUID'),
    validate
  ],
  ingredientCategoryController.getCategoryById
);

/**
 * POST /api/ingredients/categories - Create new category
 */
router.post(
  '/categories',
  authenticate,
  requirePermission('recipes.create'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Icon must be less than 50 characters'),
    body('color')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$|^$/)
      .withMessage('Color must be a valid hex color (e.g., #FF5733)'),
    validate
  ],
  ingredientCategoryController.createCategory
);

/**
 * PUT /api/ingredients/categories/:id - Update category
 */
router.put(
  '/categories/:id',
  authenticate,
  requirePermission('recipes.update'),
  [
    param('id').isUUID().withMessage('Category ID must be a valid UUID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Icon must be less than 50 characters'),
    body('color')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$|^$/)
      .withMessage('Color must be a valid hex color (e.g., #FF5733)'),
    validate
  ],
  ingredientCategoryController.updateCategory
);

/**
 * DELETE /api/ingredients/categories/:id - Delete category
 */
router.delete(
  '/categories/:id',
  authenticate,
  requirePermission('recipes.delete'),
  [
    param('id').isUUID().withMessage('Category ID must be a valid UUID'),
    validate
  ],
  ingredientCategoryController.deleteCategory
);

/**
 * POST /api/ingredients/categories/reorder - Reorder categories
 */
router.post(
  '/categories/reorder',
  authenticate,
  requirePermission('recipes.update'),
  [
    body('ordered_ids')
      .isArray()
      .withMessage('ordered_ids must be an array'),
    body('ordered_ids.*')
      .isUUID()
      .withMessage('Each ID must be a valid UUID'),
    validate
  ],
  ingredientCategoryController.reorderCategories
);

// ==========================================
// Legacy route for backward compatibility
// ==========================================

/**
 * GET /api/ingredients/categories-legacy - Get legacy string categories
 * @deprecated Use /api/ingredients/categories instead
 */
router.get(
  '/categories-legacy',
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
    body('category_id')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === '') return true;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          throw new Error('Category ID must be a valid UUID');
        }
        return true;
      }),
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
    body('category_id')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === '') return true;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          throw new Error('Category ID must be a valid UUID');
        }
        return true;
      }),
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
