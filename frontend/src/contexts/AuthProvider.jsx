/**
 * Authentication Provider
 * Wraps app with authentication context and logic
 */

import { useState, useEffect, useCallback } from 'react';
import AuthContext from './AuthContext';
import authService from '../services/authService';
import tokenManager from '../utils/tokenManager';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTimer, setRefreshTimer] = useState(null);

  // Schedule token refresh 5 minutes before expiration
  const scheduleTokenRefresh = useCallback(() => {
    const token = tokenManager.getAccessToken();
    if (!token) return;

    const decoded = tokenManager.decodeToken(token);
    if (!decoded || !decoded.exp) return;

    // Calculate time until refresh (5 minutes before expiration)
    const expiresIn = decoded.exp * 1000 - Date.now();
    const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 0);

    // Clear existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    // Schedule refresh
    const timer = setTimeout(async () => {
      try {
        await authService.refreshToken();
        console.log('Token refreshed automatically');
        // Reschedule next refresh
        scheduleTokenRefresh();
      } catch (err) {
        console.error('Auto token refresh failed:', err);
      }
    }, refreshIn);

    setRefreshTimer(timer);
  }, [refreshTimer]);

  // Initialize auth on app mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = tokenManager.getAccessToken();
        const storedUser = tokenManager.getUser();

        if (token && storedUser) {
          // Verify token is still valid
          if (!tokenManager.isTokenExpired(token)) {
            setUser(storedUser);
            // Schedule automatic token refresh
            scheduleTokenRefresh();
          } else {
            // Token expired, clear all
            tokenManager.clearAll();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        tokenManager.clearAll();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [scheduleTokenRefresh, refreshTimer]);

  const login = useCallback(async (username, password, rememberMe = false) => {
    setError(null);
    setLoading(true);

    try {
      const { user: userData } = await authService.login(username, password, rememberMe);
      setUser(userData);
      // Schedule automatic token refresh
      scheduleTokenRefresh();
      return userData;
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scheduleTokenRefresh]);

  const logout = useCallback(async () => {
    try {
      // Clear refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }

      const refreshToken = tokenManager.getRefreshToken();
      await authService.logout(refreshToken);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
      tokenManager.clearAll();
    }
  }, [refreshTimer]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
