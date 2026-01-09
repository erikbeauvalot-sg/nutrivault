/**
 * Authentication Controller
 * 
 * Handles HTTP requests for authentication endpoints:
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - POST /api/auth/refresh
 * - POST /api/auth/api-keys
 * - GET /api/auth/api-keys
 * - DELETE /api/auth/api-keys/:id
 */

const authService = require('../services/auth.service');
const { validationResult } = require('express-validator');

class AuthController {
  /**
   * Login - POST /api/auth/login
   * @param {Object} req.body.username - Username
   * @param {Object} req.body.password - Password
   * @returns {Object} { success, data: { user, accessToken, refreshToken } }
   */
  async login(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { username, password } = req.body;

      const result = await authService.login(username, password);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      // Handle specific authentication errors
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }

      if (error.message.includes('Account is locked')) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }

      if (error.message === 'Account is deactivated') {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      next(error);
    }
  }

  /**
   * Logout - POST /api/auth/logout
   * @param {Object} req.body.refreshToken - Refresh token to invalidate
   * @returns {Object} { success }
   */
  async logout(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { refreshToken } = req.body;
      const userId = req.user.id;

      await authService.logout(refreshToken, userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      if (error.message === 'Invalid refresh token') {
        return res.status(400).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      next(error);
    }
  }

  /**
   * Refresh tokens - POST /api/auth/refresh
   * @param {Object} req.body.refreshToken - Current refresh token
   * @returns {Object} { success, data: { accessToken, refreshToken } }
   */
  async refresh(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { refreshToken } = req.body;

      const result = await authService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === 'Invalid refresh token') {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }

      if (error.message === 'Refresh token has expired') {
        return res.status(401).json({
          success: false,
          error: 'Refresh token has expired. Please log in again.'
        });
      }

      next(error);
    }
  }

  /**
   * Generate API key - POST /api/auth/api-keys
   * @param {Object} req.body.name - API key name
   * @param {Object} req.body.expiresAt - Optional expiration date
   * @returns {Object} { success, data: { apiKey, keyInfo } }
   */
  async generateApiKey(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, expiresAt } = req.body;
      const userId = req.user.id;

      const result = await authService.generateApiKey(userId, name, expiresAt);

      res.status(201).json({
        success: true,
        data: result,
        warning: 'Save this API key securely. It will not be shown again.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List API keys - GET /api/auth/api-keys
   * @returns {Object} { success, data: [apiKeys] }
   */
  async listApiKeys(req, res, next) {
    try {
      const userId = req.user.id;

      const apiKeys = await authService.listApiKeys(userId);

      res.status(200).json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke API key - DELETE /api/auth/api-keys/:id
   * @param {Object} req.params.id - API key ID
   * @returns {Object} { success }
   */
  async revokeApiKey(req, res, next) {
    try {
      const apiKeyId = req.params.id;
      const userId = req.user.id;

      await authService.revokeApiKey(apiKeyId, userId);

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      if (error.message === 'API key not found') {
        return res.status(404).json({
          success: false,
          error: 'API key not found'
        });
      }

      next(error);
    }
  }
}

module.exports = new AuthController();
