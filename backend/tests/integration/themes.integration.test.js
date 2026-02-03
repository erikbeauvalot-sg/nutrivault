/**
 * Themes Export/Import Integration Tests
 * Tests for /api/themes/export and /api/themes/import endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Themes Export/Import API', () => {
  let adminAuth;
  let dietitianAuth;

  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
  });

  afterAll(async () => {
    await testDb.close();
  });

  // Helper to create a theme
  const createTestTheme = async (name = 'Test Theme', colors = { 'bs-primary': '#ff0000' }) => {
    const res = await request(app)
      .post('/api/themes')
      .set('Authorization', adminAuth.authHeader)
      .send({ name, description: 'A test theme', colors });
    return res.body.data;
  };

  // ========================================
  // POST /api/themes/export
  // ========================================
  describe('POST /api/themes/export', () => {
    it('should export all themes for admin', async () => {
      await createTestTheme('Export Theme A');
      await createTestTheme('Export Theme B');

      const res = await request(app)
        .post('/api/themes/export')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe('1.0');
      expect(res.body.data.exportDate).toBeDefined();
      expect(Array.isArray(res.body.data.themes)).toBe(true);
      expect(res.body.data.themes.length).toBeGreaterThanOrEqual(2);
    });

    it('should export specific themes by ID', async () => {
      const themeA = await createTestTheme('Specific A');
      await createTestTheme('Specific B');

      const res = await request(app)
        .post('/api/themes/export')
        .set('Authorization', adminAuth.authHeader)
        .send({ themeIds: [themeA.id] });

      expect(res.status).toBe(200);
      expect(res.body.data.themes.length).toBe(1);
      expect(res.body.data.themes[0].name).toBe('Specific A');
    });

    it('should return correct structure without IDs or timestamps', async () => {
      await createTestTheme('Structure Test');

      const res = await request(app)
        .post('/api/themes/export')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      const theme = res.body.data.themes.find(t => t.name === 'Structure Test');
      expect(theme).toBeDefined();
      expect(theme.name).toBe('Structure Test');
      expect(theme.colors).toBeDefined();
      // Should NOT have internal fields
      expect(theme.id).toBeUndefined();
      expect(theme.created_by).toBeUndefined();
      expect(theme.created_at).toBeUndefined();
      expect(theme.updated_at).toBeUndefined();
    });

    it('should reject non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/themes/export')
        .set('Authorization', dietitianAuth.authHeader)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // POST /api/themes/import
  // ========================================
  describe('POST /api/themes/import', () => {
    const validImportData = {
      version: '1.0',
      themes: [
        { name: 'Imported Theme X', description: 'Desc', colors: { 'bs-primary': '#123456' } },
        { name: 'Imported Theme Y', colors: { 'bs-primary': '#654321' } }
      ]
    };

    it('should import new themes for admin', async () => {
      const res = await request(app)
        .post('/api/themes/import')
        .set('Authorization', adminAuth.authHeader)
        .send({ importData: validImportData, options: { skipExisting: true } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results.created).toBe(2);
      expect(res.body.results.skipped).toBe(0);
    });

    it('should skip existing themes when skipExisting is true', async () => {
      await createTestTheme('Imported Theme X');

      const importData = {
        version: '1.0',
        themes: [
          { name: 'Imported Theme X', description: 'Desc', colors: { 'bs-primary': '#123456' } },
          { name: 'Imported Theme Y', colors: { 'bs-primary': '#654321' } }
        ]
      };

      const res = await request(app)
        .post('/api/themes/import')
        .set('Authorization', adminAuth.authHeader)
        .send({ importData, options: { skipExisting: true } });

      expect(res.status).toBe(200);
      expect(res.body.results.created).toBe(1);
      expect(res.body.results.skipped).toBe(1);
    });

    it('should create with suffix when skipExisting is false', async () => {
      await createTestTheme('Imported Theme X');

      const importData = {
        version: '1.0',
        themes: [
          { name: 'Imported Theme X', description: 'Desc', colors: { 'bs-primary': '#123456' } },
          { name: 'Imported Theme Y', colors: { 'bs-primary': '#654321' } }
        ]
      };

      const res = await request(app)
        .post('/api/themes/import')
        .set('Authorization', adminAuth.authHeader)
        .send({ importData, options: { skipExisting: false } });

      expect(res.status).toBe(200);
      expect(res.body.results.created).toBe(2);
      expect(res.body.results.skipped).toBe(0);

      // Verify the suffixed theme exists
      const listRes = await request(app)
        .get('/api/themes')
        .set('Authorization', adminAuth.authHeader);

      const names = listRes.body.data.map(t => t.name);
      expect(names).toContain('Imported Theme X (imported)');
    });

    it('should reject invalid data missing name or colors', async () => {
      const badImport = {
        version: '1.0',
        themes: [
          { description: 'no name or colors' }
        ]
      };

      const res = await request(app)
        .post('/api/themes/import')
        .set('Authorization', adminAuth.authHeader)
        .send({ importData: badImport, options: { skipExisting: true } });

      expect(res.status).toBe(200);
      expect(res.body.results.created).toBe(0);
      expect(res.body.results.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid structure (missing version)', async () => {
      const res = await request(app)
        .post('/api/themes/import')
        .set('Authorization', adminAuth.authHeader)
        .send({ importData: { themes: [] }, options: {} });

      expect(res.status).toBe(400);
    });

    it('should reject invalid structure (missing themes array)', async () => {
      const res = await request(app)
        .post('/api/themes/import')
        .set('Authorization', adminAuth.authHeader)
        .send({ importData: { version: '1.0' }, options: {} });

      expect(res.status).toBe(400);
    });

    it('should reject non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/themes/import')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ importData: validImportData, options: { skipExisting: true } });

      expect(res.status).toBe(403);
    });
  });
});
