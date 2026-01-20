/**
 * Authentication Routes
 * 
 * Endpoints:
 * - POST /api/auth/login - Public
 * - POST /api/auth/logout - Authenticated
 * - POST /api/auth/refresh - Public (requires refresh token)
 * - POST /api/auth/api-keys - Authenticated
 * - GET /api/auth/api-keys - Authenticated
 * - DELETE /api/auth/api-keys/:id - Authenticated
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body, param } = require('express-validator');
const authenticate = require('../middleware/authenticate');

/**
 * POST /api/auth/login
 * Public endpoint - No authentication required
 */
router.post(
  '/login',
  [
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isString()
      .withMessage('Username must be a string')
      .trim(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isString()
      .withMessage('Password must be a string')
  ],
  authController.login
);

/**
 * POST /api/auth/logout
 * Authenticated endpoint
 */
router.post(
  '/logout',
  authenticate,
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
      .isString()
      .withMessage('Refresh token must be a string')
  ],
  authController.logout
);

/**
 * POST /api/auth/refresh
 * Public endpoint - Requires refresh token
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
      .isString()
      .withMessage('Refresh token must be a string')
  ],
  authController.refresh
);

/**
 * POST /api/auth/api-keys
 * Authenticated endpoint - Generate new API key
 */
router.post(
  '/api-keys',
  authenticate,
  [
    body('name')
      .notEmpty()
      .withMessage('API key name is required')
      .isString()
      .withMessage('Name must be a string')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Name must be between 3 and 100 characters'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('expiresAt must be a valid ISO 8601 date')
      .custom((value) => {
        const expiration = new Date(value);
        if (expiration <= new Date()) {
          throw new Error('expiresAt must be in the future');
        }
        return true;
      })
  ],
  authController.generateApiKey
);

/**
 * GET /api/auth/api-keys
 * Authenticated endpoint - List user's API keys
 */
router.get(
  '/api-keys',
  authenticate,
  authController.listApiKeys
);

/**
 * DELETE /api/auth/api-keys/:id
 * Authenticated endpoint - Revoke API key
 */
router.delete(
  '/api-keys/:id',
  authenticate,
  [
    param('id')
      .notEmpty()
      .withMessage('API key ID is required')
      .isUUID()
      .withMessage('API key ID must be a valid UUID')
  ],
  authController.revokeApiKey
);

module.exports = router;
