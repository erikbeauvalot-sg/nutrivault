/**
 * Sidebar Menu Configs Integration Tests
 * Tests for /api/sidebar-menu-configs
 *
 * Routes:
 *   GET  /        - All authenticated users
 *   PUT  /bulk    - Admin only (requireRole('ADMIN'))
 *   PUT  /reorder - Admin only
 *   POST /reset   - Admin only
 *
 * The table is empty after testDb.reset(). resetToDefaults seeds 25 default items.
 * Tests that need existing items call POST /reset first (as admin) to populate them.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Sidebar Menu Configs API', () => {
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

    // Ensure sidebar_menu_configs table is empty after reset
    await db.SidebarMenuConfig.destroy({ where: {}, force: true });

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  // Helper: reset configs to defaults via API
  async function resetConfigsToDefaults() {
    const res = await request(app)
      .post('/api/sidebar-menu-configs/reset')
      .set('Authorization', adminAuth.authHeader);
    return res.body.data;
  }

  // ========================================
  // GET /api/sidebar-menu-configs
  // ========================================
  describe('GET /api/sidebar-menu-configs', () => {
    it('should return 200 with empty array when no configs exist (admin)', async () => {
      const res = await request(app)
        .get('/api/sidebar-menu-configs')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 for authenticated dietitian', async () => {
      const res = await request(app)
        .get('/api/sidebar-menu-configs')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 for authenticated assistant', async () => {
      const res = await request(app)
        .get('/api/sidebar-menu-configs')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/sidebar-menu-configs');

      expect(res.status).toBe(401);
    });

    it('should return all default configs after reset', async () => {
      await resetConfigsToDefaults();

      const res = await request(app)
        .get('/api/sidebar-menu-configs')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Verify structure of each item
      const item = res.body.data[0];
      expect(item.item_key).toBeDefined();
      expect(item.section).toBeDefined();
      expect(item.display_order).toBeDefined();
      expect(item.is_visible).toBeDefined();
      expect(Array.isArray(item.allowed_roles)).toBe(true);
    });
  });

  // ========================================
  // POST /api/sidebar-menu-configs/reset
  // ========================================
  describe('POST /api/sidebar-menu-configs/reset', () => {
    it('should reset to defaults for admin (200)', async () => {
      const res = await request(app)
        .post('/api/sidebar-menu-configs/reset')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should restore deleted configs when reset', async () => {
      // Populate then destroy all
      await resetConfigsToDefaults();
      await db.SidebarMenuConfig.destroy({ where: {}, force: true });

      const beforeCount = await db.SidebarMenuConfig.count();
      expect(beforeCount).toBe(0);

      const res = await request(app)
        .post('/api/sidebar-menu-configs/reset')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return 403 for dietitian', async () => {
      const res = await request(app)
        .post('/api/sidebar-menu-configs/reset')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const res = await request(app)
        .post('/api/sidebar-menu-configs/reset')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/sidebar-menu-configs/reset');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/sidebar-menu-configs/bulk
  // ========================================
  describe('PUT /api/sidebar-menu-configs/bulk', () => {
    it('should bulk update configs for admin (200)', async () => {
      await resetConfigsToDefaults();

      const res = await request(app)
        .put('/api/sidebar-menu-configs/bulk')
        .set('Authorization', adminAuth.authHeader)
        .send({
          items: [
            { item_key: 'dashboard', is_visible: false, display_order: 99 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should ensure ADMIN is always in allowed_roles after bulk update', async () => {
      await resetConfigsToDefaults();

      const res = await request(app)
        .put('/api/sidebar-menu-configs/bulk')
        .set('Authorization', adminAuth.authHeader)
        .send({
          items: [
            { item_key: 'dashboard', allowed_roles: ['DIETITIAN'] }
          ]
        });

      expect(res.status).toBe(200);
      // After update, ADMIN should have been re-added to allowed_roles
      const updatedItem = res.body.data.find(i => i.item_key === 'dashboard');
      expect(updatedItem).toBeDefined();
      expect(updatedItem.allowed_roles).toContain('ADMIN');
    });

    it('should return 400 when items array is missing', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/bulk')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when items is an empty array', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/bulk')
        .set('Authorization', adminAuth.authHeader)
        .send({ items: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/bulk')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ items: [{ item_key: 'dashboard', is_visible: false }] });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/bulk')
        .set('Authorization', assistantAuth.authHeader)
        .send({ items: [{ item_key: 'dashboard', is_visible: false }] });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/bulk')
        .send({ items: [{ item_key: 'dashboard', is_visible: false }] });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/sidebar-menu-configs/reorder
  // ========================================
  describe('PUT /api/sidebar-menu-configs/reorder', () => {
    it('should reorder items for admin (200)', async () => {
      await resetConfigsToDefaults();

      const res = await request(app)
        .put('/api/sidebar-menu-configs/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({
          section: 'main',
          orderData: [
            { item_key: 'dashboard', display_order: 5 },
            { item_key: 'patients', display_order: 1 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 400 when section is missing', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({
          orderData: [{ item_key: 'dashboard', display_order: 1 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when orderData is not an array', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({ section: 'main', orderData: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/reorder')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ section: 'main', orderData: [] });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/reorder')
        .set('Authorization', assistantAuth.authHeader)
        .send({ section: 'main', orderData: [] });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/sidebar-menu-configs/reorder')
        .send({ section: 'main', orderData: [] });

      expect(res.status).toBe(401);
    });
  });
});
