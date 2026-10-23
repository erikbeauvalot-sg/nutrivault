/**
 * Integration Tests for Analytics Routes
 * Routes: GET /health-trends, /financial-metrics, /communication-effectiveness, /patient-health-score/:patientId
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Analytics API', () => {
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

  describe('GET /api/analytics/health-trends', () => {
    it('should return health trends for admin', async () => {
      const res = await request(app)
        .get('/api/analytics/health-trends')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return health trends for dietitian with patients.read permission', async () => {
      const res = await request(app)
        .get('/api/analytics/health-trends')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept date range filters', async () => {
      const res = await request(app)
        .get('/api/analytics/health-trends?startDate=2025-01-01&endDate=2025-06-01')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/analytics/health-trends');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/analytics/financial-metrics', () => {
    it('should return financial metrics for admin', async () => {
      const res = await request(app)
        .get('/api/analytics/financial-metrics')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return financial metrics for dietitian with billing.read', async () => {
      const res = await request(app)
        .get('/api/analytics/financial-metrics')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should accept date range filters', async () => {
      const res = await request(app)
        .get('/api/analytics/financial-metrics?startDate=2025-01-01&endDate=2025-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/analytics/financial-metrics');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/analytics/communication-effectiveness', () => {
    it('should return communication effectiveness for admin', async () => {
      const res = await request(app)
        .get('/api/analytics/communication-effectiveness')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return communication effectiveness for dietitian', async () => {
      const res = await request(app)
        .get('/api/analytics/communication-effectiveness')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/analytics/communication-effectiveness');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/analytics/patient-health-score/:patientId', () => {
    let patient;

    beforeEach(async () => {
      const db = testDb.getDb();
      patient = await db.Patient.create({
        first_name: 'Test',
        last_name: 'Patient',
        email: 'patient@test.com',
        created_by: adminAuth.user.id
      });
      await db.SystemSetting.create({
        setting_key: 'patient_health_score_enabled',
        setting_value: 'true',
        data_type: 'boolean'
      });
    });

    it('should return health score for specific patient as admin', async () => {
      const res = await request(app)
        .get(`/api/analytics/patient-health-score/${patient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toBeNull();
    });

    it('should not compute the score when the feature is disabled', async () => {
      const db = testDb.getDb();
      await db.SystemSetting.update(
        { setting_value: 'false' },
        { where: { setting_key: 'patient_health_score_enabled' } }
      );
      const analyticsService = require('../../src/services/analytics.service');
      const spy = jest.spyOn(analyticsService, 'calculatePatientHealthScore');

      const res = await request(app)
        .get(`/api/analytics/patient-health-score/${patient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null, disabled: true });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should return health score for dietitian with patients.read', async () => {
      const res = await request(app)
        .get(`/api/analytics/patient-health-score/${patient.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/analytics/patient-health-score/${patient.id}`);

      expect(res.status).toBe(401);
    });
  });
});
