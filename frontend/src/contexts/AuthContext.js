/**
 * Authentication Context
 * Provides authentication state to entire app
 */

import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  clearError: () => {}
});

export default AuthContext;
