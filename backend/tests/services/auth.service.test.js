/**
 * Auth Service Unit Tests
 */

const authService = require('../../src/services/auth.service');
const db = require('../../models');
const { AppError } = require('../../src/middleware/errorHandler');
const { createRole, createUser, wait } = require('../helpers');
const { verifyAccessToken } = require('../../src/auth/jwt');

describe('Auth Service', () => {
  describe('register', () => {
    let adminRole;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
    });

    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Test123!',
        first_name: 'New',
        last_name: 'User',
        role_id: adminRole.id
      };

      const user = await authService.register(userData, null);

      expect(user).toBeDefined();
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('newuser@example.com');
      expect(user.first_name).toBe('New');
      expect(user.last_name).toBe('User');
      expect(user.password_hash).toBeUndefined(); // Should not be returned
      expect(user.is_active).toBe(true);
    });

    it('should throw error if username already exists', async () => {
      const existingUser = await createUser({
        username: 'existinguser',
        email: 'existing@example.com',
        role: adminRole
      });

      const userData = {
        username: 'existinguser',
        email: 'different@example.com',
        password: 'Test123!',
        first_name: 'Test',
        last_name: 'User',
        role_id: adminRole.id
      };

      await expect(authService.register(userData, null))
        .rejects
        .toThrow('Username already exists');
    });

    it('should throw error if email already exists', async () => {
      const existingUser = await createUser({
        username: 'user1',
        email: 'existing@example.com',
        role: adminRole
      });

      const userData = {
        username: 'differentuser',
        email: 'existing@example.com',
        password: 'Test123!',
        first_name: 'Test',
        last_name: 'User',
        role_id: adminRole.id
      };

      await expect(authService.register(userData, null))
        .rejects
        .toThrow('Email already exists');
    });
  });

  describe('login', () => {
    let user;
    let role;

    beforeEach(async () => {
      role = await createRole({ name: 'ADMIN' });
      user = await createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!',
        role
      });
    });

    it('should login successfully with valid credentials', async () => {
      const result = await authService.login(
        'testuser',
        'Test123!',
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password_hash).toBeUndefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify access token
      const decoded = verifyAccessToken(result.accessToken);
      expect(decoded.username).toBe('testuser');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should throw error with invalid username', async () => {
      await expect(
        authService.login('wronguser', 'Test123!', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with invalid password', async () => {
      await expect(
        authService.login('testuser', 'WrongPass123!', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid credentials');

      // Check that failed attempt was recorded
      const updatedUser = await db.User.findByPk(user.id);
      expect(updatedUser.failed_login_attempts).toBe(1);
    });

    it('should lock account after max failed attempts', async () => {
      const maxAttempts = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5');

      // Attempt login with wrong password multiple times
      for (let i = 0; i < maxAttempts; i++) {
        try {
          await authService.login('testuser', 'WrongPass!', '127.0.0.1', 'test-agent');
        } catch (error) {
          // Expected to fail
        }
      }

      // Check that account is locked
      const updatedUser = await db.User.findByPk(user.id);
      expect(updatedUser.failed_login_attempts).toBe(maxAttempts);
      expect(updatedUser.locked_until).toBeDefined();
      expect(new Date(updatedUser.locked_until)).toBeInstanceOf(Date);

      // Try to login with correct password - should fail because account is locked
      await expect(
        authService.login('testuser', 'Test123!', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Account is locked');
    });

    it('should throw error if account is deactivated', async () => {
      await user.update({ is_active: false });

      await expect(
        authService.login('testuser', 'Test123!', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Account is deactivated');
    });

    it('should reset failed attempts on successful login', async () => {
      // First, create some failed attempts
      await user.update({ failed_login_attempts: 3 });

      // Login successfully
      await authService.login('testuser', 'Test123!', '127.0.0.1', 'test-agent');

      // Check that failed attempts were reset
      const updatedUser = await db.User.findByPk(user.id);
      expect(updatedUser.failed_login_attempts).toBe(0);
      expect(updatedUser.last_login_at).toBeDefined();
    });
  });

  describe('logout', () => {
    let user;
    let refreshToken;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      user = await createUser({ username: 'testuser', role });

      // Login to get refresh token
      const result = await authService.login(
        'testuser',
        'Test123!',
        '127.0.0.1',
        'test-agent'
      );
      refreshToken = result.refreshToken;
    });

    it('should logout successfully and revoke refresh token', async () => {
      const result = await authService.logout(refreshToken);

      expect(result.message).toBe('Logged out successfully');

      // Check that refresh token is revoked
      const { hashToken } = require('../../src/auth/jwt');
      const tokenHash = hashToken(refreshToken);
      const token = await db.RefreshToken.findOne({
        where: { token_hash: tokenHash }
      });

      expect(token).toBeDefined();
      expect(token.revoked_at).toBeDefined();
    });

    it('should throw error if refresh token is not provided', async () => {
      await expect(authService.logout(null))
        .rejects
        .toThrow('Refresh token required');
    });

    it('should handle logout with non-existent token gracefully', async () => {
      const result = await authService.logout('nonexistent-token');
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('refreshAccessToken', () => {
    let user;
    let refreshToken;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      user = await createUser({ username: 'testuser', role });

      // Login to get refresh token
      const result = await authService.login(
        'testuser',
        'Test123!',
        '127.0.0.1',
        'test-agent'
      );
      refreshToken = result.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const result = await authService.refreshAccessToken(
        refreshToken,
        '127.0.0.1',
        'test-agent'
      );

      expect(result.accessToken).toBeDefined();

      // Verify new access token
      const decoded = verifyAccessToken(result.accessToken);
      expect(decoded.username).toBe('testuser');
    });

    it('should throw error if refresh token is not provided', async () => {
      await expect(
        authService.refreshAccessToken(null, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Refresh token required');
    });

    it('should throw error if refresh token is invalid', async () => {
      await expect(
        authService.refreshAccessToken('invalid-token', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error if refresh token is revoked', async () => {
      // Logout to revoke token
      await authService.logout(refreshToken);

      // Try to refresh
      await expect(
        authService.refreshAccessToken(refreshToken, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Refresh token has been revoked');
    });

    it('should throw error if user is deactivated', async () => {
      // Deactivate user
      await user.update({ is_active: false });

      // Try to refresh
      await expect(
        authService.refreshAccessToken(refreshToken, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Account is deactivated');
    });
  });

  describe('createApiKey', () => {
    let user;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      user = await createUser({ username: 'testuser', role });
    });

    it('should create API key successfully', async () => {
      const result = await authService.createApiKey(user.id, 'Test API Key', null);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.apiKey).toBeDefined();
      expect(result.prefix).toBeDefined();
      expect(result.name).toBe('Test API Key');
      expect(result.warning).toBeDefined();

      // Verify API key was stored in database
      const apiKey = await db.ApiKey.findByPk(result.id);
      expect(apiKey).toBeDefined();
      expect(apiKey.user_id).toBe(user.id);
      expect(apiKey.is_active).toBe(true);
    });

    it('should create API key with default name if not provided', async () => {
      const result = await authService.createApiKey(user.id, null, null);

      expect(result.name).toBe('API Key');
    });

    it('should create API key with expiration date', async () => {
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const result = await authService.createApiKey(user.id, 'Test Key', expiryDate);

      expect(result.expires_at).toBeDefined();
    });
  });

  describe('listApiKeys', () => {
    let user;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      user = await createUser({ username: 'testuser', role });
    });

    it('should list user API keys', async () => {
      // Create multiple API keys
      await authService.createApiKey(user.id, 'Key 1', null);
      await authService.createApiKey(user.id, 'Key 2', null);
      await authService.createApiKey(user.id, 'Key 3', null);

      const apiKeys = await authService.listApiKeys(user.id);

      expect(apiKeys).toHaveLength(3);
      expect(apiKeys[0].name).toBeDefined();
      expect(apiKeys[0].key_prefix).toBeDefined();
      expect(apiKeys[0].key_hash).toBeUndefined(); // Should not be exposed
    });

    it('should return empty array if user has no API keys', async () => {
      const apiKeys = await authService.listApiKeys(user.id);
      expect(apiKeys).toHaveLength(0);
    });

    it('should not list revoked API keys', async () => {
      const apiKey1 = await authService.createApiKey(user.id, 'Key 1', null);
      const apiKey2 = await authService.createApiKey(user.id, 'Key 2', null);

      // Revoke one key
      await authService.revokeApiKey(apiKey1.id, user.id);

      const apiKeys = await authService.listApiKeys(user.id);

      expect(apiKeys).toHaveLength(1);
      expect(apiKeys[0].name).toBe('Key 2');
    });
  });

  describe('revokeApiKey', () => {
    let user;
    let apiKeyId;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      user = await createUser({ username: 'testuser', role });

      const apiKey = await authService.createApiKey(user.id, 'Test Key', null);
      apiKeyId = apiKey.id;
    });

    it('should revoke API key successfully', async () => {
      const result = await authService.revokeApiKey(apiKeyId, user.id);

      expect(result.message).toBe('API key revoked successfully');

      // Verify API key is deactivated
      const apiKey = await db.ApiKey.findByPk(apiKeyId);
      expect(apiKey.is_active).toBe(false);
    });

    it('should throw error if API key not found', async () => {
      await expect(
        authService.revokeApiKey('nonexistent-id', user.id)
      ).rejects.toThrow('API key not found');
    });

    it('should throw error if API key belongs to different user', async () => {
      const role = await createRole({ name: 'USER' });
      const otherUser = await createUser({
        username: 'otheruser',
        email: 'other@example.com',
        role
      });

      await expect(
        authService.revokeApiKey(apiKeyId, otherUser.id)
      ).rejects.toThrow('API key not found');
    });
  });
});
