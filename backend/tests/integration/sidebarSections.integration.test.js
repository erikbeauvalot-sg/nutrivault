/**
 * Sidebar Sections Integration Tests
 * Tests for /api/sidebar-sections
 *
 * Routes:
 *   GET    /              - All authenticated users
 *   POST   /              - Admin only (requireRole('ADMIN'))
 *   PUT    /reorder       - Admin only
 *   PUT    /:id           - Admin only
 *   DELETE /:id           - Admin only
 *
 * Note: deleteSection returns 403 (not 400) for built-in sections ('main', 'settings').
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Sidebar Sections API', () => {
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

    // Manually clean sidebar sections (they may be present after testDb.reset())
    await db.SidebarSection.destroy({ where: {}, force: true });

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  // Helper: create a section via the API as admin
  async function createSection(overrides = {}) {
    const payload = {
      label: overrides.label || 'Test Section',
      icon: overrides.icon || '📂',
      is_default_open: overrides.is_default_open !== undefined ? overrides.is_default_open : true
    };
    const res = await request(app)
      .post('/api/sidebar-sections')
      .set('Authorization', adminAuth.authHeader)
      .send(payload);
    return res.body.data;
  }

  // Helper: create a section directly in DB (for testing built-in protection)
  async function createBuiltinSection(key, label) {
    return db.SidebarSection.create({
      key,
      label,
      icon: '🏠',
      display_order: 0,
      is_default_open: true
    });
  }

  // ========================================
  // GET /api/sidebar-sections
  // ========================================
  describe('GET /api/sidebar-sections', () => {
    it('should return 200 with empty array when no sections exist (admin)', async () => {
      const res = await request(app)
        .get('/api/sidebar-sections')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 for authenticated dietitian', async () => {
      const res = await request(app)
        .get('/api/sidebar-sections')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 200 for authenticated assistant', async () => {
      const res = await request(app)
        .get('/api/sidebar-sections')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/sidebar-sections');

      expect(res.status).toBe(401);
    });

    it('should return created sections in the list', async () => {
      await createSection({ label: 'Section Alpha' });
      await createSection({ label: 'Section Beta' });

      const res = await request(app)
        .get('/api/sidebar-sections')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const labels = res.body.data.map(s => s.label);
      expect(labels).toContain('Section Alpha');
      expect(labels).toContain('Section Beta');
    });
  });

  // ========================================
  // POST /api/sidebar-sections
  // ========================================
  describe('POST /api/sidebar-sections', () => {
    it('should create a section for admin (201)', async () => {
      const res = await request(app)
        .post('/api/sidebar-sections')
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'New Section', icon: '🗂️' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('New Section');
      expect(res.body.data.icon).toBe('🗂️');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.key).toBeDefined();
    });

    it('should auto-generate key from label', async () => {
      const res = await request(app)
        .post('/api/sidebar-sections')
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'My Cool Section' });

      expect(res.status).toBe(201);
      expect(res.body.data.key).toBe('my-cool-section');
    });

    it('should return 400 when label is missing', async () => {
      const res = await request(app)
        .post('/api/sidebar-sections')
        .set('Authorization', adminAuth.authHeader)
        .send({ icon: '📂' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const res = await request(app)
        .post('/api/sidebar-sections')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'Forbidden Section' });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const res = await request(app)
        .post('/api/sidebar-sections')
        .set('Authorization', assistantAuth.authHeader)
        .send({ label: 'Forbidden Section' });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/sidebar-sections')
        .send({ label: 'Unauth Section' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/sidebar-sections/reorder
  // ========================================
  describe('PUT /api/sidebar-sections/reorder', () => {
    it('should reorder sections for admin (200)', async () => {
      const secA = await createSection({ label: 'Section A' });
      const secB = await createSection({ label: 'Section B' });

      const res = await request(app)
        .put('/api/sidebar-sections/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({ orderedIds: [secB.id, secA.id] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 400 when orderedIds is not an array', async () => {
      const res = await request(app)
        .put('/api/sidebar-sections/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({ orderedIds: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const res = await request(app)
        .put('/api/sidebar-sections/reorder')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ orderedIds: [] });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const res = await request(app)
        .put('/api/sidebar-sections/reorder')
        .set('Authorization', assistantAuth.authHeader)
        .send({ orderedIds: [] });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/sidebar-sections/reorder')
        .send({ orderedIds: [] });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/sidebar-sections/:id
  // ========================================
  describe('PUT /api/sidebar-sections/:id', () => {
    it('should update a section for admin (200)', async () => {
      const sec = await createSection({ label: 'Original Label' });

      const res = await request(app)
        .put(`/api/sidebar-sections/${sec.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'Updated Label', icon: '✏️', is_default_open: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('Updated Label');
      expect(res.body.data.icon).toBe('✏️');
    });

    it('should return 404 for non-existent section', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';

      const res = await request(app)
        .put(`/api/sidebar-sections/${fakeId}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ label: 'Does Not Exist' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const sec = await createSection({ label: 'Protected Section' });

      const res = await request(app)
        .put(`/api/sidebar-sections/${sec.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ label: 'Try Update' });

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const sec = await createSection({ label: 'Protected Section' });

      const res = await request(app)
        .put(`/api/sidebar-sections/${sec.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ label: 'Try Update' });

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const sec = await createSection({ label: 'Unauth Target' });

      const res = await request(app)
        .put(`/api/sidebar-sections/${sec.id}`)
        .send({ label: 'Try Update' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/sidebar-sections/:id
  // ========================================
  describe('DELETE /api/sidebar-sections/:id', () => {
    it('should delete a custom section for admin (200)', async () => {
      const sec = await createSection({ label: 'To Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-sections/${sec.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Confirm it was deleted
      const listRes = await request(app)
        .get('/api/sidebar-sections')
        .set('Authorization', adminAuth.authHeader);
      expect(listRes.body.data.find(s => s.id === sec.id)).toBeUndefined();
    });

    it('should return 404 for non-existent section', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000002';

      const res = await request(app)
        .delete(`/api/sidebar-sections/${fakeId}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when attempting to delete built-in "main" section', async () => {
      const mainSection = await createBuiltinSection('main', 'Main');

      const res = await request(app)
        .delete(`/api/sidebar-sections/${mainSection.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when attempting to delete built-in "settings" section', async () => {
      const settingsSection = await createBuiltinSection('settings', 'Settings');

      const res = await request(app)
        .delete(`/api/sidebar-sections/${settingsSection.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 when section has categories assigned', async () => {
      const sec = await createSection({ label: 'Has Categories' });

      // Assign a category to this section
      await db.SidebarCategory.create({
        key: 'orphan-cat',
        label: 'Orphan Category',
        icon: '📁',
        section: sec.key,
        display_order: 1,
        is_default_open: true
      });

      const res = await request(app)
        .delete(`/api/sidebar-sections/${sec.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian', async () => {
      const sec = await createSection({ label: 'Cannot Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-sections/${sec.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant', async () => {
      const sec = await createSection({ label: 'Cannot Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-sections/${sec.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const sec = await createSection({ label: 'Unauth Delete' });

      const res = await request(app)
        .delete(`/api/sidebar-sections/${sec.id}`);

      expect(res.status).toBe(401);
    });
  });
});
