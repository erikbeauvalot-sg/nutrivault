/**
 * Alerts Integration Tests
 * Tests for /api/alerts endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures, visits: visitFixtures } = require('../fixtures');

let app;

describe('Alerts API', () => {
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
  // GET /api/alerts
  // ========================================
  describe('GET /api/alerts', () => {
    it('should return 200 with alerts data for admin', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return correct top-level structure for admin', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data).toHaveProperty('overdue_invoices');
      expect(data).toHaveProperty('overdue_visits');
      expect(data).toHaveProperty('visits_without_notes');
      expect(data).toHaveProperty('patients_followup');
      expect(data).toHaveProperty('summary');

      expect(Array.isArray(data.overdue_invoices)).toBe(true);
      expect(Array.isArray(data.overdue_visits)).toBe(true);
      expect(Array.isArray(data.visits_without_notes)).toBe(true);
      expect(Array.isArray(data.patients_followup)).toBe(true);
    });

    it('should return correct summary shape for admin', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);

      const summary = res.body.data.summary;
      expect(summary).toHaveProperty('total_count');
      expect(summary).toHaveProperty('critical_count');
      expect(summary).toHaveProperty('warning_count');
      expect(typeof summary.total_count).toBe('number');
      expect(typeof summary.critical_count).toBe('number');
      expect(typeof summary.warning_count).toBe('number');
    });

    it('should return 200 with alerts data for dietitian', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 200 with alerts for assistant (only requires authenticate)', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/alerts');

      expect(res.status).toBe(401);
    });

    it('should return empty arrays when no data exists', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.overdue_invoices).toHaveLength(0);
      expect(res.body.data.summary.total_count).toBe(0);
    });

    it('should surface overdue invoices when they exist', async () => {
      const db = testDb.getDb();

      // Create a patient
      const patient = await db.Patient.create({
        ...patientFixtures.validPatient,
        is_active: true
      });

      // Create an overdue billing record (due date in the past)
      await db.Billing.create({
        patient_id: patient.id,
        invoice_number: 'INV-TEST-001',
        invoice_date: new Date('2025-01-01'),
        due_date: new Date('2025-01-15'),
        total_amount: 100.00,
        status: 'OVERDUE',
        is_active: true
      });

      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.overdue_invoices.length).toBeGreaterThan(0);
      expect(res.body.data.summary.total_count).toBeGreaterThan(0);
    });
  });
});
