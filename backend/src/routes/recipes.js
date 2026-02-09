/**
 * Recipe Routes
 *
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { body, param, query, validationResult } = require('express-validator');
const recipeController = require('../controllers/recipeController');
const recipeCategoryController = require('../controllers/recipeCategoryController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');
const { importLimiter } = require('../middleware/rateLimiter');

// Multer config for JSON import
const importUpload = multer({
  dest: path.join(__dirname, '../../temp_uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only .json files are allowed'), false);
    }
  }
});

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

// ============================================
// RECIPE CATEGORY ROUTES
// ============================================

/**
 * GET /api/recipe-categories - Get all categories
 */
router.get(
  '/categories',
  authenticate,
  requirePermission('recipes.read'),
  recipeCategoryController.getAllCategories
);

/**
 * GET /api/recipe-categories/:id - Get category by ID
 */
router.get(
  '/categories/:id',
  authenticate,
  requirePermission('recipes.read'),
  [
    param('id').isUUID().withMessage('Category ID must be a valid UUID'),
    validate
  ],
  recipeCategoryController.getCategoryById
);

/**
 * POST /api/recipe-categories - Create new category
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
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color (e.g., #FF5733)'),
    body('display_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Display order must be a positive integer'),
    validate
  ],
  recipeCategoryController.createCategory
);

/**
 * PUT /api/recipe-categories/:id - Update category
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
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color'),
    body('display_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Display order must be a positive integer'),
    validate
  ],
  recipeCategoryController.updateCategory
);

/**
 * DELETE /api/recipe-categories/:id - Delete category
 */
router.delete(
  '/categories/:id',
  authenticate,
  requirePermission('recipes.delete'),
  [
    param('id').isUUID().withMessage('Category ID must be a valid UUID'),
    validate
  ],
  recipeCategoryController.deleteCategory
);

/**
 * POST /api/recipe-categories/reorder - Reorder categories
 */
router.post(
  '/categories/reorder',
  authenticate,
  requirePermission('recipes.update'),
  [
    body('ordered_ids')
      .isArray({ min: 1 })
      .withMessage('ordered_ids must be a non-empty array'),
    body('ordered_ids.*')
      .isUUID()
      .withMessage('Each ID must be a valid UUID'),
    validate
  ],
  recipeCategoryController.reorderCategories
);

// ============================================
// RECIPE ROUTES
// ============================================

/**
 * GET /api/recipes - Get all recipes
 */
router.get(
  '/',
  authenticate,
  requirePermission('recipes.read'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    query('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
    query('category_id').optional().isUUID().withMessage('Category ID must be a valid UUID'),
    query('created_by').optional().isUUID().withMessage('Created by must be a valid UUID'),
    validate
  ],
  recipeController.getAllRecipes
);

/**
 * GET /api/recipes/slug/:slug - Get recipe by slug (before :id route)
 */
router.get(
  '/slug/:slug',
  authenticate,
  requirePermission('recipes.read'),
  [
    param('slug')
      .trim()
      .notEmpty()
      .withMessage('Slug is required')
      .isLength({ max: 200 })
      .withMessage('Slug must be less than 200 characters'),
    validate
  ],
  recipeController.getRecipeBySlug
);

/**
 * GET /api/recipes/export/json - Bulk export recipes as JSON
 */
router.get(
  '/export/json',
  authenticate,
  requirePermission('recipes.read'),
  recipeController.exportRecipesJSON
);

/**
 * POST /api/recipes/import - Import recipes from JSON file
 */
router.post(
  '/import',
  authenticate,
  requirePermission('recipes.create'),
  importUpload.single('file'),
  recipeController.importRecipesJSON
);

/**
 * POST /api/recipes/import/url - Import recipe from a URL (schema.org/Recipe)
 */
router.post(
  '/import/url',
  authenticate,
  importLimiter,
  requirePermission('recipes.create'),
  [
    body('url')
      .trim()
      .notEmpty()
      .withMessage('URL is required')
      .isURL()
      .withMessage('Must be a valid URL'),
    validate
  ],
  recipeController.importFromUrl
);

/**
 * GET /api/recipes/:id/export/json - Export single recipe as JSON
 */
router.get(
  '/:id/export/json',
  authenticate,
  requirePermission('recipes.read'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.exportSingleRecipeJSON
);

/**
 * GET /api/recipes/:id/export/pdf - Export recipe as PDF
 */
router.get(
  '/:id/export/pdf',
  authenticate,
  requirePermission('recipes.read'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.exportRecipePDF
);

/**
 * GET /api/recipes/:id - Get recipe by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('recipes.read'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.getRecipeById
);

/**
 * POST /api/recipes - Create new recipe
 */
router.post(
  '/',
  authenticate,
  requirePermission('recipes.create'),
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 200 })
      .withMessage('Title must be less than 200 characters'),
    body('description')
      .optional()
      .trim(),
    body('instructions')
      .optional()
      .trim(),
    body('prep_time_minutes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Prep time must be a positive integer'),
    body('cook_time_minutes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Cook time must be a positive integer'),
    body('servings')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Servings must be at least 1'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Difficulty must be easy, medium, or hard'),
    body('status')
      .optional()
      .isIn(['draft', 'published', 'archived'])
      .withMessage('Status must be draft, published, or archived'),
    body('image_url')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Image URL must be less than 500 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('category_id')
      .optional()
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    validate
  ],
  recipeController.createRecipe
);

