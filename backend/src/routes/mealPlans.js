/**
 * Meal Plan Routes
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const mealPlanController = require('../controllers/mealPlanController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  next();
};

/**
 * GET /api/meal-plans
 */
router.get(
  '/',
  authenticate,
  requirePermission('meal_plans.read'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('patient_id').optional().isUUID(),
    query('status').optional().isIn(['draft', 'active', 'completed', 'archived']),
    query('search').optional().trim(),
    validate
  ],
  mealPlanController.getAllMealPlans
);

/**
 * GET /api/meal-plans/:id
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('meal_plans.read'),
  [param('id').isUUID().withMessage('ID must be a valid UUID'), validate],
  mealPlanController.getMealPlanById
);

/**
 * POST /api/meal-plans
 */
router.post(
  '/',
  authenticate,
  requirePermission('meal_plans.create'),
  [
    body('patient_id').isUUID().withMessage('patient_id must be a valid UUID'),
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').optional().trim(),
    body('status').optional().isIn(['draft', 'active', 'completed', 'archived']),
    body('goals').optional().isArray(),
    body('dietary_restrictions').optional().isArray(),
    body('notes').optional().trim(),
    body('duration_weeks').optional({ values: 'null' }).isInt({ min: 1 }),
    body('start_date').optional({ values: 'null' }).isDate(),
    body('end_date').optional({ values: 'null' }).isDate(),
    body('days').optional().isArray(),
    validate
  ],
  mealPlanController.createMealPlan
);

/**
 * PUT /api/meal-plans/:id
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('meal_plans.update'),
  [
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }),
    body('description').optional().trim(),
    body('status').optional().isIn(['draft', 'active', 'completed', 'archived']),
    body('goals').optional().isArray(),
    body('dietary_restrictions').optional().isArray(),
    body('notes').optional().trim(),
    body('duration_weeks').optional({ values: 'null' }).isInt({ min: 1 }),
    body('start_date').optional({ values: 'null' }).isDate(),
    body('end_date').optional({ values: 'null' }).isDate(),
    validate
  ],
  mealPlanController.updateMealPlan
);

/**
 * DELETE /api/meal-plans/:id
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('meal_plans.delete'),
  [param('id').isUUID().withMessage('ID must be a valid UUID'), validate],
  mealPlanController.deleteMealPlan
);

/**
 * PUT /api/meal-plans/:id/days — replace full day/meal/item structure
 */
router.put(
  '/:id/days',
  authenticate,
  requirePermission('meal_plans.update'),
  [
    param('id').isUUID().withMessage('ID must be a valid UUID'),
    body('days').isArray().withMessage('days must be an array'),
    validate
  ],
  mealPlanController.replaceDays
);

module.exports = router;
