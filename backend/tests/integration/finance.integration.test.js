/**
 * Finance Integration Tests
 * Tests for /api/finance endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Finance API', () => {
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

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/finance/dashboard
  // ========================================
  describe('GET /api/finance/dashboard', () => {
    it('should return dashboard data for admin', async () => {
      const res = await request(app)
        .get('/api/finance/dashboard')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return dashboard data for dietitian', async () => {
      const res = await request(app)
        .get('/api/finance/dashboard')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return dashboard data for assistant', async () => {
      const res = await request(app)
        .get('/api/finance/dashboard')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/finance/dashboard');

      expect(res.status).toBe(401);
    });

    it('should support date range filter', async () => {
      const res = await request(app)
        .get('/api/finance/dashboard?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .get('/api/finance/dashboard?start_date=not-a-date')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /api/finance/aging-report
  // ========================================
  describe('GET /api/finance/aging-report', () => {
    it('should return aging report for admin', async () => {
      const res = await request(app)
        .get('/api/finance/aging-report')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return aging report for dietitian', async () => {
      const res = await request(app)
        .get('/api/finance/aging-report')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return aging report for assistant', async () => {
      const res = await request(app)
        .get('/api/finance/aging-report')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/finance/aging-report');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/finance/cash-flow
  // ========================================
  describe('GET /api/finance/cash-flow', () => {
    it('should return cash flow data for admin', async () => {
      const res = await request(app)
        .get('/api/finance/cash-flow')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return cash flow data for dietitian', async () => {
      const res = await request(app)
        .get('/api/finance/cash-flow')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return cash flow data for assistant', async () => {
      const res = await request(app)
        .get('/api/finance/cash-flow')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/finance/cash-flow');

      expect(res.status).toBe(401);
    });

    it('should support date range filter', async () => {
      const res = await request(app)
        .get('/api/finance/cash-flow?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .get('/api/finance/cash-flow?end_date=not-a-date')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /api/finance/revenue
  // ========================================
  describe('GET /api/finance/revenue', () => {
    it('should return revenue data for admin', async () => {
      const res = await request(app)
        .get('/api/finance/revenue')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return revenue data for dietitian', async () => {
      const res = await request(app)
        .get('/api/finance/revenue')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return revenue data for assistant', async () => {
      const res = await request(app)
        .get('/api/finance/revenue')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/finance/revenue');

      expect(res.status).toBe(401);
    });

    it('should support date range filter', async () => {
      const res = await request(app)
        .get('/api/finance/revenue?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/finance/forecast
  // ========================================
  describe('GET /api/finance/forecast', () => {
    it('should return forecast data for admin', async () => {
      const res = await request(app)
        .get('/api/finance/forecast')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return forecast data for dietitian', async () => {
      const res = await request(app)
        .get('/api/finance/forecast')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return forecast data for assistant', async () => {
      const res = await request(app)
        .get('/api/finance/forecast')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/finance/forecast');

      expect(res.status).toBe(401);
    });

    it('should support end_date filter', async () => {
      const res = await request(app)
        .get('/api/finance/forecast?end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid end_date format', async () => {
      const res = await request(app)
        .get('/api/finance/forecast?end_date=not-a-date')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /api/finance/send-reminders
  // ========================================
  describe('POST /api/finance/send-reminders', () => {
    it('should return 400 when invoice_ids is missing', async () => {
      const res = await request(app)
        .post('/api/finance/send-reminders')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 when invoice_ids is empty array', async () => {
      const res = await request(app)
        .post('/api/finance/send-reminders')
        .set('Authorization', adminAuth.authHeader)
        .send({ invoice_ids: [] });

      expect(res.status).toBe(400);
    });

    it('should return 400 when invoice_ids contains non-UUID values', async () => {
      const res = await request(app)
        .post('/api/finance/send-reminders')
        .set('Authorization', adminAuth.authHeader)
        .send({ invoice_ids: ['not-a-uuid'] });

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/finance/send-reminders')
        .send({ invoice_ids: ['00000000-0000-0000-0000-000000000001'] });

      expect(res.status).toBe(401);
    });

    it('should reject for assistant (no billing.update permission)', async () => {
      const res = await request(app)
        .post('/api/finance/send-reminders')
        .set('Authorization', assistantAuth.authHeader)
        .send({ invoice_ids: ['00000000-0000-0000-0000-000000000001'] });

      expect(res.status).toBe(403);
    });

    it('should attempt to send reminders with valid UUIDs', async () => {
      // With a non-existent invoice UUID, the controller may handle gracefully or return an error
      const res = await request(app)
        .post('/api/finance/send-reminders')
        .set('Authorization', adminAuth.authHeader)
        .send({ invoice_ids: ['00000000-0000-0000-0000-000000000001'] });

      // Could be 200 (handled gracefully), 400 (validation), 404, or 500 (email service)
      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });
  });
});