/**
 * PUT /api/recipes/:id - Update recipe
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('recipes.update'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Title must be less than 200 characters'),
    body('description')
      .optional()
      .trim(),
    body('instructions')
      .optional()
      .trim(),
    body('prep_time_minutes')
      .optional({ values: 'null' })
      .isInt({ min: 0 })
      .withMessage('Prep time must be a positive integer'),
    body('cook_time_minutes')
      .optional({ values: 'null' })
      .isInt({ min: 0 })
      .withMessage('Cook time must be a positive integer'),
    body('servings')
      .optional({ values: 'null' })
      .isInt({ min: 1 })
      .withMessage('Servings must be at least 1'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Difficulty must be easy, medium, or hard'),
    body('image_url')
      .optional({ values: 'null' })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Image URL must be less than 500 characters'),
    body('tags')
      .optional({ values: 'null' })
      .isArray()
      .withMessage('Tags must be an array'),
    body('category_id')
      .optional({ values: 'null' })
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    validate
  ],
  recipeController.updateRecipe
);

/**
 * DELETE /api/recipes/:id - Delete recipe
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('recipes.delete'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.deleteRecipe
);

/**
 * POST /api/recipes/:id/publish - Publish recipe
 */
router.post(
  '/:id/publish',
  authenticate,
  requirePermission('recipes.update'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.publishRecipe
);

/**
 * POST /api/recipes/:id/archive - Archive recipe
 */
router.post(
  '/:id/archive',
  authenticate,
  requirePermission('recipes.update'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.archiveRecipe
);

/**
 * POST /api/recipes/:id/duplicate - Duplicate recipe
 */
router.post(
  '/:id/duplicate',
  authenticate,
  requirePermission('recipes.create'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.duplicateRecipe
);

// ============================================
// RECIPE SHARING ROUTES
// ============================================

/**
 * PUT /api/recipes/:id/visibility - Update recipe visibility (private/public)
 */
router.put(
  '/:id/visibility',
  authenticate,
  requirePermission('recipes.share'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    body('visibility')
      .isIn(['private', 'public'])
      .withMessage('Visibility must be "private" or "public"'),
    validate
  ],
  recipeController.setVisibility
);

/**
 * POST /api/recipes/:id/share - Share recipe with a patient
 */
router.post(
  '/:id/share',
  authenticate,
  requirePermission('recipes.share'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    body('patient_id')
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),
    body('notes')
      .optional()
      .trim(),
    body('send_email')
      .optional()
      .isBoolean()
      .withMessage('send_email must be a boolean'),
    validate
  ],
  recipeController.shareRecipe
);

/**
 * GET /api/recipes/:id/shares - Get recipe shares
 */
router.get(
  '/:id/shares',
  authenticate,
  requirePermission('recipes.share'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    validate
  ],
  recipeController.getRecipeShares
);

/**
 * POST /api/recipes/:id/shares/:shareId/resend - Resend share email
 */
router.post(
  '/:id/shares/:shareId/resend',
  authenticate,
  requirePermission('recipes.share'),
  [
    param('id').isUUID().withMessage('Recipe ID must be a valid UUID'),
    param('shareId').isUUID().withMessage('Share ID must be a valid UUID'),
    validate
  ],
  recipeController.resendShareEmail
);

module.exports = router;
