/**
 * Authentication Routes
 *
 * Routes for authentication endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  validateLogin,
  validateRegistration,
  validateRefreshToken,
  validateApiKeyCreation
} = require('../validators/auth.validator');

/**
 * Public routes (no authentication required)
 */

// Login - with strict rate limiting
router.post('/login', authLimiter, validateLogin, authController.login);

// Logout
router.post('/logout', authLimiter, validateRefreshToken, authController.logout);

// Refresh access token - with rate limiting
router.post('/refresh', authLimiter, validateRefreshToken, authController.refresh);

/**
 * Protected routes (authentication required)
 */

// Get current user info
router.get('/me', authenticate, authController.getCurrentUser);

// Register new user (Admin only)
router.post('/register', authenticate, requireRole('ADMIN'), validateRegistration, authController.register);

// Create API key
router.post('/api-keys', authenticate, validateApiKeyCreation, authController.createApiKey);

// List API keys
router.get('/api-keys', authenticate, authController.listApiKeys);

// Revoke API key
router.delete('/api-keys/:id', authenticate, authController.revokeApiKey);

module.exports = router;
