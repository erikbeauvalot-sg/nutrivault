/**
 * Users Integration Tests
 * Tests for /api/users endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { users: userFixtures } = require('../fixtures');

let app;
let adminAuth;
let dietitianAuth;

describe('Users API', () => {
  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    // Create auth contexts
    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/users/check-email/:email
  // ========================================
  describe('GET /api/users/check-email/:email', () => {
    it('should return available for unused email', async () => {
      const res = await request(app)
        .get('/api/users/check-email/newuser@test.com')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.available).toBe(true);
      expect(res.body.email).toBe('newuser@test.com');
    });

    it('should return unavailable for existing user email', async () => {
      // The adminAuth user already exists with an email
      const res = await request(app)
        .get(`/api/users/check-email/${adminAuth.user.email}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.available).toBe(false);
    });

    it('should return available when excluding own ID (for updates)', async () => {
      const res = await request(app)
        .get(`/api/users/check-email/${adminAuth.user.email}?excludeId=${adminAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.available).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .get('/api/users/check-email/invalid-email')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/users/check-email/test@test.com');

      expect(res.status).toBe(401);
    });

    it('should normalize email to lowercase', async () => {
      const res = await request(app)
        .get('/api/users/check-email/TEST@TEST.COM')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@test.com');
    });
  });

  // ========================================
  // GET /api/users/roles
  // ========================================
  describe('GET /api/users/roles', () => {
    it('should return available roles', async () => {
      const res = await request(app)
        .get('/api/users/roles')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/users/roles');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/users/list/dietitians
  // ========================================
  describe('GET /api/users/list/dietitians', () => {
    it('should return list of dietitians', async () => {
      const res = await request(app)
        .get('/api/users/list/dietitians')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/users/list/dietitians');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/users
  // ========================================
  describe('GET /api/users', () => {
    it('should return paginated users for admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/users/:id
  // ========================================
  describe('GET /api/users/:id', () => {
    it('should return user details for admin', async () => {
      const res = await request(app)
        .get(`/api/users/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(dietitianAuth.user.id);
    });

    it('should allow user to view own profile', async () => {
      const res = await request(app)
        .get(`/api/users/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject non-admin viewing other profiles', async () => {
      const res = await request(app)
        .get(`/api/users/${adminAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/users/invalid-uuid')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });
});
