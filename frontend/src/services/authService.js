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
    console.log('[AuthService] Login attempt:', { username, rememberMe });
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });

      console.log('[AuthService] Login response:', {
        status: response.status,
        dataKeys: Object.keys(response.data),
        success: response.data.success
      });

      // Backend returns: {success, message, data: {user, accessToken, refreshToken}}
      const { user, accessToken, refreshToken } = response.data.data;

      console.log('[AuthService] Extracted data:', {
        hasUser: !!user,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        username: user?.username
      });

      // Store tokens and user (use rememberMe for storage strategy)
      tokenManager.setTokens(accessToken, refreshToken, rememberMe);
      tokenManager.setUser(user, rememberMe);

      console.log('[AuthService] Login successful, tokens stored');
      return { user, accessToken, refreshToken };
    } catch (error) {
      console.error('[AuthService] Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    }
  },

  /**
   * Logout user
   */
  async logout(refreshToken) {
    console.log('[AuthService] Logout initiated');
    try {
      await api.post('/auth/logout', {
        refresh_token: refreshToken || tokenManager.getRefreshToken()
      });
      console.log('[AuthService] Logout successful');
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
    } finally {
      // Always clear local data even if API call fails
      tokenManager.clearAll();
      console.log('[AuthService] Tokens cleared');
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    console.log('[AuthService] Token refresh initiated');
    const tokenToUse = refreshToken || tokenManager.getRefreshToken();
    if (!tokenToUse) {
      throw new Error('No refresh token available');
    }
    try {
      const response = await api.post('/auth/refresh', {
        refresh_token: tokenToUse
      });

      const { access_token } = response.data;
      
      // Preserve rememberMe preference when updating tokens
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      tokenManager.setTokens(access_token, tokenToUse, rememberMe);

      console.log('[AuthService] Token refresh successful');
      return access_token;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      tokenManager.clearAll();
      throw new Error('Token refresh failed');
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser() {
    console.log('[AuthService] Fetching current user');
    try {
      const response = await api.get('/auth/me');
      const { user } = response.data;
      tokenManager.setUser(user);
      console.log('[AuthService] Current user fetched:', user?.username);
      return user;
    } catch (error) {
      console.error('[AuthService] Failed to fetch current user:', error);
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
