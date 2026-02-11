/**
 * Authentication Context
 * Provides global authentication state and methods to all components
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import * as tokenStorage from '../utils/tokenStorage';
import * as biometricService from '../services/biometricService';
import * as pushNotificationService from '../services/pushNotificationService';
import * as offlineCache from '../services/offlineCache';
import { isNative } from '../utils/platform';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(!isNative);

  // Initialize auth state from stored token on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login user
   * @param {string} username
   * @param {string} password
   * @param {boolean} rememberMe
   * @returns {Promise<void>}
   */
  const login = async (username, password, rememberMe = false) => {
    try {
      const userData = await authService.login(username, password, rememberMe);
      setUser(userData);
      setIsAuthenticated(true);

      // Register for push notifications on native after login
      if (isNative) {
        try {
          const granted = await pushNotificationService.requestPermission();
          if (granted) {
            await pushNotificationService.addListeners();
            await pushNotificationService.register();
          }
        } catch (pushErr) {
          console.error('Push notification setup failed:', pushErr);
        }
      }

      return userData;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  /**
   * Login via biometric — retrieves refreshToken from Keychain, calls /auth/refresh
   * @returns {Promise<boolean>} true if login succeeded
   */
  const biometricLogin = async (refreshToken) => {
    try {
      // Use the refresh token from Keychain to get a new session
      const baseURL = import.meta.env.VITE_API_URL || '/api';
      const { default: axios } = await import('axios');
      const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
      const result = data.data || data;

      tokenStorage.setTokens(result.accessToken, result.refreshToken, true);
      if (result.user) {
        tokenStorage.setUser(result.user, true);
        setUser(result.user);
      }
      setIsAuthenticated(true);
      setBiometricUnlocked(true);

      // Update Keychain with the new refresh token
      const creds = await biometricService.getCredentials();
      if (creds) {
        await biometricService.saveCredentials(creds.username, result.refreshToken);
      }

      return true;
    } catch (error) {
      console.error('Biometric login failed:', error);
      return false;
    }
  };

  /**
   * Mark biometric as unlocked (for lock screen flow)
   */
  const setBiometricUnlockedState = useCallback((val) => {
    setBiometricUnlocked(val);
  }, []);

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('authService.logout failed:', e);
    }
    // Always clear state, even if API call failed
    if (isNative) {
      try { await biometricService.deleteCredentials(); } catch {}
      biometricService.clearBiometricPrefs();
    }
    try { await offlineCache.clear(); } catch {}
    setUser(null);
    setIsAuthenticated(false);
    setBiometricUnlocked(!isNative);
  };

  /**
   * Update user data in state and storage (e.g. after changing theme preference)
   */
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      tokenStorage.setUser(updated, tokenStorage.isRemembered());
      return updated;
    });
  }, []);

  /**
   * Check if user has a specific permission
   * @param {string} permission - Permission code to check
   * @returns {boolean} True if user has the permission
   */
  const hasPermission = (permission) => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permission);
  };

  /**
   * Check if user has a specific role
   * @param {string} roleName - Role name to check
   * @returns {boolean} True if user has the role
   */
  const hasRole = (roleName) => {
    if (!user || !user.role) {
      return false;
    }
    return user.role.name === roleName;
  };

  /**
   * Check if user is admin
   * @returns {boolean} True if user has ADMIN role
   */
  const isAdmin = () => {
    return hasRole('ADMIN');
  };

  /**
   * Check if user is a patient
   * @returns {boolean} True if user has PATIENT role
   */
  const isPatient = () => {
    if (!user) return false;
    // user.role can be a string (from backend login response) or an object
    const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
    return roleName === 'PATIENT';
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    biometricUnlocked,
    login,
    logout,
    biometricLogin,
    setBiometricUnlockedState,
    hasPermission,
    hasRole,
    isAdmin,
    isPatient,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 * @returns {object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
