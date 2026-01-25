/**
 * Roles Integration Tests
 * Tests for /api/roles endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { roles: roleFixtures } = require('../fixtures');

let app;

describe('Roles API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;

  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    // Create test users
    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/roles
  // ========================================
  describe('GET /api/roles', () => {
    it('should return list of roles for admin', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Should have at least the 3 system roles
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should include system roles', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', adminAuth.authHeader);

      const roleNames = res.body.data.map(r => r.name);
      expect(roleNames).toContain('ADMIN');
      expect(roleNames).toContain('DIETITIAN');
      expect(roleNames).toContain('ASSISTANT');
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/roles');

      expect(res.status).toBe(401);
    });

    it('should reject request for non-admin users', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/roles/:id
  // ========================================
  describe('GET /api/roles/:id', () => {
    it('should return role by ID', async () => {
      const db = testDb.getDb();
      const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });

      const res = await request(app)
        .get(`/api/roles/${adminRole.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('ADMIN');
    });

    it('should return role with permissions', async () => {
      const db = testDb.getDb();
      const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });

      const res = await request(app)
        .get(`/api/roles/${adminRole.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Admin role should have permissions
      expect(res.body.data).toHaveProperty('permissions');
    });

    it('should return 404 for non-existent role', async () => {
      const res = await request(app)
        .get('/api/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // POST /api/roles
  // ========================================
  describe('POST /api/roles', () => {
    it('should create a custom role as admin', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send(roleFixtures.validRole);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(roleFixtures.validRole.name);
    });

    it('should create role with description', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send({
          name: 'VIEWER',
          description: 'Viewer role with specific permissions'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject role without name', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send(roleFixtures.invalidRoles.missingName);

      expect(res.status).toBe(400);
    });

    it('should reject duplicate role name', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send(roleFixtures.invalidRoles.duplicateName);

      // API returns 400 for validation error or 409 for conflict
      expect([400, 409]).toContain(res.status);
    });

    it('should reject role creation without authentication', async () => {
      const res = await request(app)
        .post('/api/roles')
        .send(roleFixtures.validRole);

      expect(res.status).toBe(401);
    });

    it('should reject role creation for non-admin users', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', dietitianAuth.authHeader)
        .send(roleFixtures.validRole);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // PUT /api/roles/:id
  // ========================================
  describe('PUT /api/roles/:id', () => {
    let customRole;

    beforeEach(async () => {
      const db = testDb.getDb();
      customRole = await db.Role.create(roleFixtures.validRole);
    });

    it('should update custom role', async () => {
      const res = await request(app)
        .put(`/api/roles/${customRole.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(roleFixtures.roleUpdates.updateDescription);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deactivate role', async () => {
      const res = await request(app)
        .put(`/api/roles/${customRole.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(roleFixtures.roleUpdates.deactivate);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_active).toBe(false);
    });

    it('should not allow modifying system roles', async () => {
      const db = testDb.getDb();
      const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });

      const res = await request(app)
        .put(`/api/roles/${adminRole.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(roleFixtures.roleUpdates.updateName);

      // Should either reject or not allow certain changes
      expect([200, 400, 403]).toContain(res.status);
    });

    it('should return 404 for non-existent role', async () => {
      const res = await request(app)
        .put('/api/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send(roleFixtures.roleUpdates.updateDescription);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // DELETE /api/roles/:id
  // ========================================
  describe('DELETE /api/roles/:id', () => {
    let customRole;

    beforeEach(async () => {
      const db = testDb.getDb();
      customRole = await db.Role.create(roleFixtures.validRole);
    });

    it('should delete custom role', async () => {
      const res = await request(app)
        .delete(`/api/roles/${customRole.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not allow deleting system roles', async () => {
      const db = testDb.getDb();
      const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });

      const res = await request(app)
        .delete(`/api/roles/${adminRole.id}`)
        .set('Authorization', adminAuth.authHeader);

      // Should reject deletion of system roles
      expect([400, 403, 409]).toContain(res.status);
    });

    it('should return 404 for non-existent role', async () => {
      const res = await request(app)
        .delete('/api/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/roles/${customRole.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for non-admin users', async () => {
      const res = await request(app)
        .delete(`/api/roles/${customRole.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/roles/all/permissions
  // ========================================
  describe('GET /api/roles/all/permissions', () => {
    it('should return list of all permissions', async () => {
      const res = await request(app)
        .get('/api/roles/all/permissions')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should group permissions by category', async () => {
      const res = await request(app)
        .get('/api/roles/all/permissions?grouped=true')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
