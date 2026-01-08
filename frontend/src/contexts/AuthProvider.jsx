/**
 * Authentication Provider
 * Wraps app with authentication context and logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AuthContext from './AuthContext';
import authService from '../services/authService';
import tokenManager from '../utils/tokenManager';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);

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
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Schedule refresh
    refreshTimerRef.current = setTimeout(async () => {
      try {
        await authService.refreshToken();
        console.log('Token refreshed automatically');
        // Reschedule next refresh
        scheduleTokenRefresh();
      } catch (err) {
        console.error('Auto token refresh failed:', err);
      }
    }, refreshIn);
  }, []);

  // Initialize auth on app mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthProvider] Initializing authentication');
      try {
        const token = tokenManager.getAccessToken();
        const storedUser = tokenManager.getUser();

        console.log('[AuthProvider] Stored credentials:', {
          hasToken: !!token,
          hasUser: !!storedUser,
          username: storedUser?.username
        });

        if (token && storedUser) {
          // Verify token is still valid
          if (!tokenManager.isTokenExpired(token)) {
            console.log('[AuthProvider] Token valid, restoring session');
            setUser(storedUser);
            // Schedule automatic token refresh
            scheduleTokenRefresh();
          } else {
            console.log('[AuthProvider] Token expired, clearing session');
            // Token expired, clear all
            tokenManager.clearAll();
          }
        } else {
          console.log('[AuthProvider] No stored credentials found');
        }
      } catch (err) {
        console.error('[AuthProvider] Auth initialization error:', err);
        tokenManager.clearAll();
      } finally {
        setLoading(false);
        console.log('[AuthProvider] Initialization complete');
      }
    };

    initializeAuth();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [scheduleTokenRefresh]);

  const login = useCallback(async (username, password, rememberMe = false) => {
    console.log('[AuthProvider] Login initiated:', username);
    setError(null);
    setLoading(true);

    try {
      const { user: userData } = await authService.login(username, password, rememberMe);
      console.log('[AuthProvider] Login successful, setting user:', userData?.username);
      setUser(userData);
      // Schedule automatic token refresh
      scheduleTokenRefresh();
      console.log('[AuthProvider] Token refresh scheduled');
      return userData;
    } catch (err) {
      console.error('[AuthProvider] Login failed:', err.message);
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
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
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
  }, []);

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
