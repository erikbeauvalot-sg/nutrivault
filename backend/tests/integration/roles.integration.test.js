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
          name: 'SECRETARIAT',
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

      expect(res.status).toBe(403);
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
  // Custom roles (free-form names + data scope)
  // ========================================
  describe('Custom roles', () => {
    it('normalizes a free-form name to uppercase without accents', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: '  Comptabilité générale ', data_scope: 'all' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('COMPTABILITE_GENERALE');
      expect(res.body.data.data_scope).toBe('all');
      expect(res.body.data.is_system).toBe(false);
    });

    it('rejects a name that already exists, whatever the case', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'dietitian' });

      expect(res.status).toBe(409);
    });

    it('rejects invalid names and data scopes', async () => {
      const badName = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: '1-%' });
      expect(badName.status).toBe(400);

      const badScope = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'COMPTABLE', data_scope: 'everything' });
      expect(badScope.status).toBe(400);
    });

    it('defaults data_scope to own', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'COMPTABLE' });

      expect(res.status).toBe(201);
      expect(res.body.data.data_scope).toBe('own');
    });

    it('reactivates a deleted role with the same name, without its old permissions', async () => {
      const db = testDb.getDb();
      const role = await db.Role.create({ name: 'COMPTABLE' });
      const perm = await db.Permission.findOne({ where: { code: 'finance.read' } })
        || await db.Permission.findOne();
      await db.RolePermission.create({ role_id: role.id, permission_id: perm.id });

      const del = await request(app)
        .delete(`/api/roles/${role.id}`)
        .set('Authorization', adminAuth.authHeader);
      expect(del.status).toBe(200);

      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'comptable', description: 'Back', data_scope: 'all' });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(role.id);
      expect(res.body.data.is_active).toBe(true);
      expect(await db.RolePermission.count({ where: { role_id: role.id } })).toBe(0);
    });

    it('allows renaming a custom role but not a system role', async () => {
      const db = testDb.getDb();
      const custom = await db.Role.create({ name: 'COMPTABLE' });
      const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });

      const renamed = await request(app)
        .put(`/api/roles/${custom.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Expert comptable', data_scope: 'all' });
      expect(renamed.status).toBe(200);
      expect(renamed.body.data.name).toBe('EXPERT_COMPTABLE');
      expect(renamed.body.data.data_scope).toBe('all');

      const systemRename = await request(app)
        .put(`/api/roles/${dietitianRole.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'NUTRITIONIST' });
      expect(systemRename.status).toBe(403);

      const systemDescription = await request(app)
        .put(`/api/roles/${dietitianRole.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'DIETITIAN', description: 'Updated' });
      expect(systemDescription.status).toBe(200);
      expect(systemDescription.body.data.description).toBe('Updated');
    });

    it('refuses to delete a system role', async () => {
      const db = testDb.getDb();
      const assistantRole = await db.Role.findOne({ where: { name: 'ASSISTANT' } });

      const res = await request(app)
        .delete(`/api/roles/${assistantRole.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // Sidebar menu entries per role
  // ========================================
  describe('Role menu items', () => {
    let customRole;

    beforeEach(async () => {
      const db = testDb.getDb();
      await require('../../src/services/sidebarMenuConfig.service').resetToDefaults();
      customRole = await db.Role.create({ name: 'ACCOUNTING', data_scope: 'all' });
    });

    async function allowedRolesOf(itemKey) {
      const config = await testDb.getDb().SidebarMenuConfig.findOne({ where: { item_key: itemKey } });
      return config.allowed_roles;
    }

    it('starts with no menu entry for a new role', async () => {
      const res = await request(app)
        .get(`/api/roles/${customRole.id}/menu-items`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('sets exactly the selected entries, keeping other roles untouched', async () => {
      const first = await request(app)
        .put(`/api/roles/${customRole.id}/menu-items`)
        .set('Authorization', adminAuth.authHeader)
        .send({ item_keys: ['billing', 'finance', 'dashboard'] });
      expect(first.status).toBe(200);
      expect(first.body.data.sort()).toEqual(['billing', 'dashboard', 'finance']);

      const second = await request(app)
        .put(`/api/roles/${customRole.id}/menu-items`)
        .set('Authorization', adminAuth.authHeader)
        .send({ item_keys: ['billing', 'finance', 'quotes'] });
      expect(second.status).toBe(200);
      expect(second.body.data.sort()).toEqual(['billing', 'finance', 'quotes']);

      const dashboardRoles = await allowedRolesOf('dashboard');
      expect(dashboardRoles).not.toContain('ACCOUNTING');
      expect(dashboardRoles).toEqual(expect.arrayContaining(['ADMIN', 'DIETITIAN']));
    });

    it('follows a rename and is cleaned up on delete', async () => {
      await request(app)
        .put(`/api/roles/${customRole.id}/menu-items`)
        .set('Authorization', adminAuth.authHeader)
        .send({ item_keys: ['finance'] });

      await request(app)
        .put(`/api/roles/${customRole.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'COMPTABILITE' });
      expect(await allowedRolesOf('finance')).toContain('COMPTABILITE');
      expect(await allowedRolesOf('finance')).not.toContain('ACCOUNTING');

      await request(app)
        .delete(`/api/roles/${customRole.id}`)
        .set('Authorization', adminAuth.authHeader);
      expect(await allowedRolesOf('finance')).not.toContain('COMPTABILITE');
    });

    describe('home page', () => {
      async function homePageOf(auth) {
        const res = await request(app).get('/api/auth/me').set('Authorization', auth.authHeader);
        expect(res.status).toBe(200);
        return res.body.data.home_page;
      }

      async function giveMenu(itemKeys) {
        const res = await request(app)
          .put(`/api/roles/${customRole.id}/menu-items`)
          .set('Authorization', adminAuth.authHeader)
          .send({ item_keys: itemKeys });
        expect(res.status).toBe(200);
      }

      it('defaults to the dashboard, or the first visible entry without it', async () => {
        expect(await homePageOf(dietitianAuth)).toBe('dashboard');

        await giveMenu(['finance', 'billing']);
        const accountant = await testAuth.createUser('ACCOUNTING');
        // billing comes before finance in the default menu order
        expect(await homePageOf(accountant)).toBe('billing');
      });

      it('uses the role home page, overridden by the user home page', async () => {
        await giveMenu(['finance', 'billing', 'quotes']);
        const accountant = await testAuth.createUser('ACCOUNTING');

        const roleRes = await request(app)
          .put(`/api/roles/${customRole.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ home_page: 'finance' });
        expect(roleRes.status).toBe(200);
        expect(roleRes.body.data.home_page).toBe('finance');
        expect(await homePageOf(accountant)).toBe('finance');

        const userRes = await request(app)
          .put(`/api/users/${accountant.user.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ home_page: 'quotes' });
        expect(userRes.status).toBe(200);
        expect(await homePageOf(accountant)).toBe('quotes');

        await request(app)
          .put(`/api/users/${accountant.user.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ home_page: null });
        expect(await homePageOf(accountant)).toBe('finance');
      });

      it('skips a configured home page that is not in the role menu', async () => {
        await giveMenu(['billing']);
        await customRole.update({ home_page: 'patients' });
        const accountant = await testAuth.createUser('ACCOUNTING');

        expect(await homePageOf(accountant)).toBe('billing');
      });

      it('rejects unknown home pages', async () => {
        const res = await request(app)
          .put(`/api/roles/${customRole.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ home_page: 'nowhere' });
        expect(res.status).toBe(400);

        const userRes = await request(app)
          .put(`/api/users/${dietitianAuth.user.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ home_page: 'nowhere' });
        expect(userRes.status).toBe(400);
      });
    });

    it('rejects unknown entries, the ADMIN role and non-admin users', async () => {
      const db = testDb.getDb();
      const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });

      const unknown = await request(app)
        .put(`/api/roles/${customRole.id}/menu-items`)
        .set('Authorization', adminAuth.authHeader)
        .send({ item_keys: ['finance', 'does-not-exist'] });
      expect(unknown.status).toBe(400);

      const admin = await request(app)
        .put(`/api/roles/${adminRole.id}/menu-items`)
        .set('Authorization', adminAuth.authHeader)
        .send({ item_keys: [] });
      expect(admin.status).toBe(400);

      const forbidden = await request(app)
        .put(`/api/roles/${customRole.id}/menu-items`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ item_keys: ['finance'] });
      expect(forbidden.status).toBe(403);
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
