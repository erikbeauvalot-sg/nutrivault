/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import api from './api';
import tokenManager from '../utils/tokenManager';

export const authService = {
  /**
   * Login user with credentials
   */
  async login(username, password, rememberMe = false) {
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });

      const { access_token, refresh_token, user } = response.data;

      // Store tokens and user (use rememberMe for storage strategy)
      tokenManager.setTokens(access_token, refresh_token, rememberMe);
      tokenManager.setUser(user, rememberMe);

      return { user, access_token, refresh_token };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    }
  },

  /**
   * Logout user
   */
  async logout(refreshToken) {
    try {
      await api.post('/auth/logout', {
        refresh_token: refreshToken || tokenManager.getRefreshToken()
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local data even if API call fails
      tokenManager.clearAll();
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const response = await api.post('/auth/refresh', {
        refresh_token: refreshToken || tokenManager.getRefreshToken()
      });

      const { access_token } = response.data;
      tokenManager.setTokens(access_token, refreshToken || tokenManager.getRefreshToken());

      return access_token;
    } catch (error) {
      tokenManager.clearAll();
      throw new Error('Token refresh failed');
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      const { user } = response.data;
      tokenManager.setUser(user);
      return user;
    } catch (error) {
      tokenManager.clearAll();
      throw new Error('Failed to fetch current user');
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return tokenManager.hasToken() && !tokenManager.isTokenExpired(tokenManager.getAccessToken());
  },

  /**
   * Get stored user
   */
  getUser() {
    return tokenManager.getUser();
  }
};

export default authService;
