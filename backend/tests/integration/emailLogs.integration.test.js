/**
 * Integration Tests for Email Logs Routes
 * Routes: GET /api/email-logs/types, GET /api/email-logs/:id
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Email Logs API', () => {
  let adminAuth, dietitianAuth;

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
  });

  describe('GET /api/email-logs/types', () => {
    it('should return email types for authenticated admin', async () => {
      const res = await request(app)
        .get('/api/email-logs/types')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return email types for authenticated dietitian', async () => {
      const res = await request(app)
        .get('/api/email-logs/types')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/email-logs/types');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/email-logs/:id', () => {
    let emailLog;

    beforeEach(async () => {
      const db = testDb.getDb();
      // Create a patient for the email log
      const patient = await db.Patient.create({
        first_name: 'Test',
        last_name: 'Patient',
        email: 'patient@test.com',
        created_by: adminAuth.user.id
      });

      emailLog = await db.EmailLog.create({
        sent_to: 'patient@test.com',
        template_slug: 'test-template',
        subject: 'Test Email',
        email_type: 'followup',
        status: 'sent',
        patient_id: patient.id,
        sent_by: adminAuth.user.id
      });
    });

    it('should return email log by ID for authenticated user', async () => {
      const res = await request(app)
        .get(`/api/email-logs/${emailLog.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(emailLog.id);
    });

    it('should return 404 for non-existent email log', async () => {
      const res = await request(app)
        .get('/api/email-logs/99999')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/email-logs/${emailLog.id}`);

      expect(res.status).toBe(401);
    });
  });
});
