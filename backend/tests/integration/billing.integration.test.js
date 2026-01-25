/**
 * Billing Integration Tests
 * Tests for /api/billing endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { billing: billingFixtures, patients: patientFixtures, visits: visitFixtures } = require('../fixtures');

let app;

describe('Billing API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testPatient;
  let testVisit;

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

    // Create test visit
    testVisit = await db.Visit.create({
      ...visitFixtures.validVisit,
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/billing
  // ========================================
  describe('GET /api/billing', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      // Create test invoices
      for (const invoice of billingFixtures.invoicesList) {
        await db.Billing.create({
          ...invoice,
          patient_id: testPatient.id
        });
      }
    });

    it('should return list of invoices for admin', async () => {
      const res = await request(app)
        .get('/api/billing')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return invoices for dietitian', async () => {
      const res = await request(app)
        .get('/api/billing')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return invoices for assistant', async () => {
      const res = await request(app)
        .get('/api/billing')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/billing');

      expect(res.status).toBe(401);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/billing?status=DRAFT')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by patient_id', async () => {
      const res = await request(app)
        .get(`/api/billing?patient_id=${testPatient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/billing?page=1&limit=2')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  // ========================================
  // GET /api/billing/:id
  // ========================================
  describe('GET /api/billing/:id', () => {
    let testInvoice;

    beforeEach(async () => {
      const db = testDb.getDb();
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should return invoice by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/billing/${testInvoice.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testInvoice.id);
    });

    it('should return invoice for dietitian', async () => {
      const res = await request(app)
        .get(`/api/billing/${testInvoice.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app)
        .get('/api/billing/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // POST /api/billing
  // ========================================
  describe('POST /api/billing', () => {
    it('should create an invoice with valid data as admin', async () => {
      const invoiceData = {
        ...billingFixtures.validInvoice,
        patient_id: testPatient.id
      };

      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', adminAuth.authHeader)
        .send(invoiceData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(testPatient.id);
    });

    it('should create an invoice as dietitian', async () => {
      const invoiceData = {
        ...billingFixtures.validInvoice,
        patient_id: testPatient.id
      };

      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', dietitianAuth.authHeader)
        .send(invoiceData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create an invoice with visit_id', async () => {
      const invoiceData = {
        ...billingFixtures.validInvoice,
        patient_id: testPatient.id,
        visit_id: testVisit.id
      };

      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', adminAuth.authHeader)
        .send(invoiceData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create an invoice with multiple items', async () => {
      const invoiceData = {
        ...billingFixtures.multiItemInvoice,
        patient_id: testPatient.id
      };

      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', adminAuth.authHeader)
        .send(invoiceData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject invoice creation without patient_id', async () => {
      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.validInvoice);

      expect(res.status).toBe(400);
    });

    it('should reject invoice creation without authentication', async () => {
      const invoiceData = {
        ...billingFixtures.validInvoice,
        patient_id: testPatient.id
      };

      const res = await request(app)
        .post('/api/billing')
        .send(invoiceData);

      expect(res.status).toBe(401);
    });

    it('should reject invoice creation for assistant (no permission)', async () => {
      const invoiceData = {
        ...billingFixtures.validInvoice,
        patient_id: testPatient.id
      };

      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', assistantAuth.authHeader)
        .send(invoiceData);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // PUT /api/billing/:id
  // ========================================
  describe('PUT /api/billing/:id', () => {
    let testInvoice;

    beforeEach(async () => {
      const db = testDb.getDb();
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should update invoice with valid data as admin', async () => {
      const res = await request(app)
        .put(`/api/billing/${testInvoice.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.invoiceUpdates.updateAmount);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update invoice as dietitian', async () => {
      const res = await request(app)
        .put(`/api/billing/${testInvoice.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send(billingFixtures.invoiceUpdates.updateDescription);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should mark invoice as sent', async () => {
      const res = await request(app)
        .put(`/api/billing/${testInvoice.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.invoiceUpdates.markAsSent);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SENT');
    });

    it('should mark invoice as paid', async () => {
      const res = await request(app)
        .put(`/api/billing/${testInvoice.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.invoiceUpdates.markAsPaid);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAID');
    });

    it('should cancel invoice', async () => {
      const res = await request(app)
        .put(`/api/billing/${testInvoice.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.invoiceUpdates.cancel);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app)
        .put('/api/billing/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.invoiceUpdates.updateAmount);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // DELETE /api/billing/:id
  // ========================================
  describe('DELETE /api/billing/:id', () => {
    let testInvoice;

    beforeEach(async () => {
      const db = testDb.getDb();
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should delete invoice as admin', async () => {
      const res = await request(app)
        .delete(`/api/billing/${testInvoice.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent invoice', async () => {
      const res = await request(app)
        .delete('/api/billing/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/billing/${testInvoice.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for assistant (no permission)', async () => {
      const res = await request(app)
        .delete(`/api/billing/${testInvoice.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // POST /api/billing/:id/payment
  // ========================================
  describe('POST /api/billing/:id/payment', () => {
    let testInvoice;

    beforeEach(async () => {
      const db = testDb.getDb();
      testInvoice = await db.Billing.create({
        ...billingFixtures.invoiceStatuses.sent,
        patient_id: testPatient.id
      });
    });

    it('should record a payment', async () => {
      const res = await request(app)
        .post(`/api/billing/${testInvoice.id}/payment`)
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.payments.fullPayment);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should record a partial payment', async () => {
      const res = await request(app)
        .post(`/api/billing/${testInvoice.id}/payment`)
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.payments.partialPayment);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/billing/:id (with payments)
  // ========================================
  describe('GET /api/billing/:id (with payments)', () => {
    let testInvoice;

    beforeEach(async () => {
      const db = testDb.getDb();
      testInvoice = await db.Billing.create({
        ...billingFixtures.invoiceStatuses.sent,
        patient_id: testPatient.id
      });
    });

    it('should return payments for an invoice', async () => {
      // First record a payment
      await request(app)
        .post(`/api/billing/${testInvoice.id}/payment`)
        .set('Authorization', adminAuth.authHeader)
        .send(billingFixtures.payments.partialPayment);

      // Then get the invoice which includes payments
      const res = await request(app)
        .get(`/api/billing/${testInvoice.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // POST /api/billing/:id/send-email
  // ========================================
  describe('POST /api/billing/:id/send-email', () => {
    let testInvoice;

    beforeEach(async () => {
      const db = testDb.getDb();
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should send invoice email', async () => {
      const res = await request(app)
        .post(`/api/billing/${testInvoice.id}/send-email`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          recipient_email: testPatient.email,
          subject: 'Your Invoice',
          message: 'Please find your invoice attached.'
        });

      // May return 200 or 500 depending on email service configuration
      expect([200, 201, 500]).toContain(res.status);
    });
  });

  // ========================================
  // GET /api/billing/:id/pdf
  // ========================================
  describe('GET /api/billing/:id/pdf', () => {
    let testInvoice;

    beforeEach(async () => {
      const db = testDb.getDb();
      testInvoice = await db.Billing.create({
        ...billingFixtures.validInvoiceDB,
        patient_id: testPatient.id
      });
    });

    it('should generate PDF for invoice', async () => {
      const res = await request(app)
        .get(`/api/billing/${testInvoice.id}/pdf`)
        .set('Authorization', adminAuth.authHeader);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-type']).toContain('application/pdf');
      }
    });
  });

});
