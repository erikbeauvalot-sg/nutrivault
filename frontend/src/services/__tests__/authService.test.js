/**
 * AuthService Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, logout, refreshToken, getCurrentUser, isAuthenticated } from '../authService';
import * as tokenStorage from '../../utils/tokenStorage';
import api from '../api';

// Mock api module
vi.mock('../api', () => ({
  default: {
    post: vi.fn()
  }
}));

// Mock tokenStorage module
vi.mock('../../utils/tokenStorage', () => ({
  setTokens: vi.fn(),
  getRefreshToken: vi.fn(),
  clearTokens: vi.fn(),
  setUser: vi.fn(),
  getUser: vi.fn(),
  clearUser: vi.fn(),
  getAccessToken: vi.fn(),
  decodeToken: vi.fn(),
  isRemembered: vi.fn()
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'admin',
        role: { name: 'ADMIN' }
      };

      api.post.mockResolvedValue({
        data: {
          data: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            user: mockUser
          }
        }
      });

      const result = await login('admin', 'password', true);

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'admin',
        password: 'password',
        rememberMe: true
      });
      expect(tokenStorage.setTokens).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token',
        true
      );
      expect(tokenStorage.setUser).toHaveBeenCalledWith(mockUser, true);
      expect(result).toEqual(mockUser);
    });

    it('should throw error on login failure', async () => {
      api.post.mockRejectedValue({
        response: {
          data: { error: 'Invalid credentials' }
        }
      });

      await expect(login('admin', 'wrong')).rejects.toEqual({
        error: 'Invalid credentials'
      });
    });

    it('should default rememberMe to false', async () => {
      api.post.mockResolvedValue({
        data: {
          data: {
            accessToken: 'token',
            refreshToken: 'refresh',
            user: { id: '1' }
          }
        }
      });

      await login('user', 'pass');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'user',
        password: 'pass',
        rememberMe: false
      });
    });
  });

  describe('logout', () => {
    it('should call backend and clear tokens', async () => {
      tokenStorage.getRefreshToken.mockReturnValue('mock-refresh-token');
      api.post.mockResolvedValue({ data: { success: true } });

      await logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'mock-refresh-token'
      });
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(tokenStorage.clearUser).toHaveBeenCalled();
    });

    it('should clear tokens even if backend call fails', async () => {
      tokenStorage.getRefreshToken.mockReturnValue('mock-refresh-token');
      api.post.mockRejectedValue(new Error('Network error'));

      await logout();

      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(tokenStorage.clearUser).toHaveBeenCalled();
    });

    it('should skip backend call if no refresh token', async () => {
      tokenStorage.getRefreshToken.mockReturnValue(null);

      await logout();

      expect(api.post).not.toHaveBeenCalled();
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      tokenStorage.getRefreshToken.mockReturnValue('old-refresh-token');
      tokenStorage.isRemembered.mockReturnValue(true);
      api.post.mockResolvedValue({
        data: {
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        }
      });

      const result = await refreshToken();

      expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token'
      });
      expect(tokenStorage.setTokens).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token',
        true
      );
      expect(result).toBe('new-access-token');
    });

    it('should throw error if no refresh token available', async () => {
      tokenStorage.getRefreshToken.mockReturnValue(null);

      await expect(refreshToken()).rejects.toThrow('No refresh token available');
    });

    it('should clear tokens on refresh failure', async () => {
      tokenStorage.getRefreshToken.mockReturnValue('old-token');
      api.post.mockRejectedValue({
        response: {
          data: { error: 'Token expired' }
        }
      });

      await expect(refreshToken()).rejects.toEqual({
        error: 'Token expired'
      });
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(tokenStorage.clearUser).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from storage when authenticated', () => {
      const mockUser = { id: 'user-1', username: 'admin' };
      tokenStorage.getUser.mockReturnValue(mockUser);
      tokenStorage.getAccessToken.mockReturnValue('valid-token');
      tokenStorage.decodeToken.mockReturnValue({
        exp: (Date.now() / 1000) + 3600 // Expires in 1 hour
      });

      const result = getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null if no user in storage', () => {
      tokenStorage.getUser.mockReturnValue(null);

      const result = getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null and clear user if token is invalid', () => {
      tokenStorage.getUser.mockReturnValue({ id: '1' });
      tokenStorage.getAccessToken.mockReturnValue(null);

      const result = getCurrentUser();

      expect(result).toBeNull();
      expect(tokenStorage.clearUser).toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid non-expired token', () => {
      tokenStorage.getAccessToken.mockReturnValue('valid-token');
      tokenStorage.decodeToken.mockReturnValue({
        exp: (Date.now() / 1000) + 3600 // Expires in 1 hour
      });

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false if no token', () => {
      tokenStorage.getAccessToken.mockReturnValue(null);

      expect(isAuthenticated()).toBe(false);
    });

    it('should return false for expired token', () => {
      tokenStorage.getAccessToken.mockReturnValue('expired-token');
      tokenStorage.decodeToken.mockReturnValue({
        exp: (Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      expect(isAuthenticated()).toBe(false);
    });

    it('should return false if token cannot be decoded', () => {
      tokenStorage.getAccessToken.mockReturnValue('invalid-token');
      tokenStorage.decodeToken.mockReturnValue(null);

      expect(isAuthenticated()).toBe(false);
    });

    it('should return false if decoded token has no exp', () => {
      tokenStorage.getAccessToken.mockReturnValue('token');
      tokenStorage.decodeToken.mockReturnValue({ sub: 'user-1' });

      expect(isAuthenticated()).toBe(false);
    });
  });
});
