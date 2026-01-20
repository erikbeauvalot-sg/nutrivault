/**
 * Authentication Service
 * Handles login, logout, token refresh, and user management
 */

import api from './api';
import * as tokenStorage from '../utils/tokenStorage';

/**
 * Login user with username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {boolean} rememberMe - Store tokens in localStorage if true
 * @returns {Promise<object>} User object with role and permissions
 */
export const login = async (username, password, rememberMe = false) => {
  try {
    const response = await api.post('/api/auth/login', {
      username,
      password,
    });

    // Backend returns data nested in response.data.data
    const { accessToken, refreshToken, user } = response.data.data;

    // Store tokens
    tokenStorage.setTokens(accessToken, refreshToken, rememberMe);
    
    // Store user object for persistence
    tokenStorage.setUser(user, rememberMe);

    return user;
  } catch (error) {
    throw error.response?.data || { error: 'Login failed' };
  }
};

/**
 * Logout user and invalidate refresh token
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    const refreshToken = tokenStorage.getRefreshToken();
    
    if (refreshToken) {
      // Call backend to invalidate refresh token
      await api.post('/api/auth/logout', { refreshToken });
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with local cleanup even if backend call fails
  } finally {
    // Clear all tokens and user data from storage
    tokenStorage.clearTokens();
    tokenStorage.clearUser();
  }
};

/**
 * Refresh access token using refresh token
 * @returns {Promise<string>} New access token
 */
export const refreshToken = async () => {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await api.post('/api/auth/refresh', {
      refreshToken,
    });

    // Backend returns data nested in response.data.data (if following same pattern)
    const data = response.data.data || response.data;
    const { accessToken, refreshToken: newRefreshToken } = data;

    // Update stored tokens
    tokenStorage.setTokens(accessToken, newRefreshToken, tokenStorage.isRemembered());

    return accessToken;
  } catch (error) {
    // Clear tokens and user on refresh failure
    tokenStorage.clearTokens();
    tokenStorage.clearUser();
    throw error.response?.data || { error: 'Token refresh failed' };
  }
};

/**
 * Get current user from storage
 * @returns {object|null} User object or null if not authenticated
 */
export const getCurrentUser = () => {
  // Get user from storage (contains full user object from login)
  const user = tokenStorage.getUser();
  
  if (!user) {
    return null;
  }
  
  // Verify token is still valid
  const token = tokenStorage.getAccessToken();
  if (!token || !isAuthenticated()) {
    tokenStorage.clearUser();
    return null;
  }

  return user;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if valid access token exists
 */
export const isAuthenticated = () => {
  const token = tokenStorage.getAccessToken();
  
  if (!token) {
    return false;
  }

  const decoded = tokenStorage.decodeToken(token);
  
  if (!decoded || !decoded.exp) {
    return false;
  }

  // Check if token is expired
  const currentTime = Date.now() / 1000;
  return decoded.exp > currentTime;
};
