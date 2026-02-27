/**
 * Quotes Integration Tests
 * Tests for /api/quotes endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Quotes API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testClient;

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

    const db = testDb.getDb();
    testClient = await db.Client.create({
      client_type: 'person',
      first_name: 'Test',
      last_name: 'Client',
      email: 'test.client@example.com',
      created_by: adminAuth.user.id
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/quotes
  // ========================================
  describe('GET /api/quotes', () => {
    it('should return list for admin', async () => {
      const res = await request(app)
        .get('/api/quotes')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return list for dietitian', async () => {
      const res = await request(app)
        .get('/api/quotes')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return list for assistant (read permission)', async () => {
      const res = await request(app)
        .get('/api/quotes')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/quotes');

      expect(res.status).toBe(401);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/quotes?status=DRAFT')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by client_id', async () => {
      const res = await request(app)
        .get(`/api/quotes?client_id=${testClient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/quotes?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/quotes?page=1&limit=5')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject invalid status filter with 400', async () => {
      const res = await request(app)
        .get('/api/quotes?status=INVALID')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /api/quotes
  // ========================================
  describe('POST /api/quotes', () => {
    const validQuotePayload = () => ({
      client_id: null, // filled in beforeEach via testClient
      subject: 'Consultation nutritionnelle',
      quote_date: '2026-02-01',
      validity_date: '2026-03-01',
      tax_rate: 0,
      items: [
        { item_name: 'Consultation initiale', quantity: 1, unit_price: 75.00 }
      ]
    });

    it('should create a quote as admin', async () => {
      const payload = { ...validQuotePayload(), client_id: testClient.id };

      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', adminAuth.authHeader)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.client_id).toBe(testClient.id);
    });

    it('should create a quote as dietitian', async () => {
      const payload = { ...validQuotePayload(), client_id: testClient.id };

      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', dietitianAuth.authHeader)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create a quote with multiple items', async () => {
      const payload = {
        ...validQuotePayload(),
        client_id: testClient.id,
        items: [
          { item_name: 'Consultation initiale', quantity: 1, unit_price: 75.00 },
          { item_name: 'Suivi mensuel', quantity: 3, unit_price: 50.00 }
        ]
      };

      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', adminAuth.authHeader)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject quote without client_id', async () => {
      const payload = { ...validQuotePayload() };
      delete payload.client_id;

      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', adminAuth.authHeader)
        .send(payload);

      expect(res.status).toBe(400);
    });

    it('should reject quote with invalid client_id (not a UUID)', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', adminAuth.authHeader)
        .send({ ...validQuotePayload(), client_id: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });

    it('should reject quote without items array', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', adminAuth.authHeader)
        .send({ client_id: testClient.id, subject: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should reject quote with empty items array', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', adminAuth.authHeader)
        .send({ client_id: testClient.id, items: [] });

      expect(res.status).toBe(400);
    });

    it('should reject quote creation without authentication', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .send({ ...validQuotePayload(), client_id: testClient.id });

      expect(res.status).toBe(401);
    });

    it('should reject quote creation for assistant (no create permission)', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', assistantAuth.authHeader)
        .send({ ...validQuotePayload(), client_id: testClient.id });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/quotes/:id
  // ========================================
  describe('GET /api/quotes/:id', () => {
    let adminQuote;
    let dietitianQuote;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-001',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        subject: 'Admin Test Quote',
        status: 'DRAFT',
        amount_subtotal: 75.00,
        amount_tax: 0,
        amount_total: 75.00,
        tax_rate: 0,
        created_by: adminAuth.user.id
      });
      // Dietitian can only see quotes they created
      dietitianQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-001D',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        subject: 'Dietitian Test Quote',
        status: 'DRAFT',
        amount_subtotal: 50.00,
        amount_tax: 0,
        amount_total: 50.00,
        tax_rate: 0,
        created_by: dietitianAuth.user.id
      });
    });

    it('should return quote by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/quotes/${adminQuote.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(adminQuote.id);
    });

    it('should return own quote for dietitian', async () => {
      const res = await request(app)
        .get(`/api/quotes/${dietitianQuote.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for assistant with no linked dietitians (scoping)', async () => {
      // Assistant has no linked dietitians in test setup
      const res = await request(app)
        .get(`/api/quotes/${adminQuote.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent quote', async () => {
      const res = await request(app)
        .get('/api/quotes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/quotes/not-a-uuid')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get(`/api/quotes/${adminQuote.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/quotes/:id
  // ========================================
  describe('PUT /api/quotes/:id', () => {
    let adminQuote;
    let dietitianQuote;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-002',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        subject: 'Original Subject',
        status: 'DRAFT',
        amount_subtotal: 75.00,
        amount_tax: 0,
        amount_total: 75.00,
        tax_rate: 0,
        created_by: adminAuth.user.id
      });
      // Dietitian can only update their own quotes
      dietitianQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-002D',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        subject: 'Dietitian Quote',
        status: 'DRAFT',
        amount_subtotal: 60.00,
        amount_tax: 0,
        amount_total: 60.00,
        tax_rate: 0,
        created_by: dietitianAuth.user.id
      });
    });

    it('should update quote as admin', async () => {
      const res = await request(app)
        .put(`/api/quotes/${adminQuote.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ subject: 'Updated Subject', validity_date: '2026-04-01' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update own quote as dietitian', async () => {
      const res = await request(app)
        .put(`/api/quotes/${dietitianQuote.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ subject: 'Dietitian Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent quote', async () => {
      const res = await request(app)
        .put('/api/quotes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send({ subject: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/quotes/${adminQuote.id}`)
        .send({ subject: 'Updated' });

      expect(res.status).toBe(401);
    });

    it('should reject update for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/quotes/${adminQuote.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ subject: 'Updated' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/quotes/:id
  // ========================================
  describe('DELETE /api/quotes/:id', () => {
    let adminQuote;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-003',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        status: 'DRAFT',
        amount_subtotal: 50.00,
        amount_tax: 0,
        amount_total: 50.00,
        tax_rate: 0,
        created_by: adminAuth.user.id
      });
    });

    it('should delete quote as admin', async () => {
      const res = await request(app)
        .delete(`/api/quotes/${adminQuote.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent quote', async () => {
      const res = await request(app)
        .delete('/api/quotes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/quotes/${adminQuote.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for assistant (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/quotes/${adminQuote.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // PATCH /api/quotes/:id/status
  // ========================================
  describe('PATCH /api/quotes/:id/status', () => {
    let draftQuote;
    let sentQuote;

    beforeEach(async () => {
      const db = testDb.getDb();
      draftQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-004',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        status: 'DRAFT',
        amount_subtotal: 75.00,
        amount_tax: 0,
        amount_total: 75.00,
        tax_rate: 0,
        created_by: adminAuth.user.id
      });
      // A SENT quote for ACCEPTED/DECLINED transitions
      sentQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-004S',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        status: 'SENT',
        amount_subtotal: 75.00,
        amount_tax: 0,
        amount_total: 75.00,
        tax_rate: 0,
        created_by: adminAuth.user.id
      });
    });

    it('should change status from DRAFT to SENT', async () => {
      const res = await request(app)
        .patch(`/api/quotes/${draftQuote.id}/status`)
        .set('Authorization', adminAuth.authHeader)
        .send({ status: 'SENT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SENT');
    });

    it('should change status from SENT to ACCEPTED', async () => {
      const res = await request(app)
        .patch(`/api/quotes/${sentQuote.id}/status`)
        .set('Authorization', adminAuth.authHeader)
        .send({ status: 'ACCEPTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should change status to DECLINED with reason', async () => {
      const res = await request(app)
        .patch(`/api/quotes/${sentQuote.id}/status`)
        .set('Authorization', adminAuth.authHeader)
        .send({ status: 'DECLINED', declined_reason: 'Budget constraints' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid status value (DRAFT not a valid transition)', async () => {
      const res = await request(app)
        .patch(`/api/quotes/${draftQuote.id}/status`)
        .set('Authorization', adminAuth.authHeader)
        .send({ status: 'DRAFT' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .patch(`/api/quotes/${draftQuote.id}/status`)
        .send({ status: 'SENT' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST /api/quotes/:id/duplicate
  // ========================================
  describe('POST /api/quotes/:id/duplicate', () => {
    let testQuote;

    beforeEach(async () => {
      const db = testDb.getDb();
      testQuote = await db.Quote.create({
        client_id: testClient.id,
        quote_number: 'Q-TEST-005',
        quote_date: new Date('2026-02-01'),
        validity_date: new Date('2026-03-01'),
        status: 'DRAFT',
        amount_subtotal: 75.00,
        amount_tax: 0,
        amount_total: 75.00,
        tax_rate: 0,
        created_by: adminAuth.user.id
      });
    });

    it('should duplicate a quote as admin', async () => {
      const res = await request(app)
        .post(`/api/quotes/${testQuote.id}/duplicate`)
        .set('Authorization', adminAuth.authHeader);

      // duplicateQuote controller uses res.json() (200), not res.status(201)
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).not.toBe(testQuote.id);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/quotes/${testQuote.id}/duplicate`);

      expect(res.status).toBe(401);
    });
  });
});
