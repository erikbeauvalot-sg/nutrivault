/**
 * Token Manager Utility
 * Handles token storage and retrieval
 * Supports both persistent (localStorage) and session-only (sessionStorage) storage
 */

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const REMEMBER_ME_KEY = 'rememberMe';

export const tokenManager = {
  /**
   * Get storage based on rememberMe preference
   */
  getStorage() {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    return rememberMe ? localStorage : sessionStorage;
  },

  /**
   * Store tokens with rememberMe preference
   */
  setTokens(accessToken, refreshToken, rememberMe = false) {
    // Store rememberMe preference in localStorage
    localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, accessToken);
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * Get access token
   */
  getAccessToken() {
    return this.getStorage().getItem(TOKEN_KEY);
  },

  /**
   * Get refresh token
   */
  getRefreshToken() {
    return this.getStorage().getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Remove all tokens
   */
  removeTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
  },

  /**
   * Check if token exists
   */
  hasToken() {
    return !!(this.getStorage().getItem(TOKEN_KEY));
  },

  /**
   * Decode JWT token (basic decode, not verification)
   */
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return Date.now() >= decoded.exp * 1000;
  },

  /**
   * Store user data
   */
  setUser(user, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
  },

  /**
   * Get user data
   */
  getUser() {
    const storage = this.getStorage();
    const user = storage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  /**
   * Clear user data
   */
  removeUser() {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  /**
   * Clear all auth data
   */
  clearAll() {
    this.removeTokens();
    this.removeUser();
  }
};

export default tokenManager;
