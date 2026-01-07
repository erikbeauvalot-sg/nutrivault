/**
 * Integration Tests: Authentication API
 *
 * Tests authentication endpoints including:
 * - User registration
 * - Login/logout
 * - Token refresh
 * - API key management
 * - Account locking
 */

const request = require('supertest');
const app = require('../../src/server');
const db = require('../../../models');
const { createUser, createRole } = require('../helpers');

describe('Authentication API - Integration Tests', () => {
  let adminRole;
  let dietitianRole;

  beforeEach(async () => {
    // Create roles
    adminRole = await createRole({ name: 'ADMIN' });
    dietitianRole = await createRole({ name: 'DIETITIAN' });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          first_name: 'New',
          last_name: 'User',
          role_id: dietitianRole.id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.username).toBe('newuser');
      expect(res.body.data.user.email).toBe('newuser@test.com');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject registration with existing username', async () => {
      await createUser({ username: 'existinguser', email: 'existing@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'newemail@test.com',
          password: 'SecurePass123!',
          first_name: 'Test',
          last_name: 'User',
          role_id: dietitianRole.id
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('username');
    });

    it('should reject registration with existing email', async () => {
      await createUser({ username: 'user1', email: 'existing@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'existing@test.com',
          password: 'SecurePass123!',
          first_name: 'Test',
          last_name: 'User',
          role_id: dietitianRole.id
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('email');
    });

    it('should reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'weak',
          first_name: 'New',
          last_name: 'User',
          role_id: dietitianRole.id
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration without required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createUser({
        username: 'loginuser',
        email: 'loginuser@test.com',
        password: 'Test123!',
        role: adminRole
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'Test123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('loginuser');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'Test123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should lock account after max failed attempts', async () => {
      // Attempt login 5 times with wrong password
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: 'loginuser',
            password: 'WrongPassword!'
          });
      }

      // 6th attempt should be locked
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'Test123!'
        });

      expect(res.status).toBe(423);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('locked');
    });

    it('should reject login for deactivated user', async () => {
      await testUser.update({ is_active: false });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'Test123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('deactivated');
    });

    it('should reset failed attempts on successful login', async () => {
      // Fail twice
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'loginuser', password: 'Wrong!' });
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'loginuser', password: 'Wrong!' });

      // Successful login
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'Test123!'
        });

      expect(res.status).toBe(200);

      // Check failed_login_attempts was reset
      await testUser.reload();
      expect(testUser.failed_login_attempts).toBe(0);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await createUser({
        username: 'refreshuser',
        email: 'refreshuser@test.com',
        password: 'Test123!',
        role: adminRole
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'refreshuser', password: 'Test123!' });

      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject revoked refresh token', async () => {
      // Revoke the token by logging out
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject refresh token for deactivated user', async () => {
      await testUser.update({ is_active: false });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await createUser({
        username: 'logoutuser',
        email: 'logoutuser@test.com',
        password: 'Test123!',
        role: adminRole
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'logoutuser', password: 'Test123!' });

      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should logout successfully and revoke token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify token is revoked by trying to refresh
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });

    it('should reject logout without refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle logout with non-existent token gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'non-existent-token' });

      // Should still return success (idempotent)
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('API Key Management', () => {
    let testUser;
    let accessToken;

    beforeEach(async () => {
      testUser = await createUser({
        username: 'apikeyuser',
        email: 'apikeyuser@test.com',
        password: 'Test123!',
        role: adminRole
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'apikeyuser', password: 'Test123!' });

      accessToken = loginRes.body.data.accessToken;
    });

    describe('POST /api/auth/api-keys', () => {
      it('should create API key successfully', async () => {
        const res = await request(app)
          .post('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Test API Key' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('key');
        expect(res.body.data.name).toBe('Test API Key');
      });

      it('should create API key with default name', async () => {
        const res = await request(app)
          .post('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({});

        expect(res.status).toBe(201);
        expect(res.body.data.name).toMatch(/API Key/);
      });

      it('should create API key with expiration', async () => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const res = await request(app)
          .post('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Expiring Key',
            expires_at: expiresAt.toISOString()
          });

        expect(res.status).toBe(201);
        expect(res.body.data).toHaveProperty('expires_at');
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .post('/api/auth/api-keys')
          .send({ name: 'Test Key' });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/auth/api-keys', () => {
      beforeEach(async () => {
        // Create some API keys
        await request(app)
          .post('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Key 1' });

        await request(app)
          .post('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Key 2' });
      });

      it('should list user API keys', async () => {
        const res = await request(app)
          .get('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data[0]).not.toHaveProperty('key'); // Key should be hidden
      });

      it('should not list revoked keys', async () => {
        // Get first key
        const listRes = await request(app)
          .get('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`);

        const keyId = listRes.body.data[0].id;

        // Revoke it
        await request(app)
          .delete(`/api/auth/api-keys/${keyId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        // List again
        const res = await request(app)
          .get('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.body.data).toHaveLength(1);
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .get('/api/auth/api-keys');

        expect(res.status).toBe(401);
      });
    });

    describe('DELETE /api/auth/api-keys/:id', () => {
      let apiKeyId;

      beforeEach(async () => {
        const createRes = await request(app)
          .post('/api/auth/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name: 'Key to Delete' });

        apiKeyId = createRes.body.data.id;
      });

      it('should revoke API key successfully', async () => {
        const res = await request(app)
          .delete(`/api/auth/api-keys/${apiKeyId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject revoking non-existent key', async () => {
        const res = await request(app)
          .delete('/api/auth/api-keys/99999')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
      });

      it('should reject revoking another user\'s key', async () => {
        // Create another user
        const otherUser = await createUser({
          username: 'otheruser',
          email: 'other@test.com',
          role: dietitianRole
        });

        const otherLoginRes = await request(app)
          .post('/api/auth/login')
          .send({ username: 'otheruser', password: 'Test123!' });

        const otherToken = otherLoginRes.body.data.accessToken;

        const res = await request(app)
          .delete(`/api/auth/api-keys/${apiKeyId}`)
          .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(403);
      });

      it('should require authentication', async () => {
        const res = await request(app)
          .delete(`/api/auth/api-keys/${apiKeyId}`);

        expect(res.status).toBe(401);
      });
    });
  });
});
