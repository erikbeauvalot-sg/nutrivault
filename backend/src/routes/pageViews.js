/**
 * Page Views Routes
 * Handles analytics tracking for public landing pages
 *
 * POST /track - Public endpoint for tracking page views (no auth)
 * GET /stats - Get page view statistics (requires auth)
 * GET /recent - Get recent page views (requires auth)
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const pageViewController = require('../controllers/pageViewController');
const authenticate = require('../middleware/authenticate');
const { requireAnyRole } = require('../middleware/rbac');

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
 * Validation for tracking page views
 */
const trackValidation = [
  body('page_path')
    .trim()
    .notEmpty()
    .withMessage('page_path is required')
    .isLength({ max: 500 })
    .withMessage('page_path must be less than 500 characters'),

  body('visitor_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('visitor_id must be less than 100 characters'),

  body('session_id')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('session_id must be less than 100 characters'),

  body('referrer')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('referrer must be less than 1000 characters'),

  body('utm_source')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('utm_source must be less than 255 characters'),

  body('utm_medium')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('utm_medium must be less than 255 characters'),

  body('utm_campaign')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('utm_campaign must be less than 255 characters')
];

/**
 * Validation for stats query
 */
const statsValidation = [
  query('page_path')
    .optional()
    .trim()
    .isLength({ max: 500 }),

  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('start_date must be a valid ISO date'),

  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('end_date must be a valid ISO date'),

  query('period')
    .optional()
    .isIn(['hour', 'day', 'week', 'month'])
    .withMessage('period must be one of: hour, day, week, month')
];

/**
 * POST /api/page-views/track
 * Track a page view - PUBLIC endpoint (no authentication required)
 */
router.post(
  '/track',
  trackValidation,
  validate,
  pageViewController.trackPageView
);

/**
 * GET /api/page-views/stats
 * Get page view statistics - Requires ADMIN or DIETITIAN role
 */
router.get(
  '/stats',
  authenticate,
  requireAnyRole(['ADMIN', 'DIETITIAN']),
  statsValidation,
  validate,
  pageViewController.getPageViewStats
);

/**
 * GET /api/page-views/recent
 * Get recent page views - Requires ADMIN or DIETITIAN role
 */
router.get(
  '/recent',
  authenticate,
  requireAnyRole(['ADMIN', 'DIETITIAN']),
  query('page_path').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  validate,
  pageViewController.getRecentPageViews
);

module.exports = router;
