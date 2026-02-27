/**
 * Accounting Entries Integration Tests
 * Tests for /api/accounting-entries endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Accounting Entries API', () => {
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
  // GET /api/accounting-entries/summary
  // ========================================
  describe('GET /api/accounting-entries/summary', () => {
    it('should return summary for admin', async () => {
      const res = await request(app)
        .get('/api/accounting-entries/summary')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return summary for dietitian', async () => {
      const res = await request(app)
        .get('/api/accounting-entries/summary')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return summary for assistant', async () => {
      const res = await request(app)
        .get('/api/accounting-entries/summary')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/accounting-entries/summary');

      expect(res.status).toBe(401);
    });

    it('should support date range filter', async () => {
      const res = await request(app)
        .get('/api/accounting-entries/summary?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/accounting-entries
  // ========================================
  describe('GET /api/accounting-entries', () => {
    it('should return list for admin', async () => {
      const res = await request(app)
        .get('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return list for dietitian', async () => {
      const res = await request(app)
        .get('/api/accounting-entries')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return list for assistant (read permission)', async () => {
      const res = await request(app)
        .get('/api/accounting-entries')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/accounting-entries');

      expect(res.status).toBe(401);
    });

    it('should filter by entry_type CREDIT', async () => {
      const res = await request(app)
        .get('/api/accounting-entries?entry_type=CREDIT')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by entry_type DEBIT', async () => {
      const res = await request(app)
        .get('/api/accounting-entries?entry_type=DEBIT')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/accounting-entries?category=revenue')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/accounting-entries?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support search', async () => {
      const res = await request(app)
        .get('/api/accounting-entries?search=paiement')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/accounting-entries?page=1&limit=5')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject invalid entry_type filter with 400', async () => {
      const res = await request(app)
        .get('/api/accounting-entries?entry_type=INVALID')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /api/accounting-entries
  // ========================================
  describe('POST /api/accounting-entries', () => {
    const validCreditEntry = {
      description: 'Paiement consultation patient',
      amount: 75.00,
      entry_type: 'CREDIT',
      entry_date: '2026-02-01',
      category: 'revenue'
    };

    const validDebitEntry = {
      description: 'Achat materiel',
      amount: 120.50,
      entry_type: 'DEBIT',
      entry_date: '2026-02-01',
      category: 'equipment'
    };

    it('should create a CREDIT entry as admin', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send(validCreditEntry);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entry_type).toBe('CREDIT');
      expect(parseFloat(res.body.data.amount)).toBe(validCreditEntry.amount);
    });

    it('should create a DEBIT entry as admin', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send(validDebitEntry);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entry_type).toBe('DEBIT');
    });

    it('should create an entry as dietitian', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', dietitianAuth.authHeader)
        .send(validCreditEntry);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create an entry with all optional fields', async () => {
      const fullEntry = {
        ...validCreditEntry,
        reference: 'INV-2026-001',
        notes: 'Reglement par virement bancaire'
      };

      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send(fullEntry);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reference).toBe('INV-2026-001');
    });

    it('should reject entry without description', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send({ amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject entry without amount', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', entry_type: 'CREDIT', entry_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject entry without entry_type', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', amount: 100, entry_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject entry with invalid entry_type', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', amount: 100, entry_type: 'TRANSFER', entry_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject entry without entry_date', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', amount: 100, entry_type: 'CREDIT' });

      expect(res.status).toBe(400);
    });

    it('should reject entry creation without authentication', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .send(validCreditEntry);

      expect(res.status).toBe(401);
    });

    it('should reject entry creation for assistant (no create permission)', async () => {
      const res = await request(app)
        .post('/api/accounting-entries')
        .set('Authorization', assistantAuth.authHeader)
        .send(validCreditEntry);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/accounting-entries/:id
  // ========================================
  describe('GET /api/accounting-entries/:id', () => {
    let adminEntry;
    let dietitianEntry;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminEntry = await db.AccountingEntry.create({
        description: 'Test entry for read',
        amount: 200.00,
        entry_type: 'CREDIT',
        entry_date: '2026-02-01',
        created_by: adminAuth.user.id
      });
      // Dietitian can only see their own entries
      dietitianEntry = await db.AccountingEntry.create({
        description: 'Dietitian test entry',
        amount: 100.00,
        entry_type: 'CREDIT',
        entry_date: '2026-02-01',
        created_by: dietitianAuth.user.id
      });
    });

    it('should return entry by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/accounting-entries/${adminEntry.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(adminEntry.id);
    });

    it('should return own entry for dietitian', async () => {
      const res = await request(app)
        .get(`/api/accounting-entries/${dietitianEntry.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for assistant with no linked dietitians (scoping)', async () => {
      // Assistant has no linked dietitians in test setup
      const res = await request(app)
        .get(`/api/accounting-entries/${adminEntry.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent entry', async () => {
      const res = await request(app)
        .get('/api/accounting-entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/accounting-entries/not-a-uuid')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get(`/api/accounting-entries/${adminEntry.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/accounting-entries/:id
  // ========================================
  describe('PUT /api/accounting-entries/:id', () => {
    let adminEntry;
    let dietitianEntry;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminEntry = await db.AccountingEntry.create({
        description: 'Entry to update',
        amount: 300.00,
        entry_type: 'DEBIT',
        entry_date: '2026-02-01',
        created_by: adminAuth.user.id
      });
      // Dietitian can only update their own entries
      dietitianEntry = await db.AccountingEntry.create({
        description: 'Dietitian entry to update',
        amount: 150.00,
        entry_type: 'DEBIT',
        entry_date: '2026-02-01',
        created_by: dietitianAuth.user.id
      });
    });

    it('should update entry as admin', async () => {
      const res = await request(app)
        .put(`/api/accounting-entries/${adminEntry.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          description: 'Entry updated',
          amount: 350.00,
          entry_type: 'DEBIT',
          entry_date: '2026-02-15'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update own entry as dietitian', async () => {
      const res = await request(app)
        .put(`/api/accounting-entries/${dietitianEntry.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          description: 'Dietitian updated entry',
          amount: 160.00,
          entry_type: 'DEBIT',
          entry_date: '2026-02-01'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent entry', async () => {
      const res = await request(app)
        .put('/api/accounting-entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send({
          description: 'Updated',
          amount: 100,
          entry_type: 'CREDIT',
          entry_date: '2026-02-01'
        });

      expect(res.status).toBe(404);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/accounting-entries/${adminEntry.id}`)
        .send({ description: 'Updated', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01' });

      expect(res.status).toBe(401);
    });

    it('should reject update for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/accounting-entries/${adminEntry.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ description: 'Updated', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/accounting-entries/:id
  // ========================================
  describe('DELETE /api/accounting-entries/:id', () => {
    let testEntry;

    beforeEach(async () => {
      const db = testDb.getDb();
      testEntry = await db.AccountingEntry.create({
        description: 'Entry to delete',
        amount: 150.00,
        entry_type: 'CREDIT',
        entry_date: '2026-02-01',
        created_by: adminAuth.user.id
      });
    });

    it('should delete entry as admin', async () => {
      const res = await request(app)
        .delete(`/api/accounting-entries/${testEntry.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject delete for dietitian (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/accounting-entries/${testEntry.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent entry', async () => {
      const res = await request(app)
        .delete('/api/accounting-entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/accounting-entries/${testEntry.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for assistant (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/accounting-entries/${testEntry.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
