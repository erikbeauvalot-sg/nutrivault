/**
 * Sidebar Categories Integration Tests
 * Tests for /api/sidebar-categories
 *
 * Routes:
 *   GET    /              - All authenticated users
 *   POST   /              - Admin only (requireRole('ADMIN'))
 *   PUT    /reorder       - Admin only
 *   PUT    /:id           - Admin only
 *   DELETE /:id           - Admin only
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Sidebar Categories API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let db;

  beforeAll(async () => {
    await testDb.init();
    app = require('../setup/testServer').resetApp();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    db = testDb.getDb();

    // Manually clean sidebar categories (testDb.reset() covers them but we
    // ensure a clean slate since they may have been populated by seeders)
    await db.SidebarCategory.destroy({ where: {}, force: true });

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  // Helper: create a category via the API as admin
  async function createCategory(overrides = {}) {
    const payload = {
      label: overrides.label || 'Test Category',
      icon: overrides.icon || '🗂️',
      section: overrides.section || 'main',
      is_default_open: overrides.is_default_open !== undefined ? overrides.is_default_open : true
    };
    const res = await request(app)
      .post('/api/sidebar-categories')
      .set('Authorization', adminAuth.authHeader)
      .send(payload);
    return res.body.data;
  }

  // ========================================
  // GET /api/sidebar-categories
  // ========================================
  describe('GET /api/sidebar-categories', () => {
    it('should return 200 with empty array when no categories exist (admin)', async () => {
      const res = await request(app)
        .get('/api/sidebar-categories')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 for authenticated dietitian', async () => {
      const res = await request(app)
        .get('/api/sidebar-categories')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 for authenticated assistant', async () => {
      const res = await request(app)
        .get('/api/sidebar-categories')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/sidebar-categories');

      expect(res.status).toBe(401);
    });

    it('should return created categories in the list', async () => {
      await createCategory({ label: 'My Category A' });
      await createCategory({ label: 'My Category B' });

      const res = await request(app)
        .get('/api/sidebar-categories')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const labels = res.body.data.map(c => c.label);
      expect(labels).toContain('My Category A');
      expect(labels).toContain('My Category B');
    });
  });

  // ========================================
  // POST /api/sidebar-categories
  // ========================================
  describe('POST /api/sidebar-categories', () => {
    it('should create a category for admin (201)', async () => {
      const res = await request(app)
        .post('/api/sidebar-categories')
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'New Category', icon: '📋', section: 'main' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('New Category');
      expect(res.body.data.icon).toBe('📋');
      expect(res.body.data.section).toBe('main');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.key).toBeDefined();
    });

    it('should assign section "settings" when section is settings', async () => {
      const res = await request(app)
        .post('/api/sidebar-categories')
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'Settings Cat', section: 'settings' });

      expect(res.status).toBe(201);
      expect(res.body.data.section).toBe('settings');
    });

    it('should default section to "main" for unknown section values', async () => {
      const res = await request(app)
        .post('/api/sidebar-categories')
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'Unknown Section Cat', section: 'unknown' });

      expect(res.status).toBe(201);
      expect(res.body.data.section).toBe('main');
    });

    it('should return 400 when label is missing', async () => {
      const res = await request(app)
        .post('/api/sidebar-categories')
        .set('Authorization', adminAuth.authHeader)
        .send({ icon: '📋', section: 'main' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const res = await request(app)
        .post('/api/sidebar-categories')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'Forbidden Cat', section: 'main' });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const res = await request(app)
        .post('/api/sidebar-categories')
        .set('Authorization', assistantAuth.authHeader)
        .send({ label: 'Forbidden Cat', section: 'main' });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/sidebar-categories')
        .send({ label: 'Unauth Cat', section: 'main' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/sidebar-categories/reorder
  // ========================================
  describe('PUT /api/sidebar-categories/reorder', () => {
    it('should reorder categories for admin (200)', async () => {
      const catA = await createCategory({ label: 'Cat Alpha' });
      const catB = await createCategory({ label: 'Cat Beta' });

      const res = await request(app)
        .put('/api/sidebar-categories/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({ section: 'main', orderedIds: [catB.id, catA.id] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 400 when section is missing', async () => {
      const res = await request(app)
        .put('/api/sidebar-categories/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({ orderedIds: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when orderedIds is not an array', async () => {
      const res = await request(app)
        .put('/api/sidebar-categories/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({ section: 'main', orderedIds: 'not-an-array' });

      expect(res.status).toBe(400);
    });

    it('should return 403 for dietitian', async () => {
      const res = await request(app)
        .put('/api/sidebar-categories/reorder')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ section: 'main', orderedIds: [] });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const res = await request(app)
        .put('/api/sidebar-categories/reorder')
        .set('Authorization', assistantAuth.authHeader)
        .send({ section: 'main', orderedIds: [] });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/sidebar-categories/reorder')
        .send({ section: 'main', orderedIds: [] });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/sidebar-categories/:id
  // ========================================
  describe('PUT /api/sidebar-categories/:id', () => {
    it('should update a category for admin (200)', async () => {
      const cat = await createCategory({ label: 'Original Label' });

      const res = await request(app)
        .put(`/api/sidebar-categories/${cat.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'Updated Label', icon: '✏️', is_default_open: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('Updated Label');
      expect(res.body.data.icon).toBe('✏️');
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';

      const res = await request(app)
        .put(`/api/sidebar-categories/${fakeId}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'Does Not Exist' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const cat = await createCategory({ label: 'Protected Cat' });

      const res = await request(app)
        .put(`/api/sidebar-categories/${cat.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'Try Update' });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const cat = await createCategory({ label: 'Protected Cat' });

      const res = await request(app)
        .put(`/api/sidebar-categories/${cat.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ label: 'Try Update' });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const cat = await createCategory({ label: 'Unauth Target' });

      const res = await request(app)
        .put(`/api/sidebar-categories/${cat.id}`)
        .send({ label: 'Try Update' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/sidebar-categories/:id
  // ========================================
  describe('DELETE /api/sidebar-categories/:id', () => {
    it('should delete a category for admin (200)', async () => {
      const cat = await createCategory({ label: 'To Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-categories/${cat.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Confirm it was deleted
      const listRes = await request(app)
        .get('/api/sidebar-categories')
        .set('Authorization', adminAuth.authHeader);
      expect(listRes.body.data.find(c => c.id === cat.id)).toBeUndefined();
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000002';

      const res = await request(app)
        .delete(`/api/sidebar-categories/${fakeId}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const cat = await createCategory({ label: 'Cannot Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-categories/${cat.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const cat = await createCategory({ label: 'Cannot Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-categories/${cat.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const cat = await createCategory({ label: 'Unauth Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-categories/${cat.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 409 when category has items assigned to it', async () => {
      const cat = await createCategory({ label: 'Has Items' });

      // Assign a SidebarMenuConfig item to this category's key
      await db.SidebarMenuConfig.create({
        item_key: 'test-item',
        section: 'main',
        display_order: 99,
        is_visible: true,
        allowed_roles: ['ADMIN', 'DIETITIAN'],
        category_key: cat.key
      });

      const res = await request(app)
        .delete(`/api/sidebar-categories/${cat.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });
});
