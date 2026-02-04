/**
 * Integration Tests for Page Views Routes
 * Routes: POST /api/page-views/track (public), GET /api/page-views/stats, GET /api/page-views/recent
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Page Views API', () => {
  let adminAuth, dietitianAuth, assistantAuth;

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

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  describe('POST /api/page-views/track', () => {
    it('should track a page view without authentication', async () => {
      const res = await request(app)
        .post('/api/page-views/track')
        .send({
          page_path: '/mariondiet',
          visitor_id: 'visitor-123',
          session_id: 'session-abc'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it('should track page view with UTM parameters', async () => {
      const res = await request(app)
        .post('/api/page-views/track')
        .send({
          page_path: '/mariondiet',
          visitor_id: 'visitor-456',
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'spring-2025'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should track page view with referrer', async () => {
      const res = await request(app)
        .post('/api/page-views/track')
        .send({
          page_path: '/mariondiet',
          visitor_id: 'visitor-789',
          referrer: 'https://google.com'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when page_path is missing', async () => {
      const res = await request(app)
        .post('/api/page-views/track')
        .send({
          visitor_id: 'visitor-000'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/page-views/stats', () => {
    beforeEach(async () => {
      // Seed some page views
      const db = testDb.getDb();
      await db.PageView.bulkCreate([
        { page_path: '/mariondiet', visitor_id: 'v1', device_type: 'desktop', browser: 'Chrome', os: 'Windows' },
        { page_path: '/mariondiet', visitor_id: 'v2', device_type: 'mobile', browser: 'Safari', os: 'iOS' },
        { page_path: '/mariondiet/about', visitor_id: 'v1', device_type: 'desktop', browser: 'Chrome', os: 'Windows' }
      ]);
    });

    it('should return stats for admin', async () => {
      const res = await request(app)
        .get('/api/page-views/stats')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalViews).toBeDefined();
      expect(res.body.data.uniqueVisitors).toBeDefined();
      expect(res.body.data.viewsByDevice).toBeDefined();
      expect(res.body.data.viewsByBrowser).toBeDefined();
      expect(res.body.data.viewsByPage).toBeDefined();
    });

    it('should return stats for dietitian', async () => {
      const res = await request(app)
        .get('/api/page-views/stats')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalViews).toBe(3);
    });

    it('should filter stats by page_path', async () => {
      const res = await request(app)
        .get('/api/page-views/stats?page_path=/mariondiet/about')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalViews).toBe(1);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/page-views/stats');

      expect(res.status).toBe(401);
    });

    it('should reject assistant role', async () => {
      const res = await request(app)
        .get('/api/page-views/stats')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/page-views/recent', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      await db.PageView.bulkCreate([
        { page_path: '/mariondiet', visitor_id: 'v1', device_type: 'desktop', browser: 'Chrome', os: 'Windows' },
        { page_path: '/mariondiet', visitor_id: 'v2', device_type: 'mobile', browser: 'Safari', os: 'iOS' }
      ]);
    });

    it('should return recent page views for admin', async () => {
      const res = await request(app)
        .get('/api/page-views/recent')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should return recent page views for dietitian', async () => {
      const res = await request(app)
        .get('/api/page-views/recent')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/page-views/recent');

      expect(res.status).toBe(401);
    });

    it('should reject assistant role', async () => {
      const res = await request(app)
        .get('/api/page-views/recent')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
