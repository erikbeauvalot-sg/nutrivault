/**
 * AI Configuration Routes
 * US-5.5.5: AI-Generated Follow-ups - Multi-Provider Support
 *
 * Admin routes for managing AI provider configuration
 */

const express = require('express');
const router = express.Router();
const aiConfigController = require('../controllers/aiConfigController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/ai-config/providers
 * @desc    Get all AI providers with configuration status
 * @access  Private (Admin only)
 */
router.get(
  '/providers',
  requirePermission('users.delete'), // Admin permission
  aiConfigController.getProviders
);

/**
 * @route   GET /api/ai-config/pricing
 * @desc    Get pricing information for all providers
 * @access  Private (Admin only)
 */
router.get(
  '/pricing',
  requirePermission('users.delete'), // Admin permission
  aiConfigController.getPricing
);

/**
 * @route   GET /api/ai-config/current
 * @desc    Get current AI configuration
 * @access  Private (any authenticated user)
 */
router.get('/current', aiConfigController.getCurrentConfig);

/**
 * @route   PUT /api/ai-config
 * @desc    Save AI configuration
 * @access  Private (Admin only)
 */
router.put(
  '/',
  requirePermission('users.delete'), // Admin permission
  aiConfigController.saveConfig
);

/**
 * @route   POST /api/ai-config/test
 * @desc    Test AI provider connection
 * @access  Private (Admin only)
 */
router.post(
  '/test',
  requirePermission('users.delete'), // Admin permission
  aiConfigController.testConnection
);

module.exports = router;
