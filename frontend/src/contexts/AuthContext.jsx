/**
 * Authentication Context
 * Provides global authentication state and methods to all components
 */

import { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

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

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    isAdmin,
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
