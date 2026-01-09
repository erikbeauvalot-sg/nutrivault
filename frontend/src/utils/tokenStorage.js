/**
 * Token Storage Utility
 * Handles storing and retrieving JWT tokens with support for "Remember Me" functionality
 */

const ACCESS_TOKEN_KEY = 'nutrivault_access_token';
const REFRESH_TOKEN_KEY = 'nutrivault_refresh_token';
const REMEMBER_ME_KEY = 'nutrivault_remember_me';
const USER_KEY = 'nutrivault_user';

/**
 * Store authentication tokens
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 * @param {boolean} rememberMe - If true, uses localStorage; otherwise sessionStorage
 */
export const setTokens = (accessToken, refreshToken, rememberMe = false) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
};

/**
 * Get access token from storage
 * @returns {string|null} Access token or null if not found
 */
export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Get refresh token from storage
 * @returns {string|null} Refresh token or null if not found
 */
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Check if user enabled "Remember Me"
 * @returns {boolean} True if using localStorage
 */
export const isRemembered = () => {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
};

/**
 * Clear all authentication data
 */
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Store user object
 * @param {object} user - User object with id, username, email, role, permissions
 * @param {boolean} rememberMe - If true, uses localStorage; otherwise sessionStorage
 */
export const setUser = (user, rememberMe = false) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Get user object from storage
 * @returns {object|null} User object or null if not found
 */
export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!userStr) {
    return null;
  }
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Clear user data from storage
 */
export const clearUser = () => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
};

/**
 * Decode JWT token to get user data (without verification)
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};
