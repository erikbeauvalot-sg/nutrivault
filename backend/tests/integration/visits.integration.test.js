/**
 * Visits Integration Tests
 * Tests for /api/visits endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { visits: visitFixtures, patients: patientFixtures } = require('../fixtures');

let app;

describe('Visits API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testPatient;

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

    // Create test patient
    const db = testDb.getDb();
    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      assigned_dietitian_id: dietitianAuth.user.id
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/visits
  // ========================================
  describe('GET /api/visits', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      // Create test visits
      for (const visit of visitFixtures.visitTimeline) {
        await db.Visit.create({
          ...visit,
          patient_id: testPatient.id,
          dietitian_id: dietitianAuth.user.id
        });
      }
    });

    it('should return list of visits for admin', async () => {
      const res = await request(app)
        .get('/api/visits')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return visits for dietitian', async () => {
      const res = await request(app)
        .get('/api/visits')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return visits for assistant', async () => {
      const res = await request(app)
        .get('/api/visits')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/visits');

      expect(res.status).toBe(401);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/visits?status=SCHEDULED')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by patient_id', async () => {
      const res = await request(app)
        .get(`/api/visits?patient_id=${testPatient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/visits?page=1&limit=2')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  // ========================================
  // GET /api/visits/:id
  // ========================================
  describe('GET /api/visits/:id', () => {
    let testVisit;

    beforeEach(async () => {
      const db = testDb.getDb();
      testVisit = await db.Visit.create({
        ...visitFixtures.validVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    it('should return visit by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/visits/${testVisit.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testVisit.id);
    });

    it('should return visit for assigned dietitian', async () => {
      const res = await request(app)
        .get(`/api/visits/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .get('/api/visits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/visits/invalid-id')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /api/visits
  // ========================================
  describe('POST /api/visits', () => {
    it('should create a visit with valid data as admin', async () => {
      const visitData = {
        ...visitFixtures.validVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      };

      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', adminAuth.authHeader)
        .send(visitData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(testPatient.id);
    });

    it('should create a visit as dietitian', async () => {
      const visitData = {
        ...visitFixtures.validVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      };

      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', dietitianAuth.authHeader)
        .send(visitData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create minimal visit', async () => {
      const visitData = {
        ...visitFixtures.minimalVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      };

      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', adminAuth.authHeader)
        .send(visitData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject visit creation without patient_id', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', adminAuth.authHeader)
        .send(visitFixtures.validVisit);

      expect(res.status).toBe(400);
    });

    it('should reject visit creation without authentication', async () => {
      const visitData = {
        ...visitFixtures.validVisit,
        patient_id: testPatient.id
      };

      const res = await request(app)
        .post('/api/visits')
        .send(visitData);

      expect(res.status).toBe(401);
    });

    it('should reject visit creation for assistant (no permission)', async () => {
      const visitData = {
        ...visitFixtures.validVisit,
        patient_id: testPatient.id
      };

      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', assistantAuth.authHeader)
        .send(visitData);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // PUT /api/visits/:id
  // ========================================
  describe('PUT /api/visits/:id', () => {
    let testVisit;

    beforeEach(async () => {
      const db = testDb.getDb();
      testVisit = await db.Visit.create({
        ...visitFixtures.validVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    it('should update visit with valid data as admin', async () => {
      const res = await request(app)
        .put(`/api/visits/${testVisit.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(visitFixtures.visitUpdates.reschedule);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update visit as assigned dietitian', async () => {
      const res = await request(app)
        .put(`/api/visits/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send(visitFixtures.visitUpdates.addNotes);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should complete a visit', async () => {
      const res = await request(app)
        .put(`/api/visits/${testVisit.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(visitFixtures.visitUpdates.complete);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('should cancel a visit', async () => {
      const res = await request(app)
        .put(`/api/visits/${testVisit.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(visitFixtures.visitUpdates.cancel);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .put('/api/visits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send(visitFixtures.visitUpdates.reschedule);

      expect(res.status).toBe(404);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/visits/${testVisit.id}`)
        .send(visitFixtures.visitUpdates.reschedule);

      expect(res.status).toBe(401);
    });

    it('should reject update for assistant (no permission)', async () => {
      const res = await request(app)
        .put(`/api/visits/${testVisit.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send(visitFixtures.visitUpdates.reschedule);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/visits/:id
  // ========================================
  describe('DELETE /api/visits/:id', () => {
    let testVisit;

    beforeEach(async () => {
      const db = testDb.getDb();
      testVisit = await db.Visit.create({
        ...visitFixtures.validVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    it('should delete visit as admin', async () => {
      const res = await request(app)
        .delete(`/api/visits/${testVisit.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .delete('/api/visits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/visits/${testVisit.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for assistant (no permission)', async () => {
      const res = await request(app)
        .delete(`/api/visits/${testVisit.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // POST /api/visits/:id/finish-and-invoice
  // ========================================
  describe('POST /api/visits/:id/finish-and-invoice', () => {
    let testVisit;
    let testVisitType;

    beforeEach(async () => {
      const db = testDb.getDb();

      // Create a visit type with default price
      testVisitType = await db.VisitType.findOne({
        where: { name: 'Consultation initiale' }
      });

      // If not found, create it
      if (!testVisitType) {
        testVisitType = await db.VisitType.create({
          name: 'Consultation initiale',
          description: 'First consultation',
          default_price: 80.00,
          duration_minutes: 60,
          is_active: true
        });
      }

      // Create a visit with this visit type
      testVisit = await db.Visit.create({
        ...visitFixtures.validVisit,
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_type: 'Consultation initiale',
        status: 'SCHEDULED'
      });
    });

    it('should complete visit and create invoice with visit type price', async () => {
      const res = await request(app)
        .post(`/api/visits/${testVisit.id}/finish-and-invoice`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          markCompleted: true,
          generateInvoice: true,
          sendEmail: false
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actions.markCompleted).toBe(true);
      expect(res.body.data.actions.generateInvoice).toBe(true);
      expect(res.body.data.invoice).toBeTruthy();
      // Check that invoice amount matches visit type default_price
      expect(parseFloat(res.body.data.invoice.amount_total)).toBe(80.00);
    });

    it('should mark visit as COMPLETED', async () => {
      const res = await request(app)
        .post(`/api/visits/${testVisit.id}/finish-and-invoice`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          markCompleted: true,
          generateInvoice: false
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.visit.status).toBe('COMPLETED');
    });

    it('should return existing invoice if one already exists', async () => {
      const db = testDb.getDb();

      // First, create an invoice for this visit with all required fields
      await db.Billing.create({
        patient_id: testPatient.id,
        visit_id: testVisit.id,
        invoice_number: 'INV-TEST-001',
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        service_description: 'Test Invoice',
        amount_total: 100.00,
        amount_due: 100.00,
        status: 'DRAFT',
        is_active: true
      });

      const res = await request(app)
        .post(`/api/visits/${testVisit.id}/finish-and-invoice`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          markCompleted: true,
          generateInvoice: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Should return the existing invoice
      expect(res.body.data.invoice.invoice_number).toBe('INV-TEST-001');
    });

    it('should reject for already completed visit', async () => {
      // Complete the visit first
      testVisit.status = 'COMPLETED';
      await testVisit.save();

      const res = await request(app)
        .post(`/api/visits/${testVisit.id}/finish-and-invoice`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          markCompleted: true,
          generateInvoice: true
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .post('/api/visits/00000000-0000-0000-0000-000000000000/finish-and-invoice')
        .set('Authorization', adminAuth.authHeader)
        .send({
          markCompleted: true,
          generateInvoice: true
        });

      expect(res.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post(`/api/visits/${testVisit.id}/finish-and-invoice`)
        .send({
          markCompleted: true,
          generateInvoice: true
        });

      expect(res.status).toBe(401);
    });

    it('should allow dietitian to finish own patient visit', async () => {
      const res = await request(app)
        .post(`/api/visits/${testVisit.id}/finish-and-invoice`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          markCompleted: true,
          generateInvoice: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
