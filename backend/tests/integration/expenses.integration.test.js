/**
 * Expenses Integration Tests
 * Tests for /api/expenses endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Expenses API', () => {
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
  // GET /api/expenses/summary
  // ========================================
  describe('GET /api/expenses/summary', () => {
    it('should return expense summary for admin', async () => {
      const res = await request(app)
        .get('/api/expenses/summary')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return expense summary for dietitian', async () => {
      const res = await request(app)
        .get('/api/expenses/summary')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return expense summary for assistant', async () => {
      const res = await request(app)
        .get('/api/expenses/summary')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/expenses/summary');

      expect(res.status).toBe(401);
    });

    it('should support date range filter', async () => {
      const res = await request(app)
        .get('/api/expenses/summary?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/expenses
  // ========================================
  describe('GET /api/expenses', () => {
    it('should return list for admin', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return list for dietitian', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return list for assistant (read permission)', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/expenses');

      expect(res.status).toBe(401);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/expenses?category=RENT')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/expenses?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by is_recurring', async () => {
      const res = await request(app)
        .get('/api/expenses?is_recurring=true')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support search', async () => {
      const res = await request(app)
        .get('/api/expenses?search=loyer')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/expenses?page=1&limit=5')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject invalid category filter with 400', async () => {
      const res = await request(app)
        .get('/api/expenses?category=INVALID_CATEGORY')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /api/expenses
  // ========================================
  describe('POST /api/expenses', () => {
    const validExpense = {
      description: 'Loyer cabinet medical',
      amount: 1200.00,
      category: 'RENT',
      expense_date: '2026-02-01'
    };

    it('should create an expense as admin', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send(validExpense);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(validExpense.description);
      expect(parseFloat(res.body.data.amount)).toBe(validExpense.amount);
      expect(res.body.data.category).toBe(validExpense.category);
    });

    it('should create an expense as dietitian', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', dietitianAuth.authHeader)
        .send(validExpense);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create an expense with all optional fields', async () => {
      const fullExpense = {
        ...validExpense,
        vendor: 'SCI Paris Centre',
        payment_method: 'BANK_TRANSFER',
        notes: 'Charge mensuelle',
        is_recurring: true,
        recurring_period: 'MONTHLY',
        recurring_end_date: '2027-01-01',
        tax_deductible: true
      };

      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send(fullExpense);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_recurring).toBe(true);
      expect(res.body.data.recurring_period).toBe('MONTHLY');
    });

    it('should reject expense without description', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send({ amount: 100, category: 'RENT', expense_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject expense without amount', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', category: 'RENT', expense_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject expense with zero amount', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', amount: 0, category: 'RENT', expense_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject expense without category', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', amount: 100, expense_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject expense with invalid category', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', amount: 100, category: 'INVALID', expense_date: '2026-02-01' });

      expect(res.status).toBe(400);
    });

    it('should reject expense without expense_date', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Test', amount: 100, category: 'RENT' });

      expect(res.status).toBe(400);
    });

    it('should reject expense with invalid payment_method', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', adminAuth.authHeader)
        .send({ ...validExpense, payment_method: 'BITCOIN' });

      expect(res.status).toBe(400);
    });

    it('should reject expense creation without authentication', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send(validExpense);

      expect(res.status).toBe(401);
    });

    it('should reject expense creation for assistant (no create permission)', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', assistantAuth.authHeader)
        .send(validExpense);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/expenses/:id
  // ========================================
  describe('GET /api/expenses/:id', () => {
    let adminExpense;
    let dietitianExpense;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminExpense = await db.Expense.create({
        description: 'Software abonnement',
        amount: 29.99,
        category: 'SOFTWARE',
        expense_date: '2026-02-01',
        created_by: adminAuth.user.id
      });
      // Dietitian can only see their own expenses
      dietitianExpense = await db.Expense.create({
        description: 'Abonnement outil dietitian',
        amount: 19.99,
        category: 'SOFTWARE',
        expense_date: '2026-02-01',
        created_by: dietitianAuth.user.id
      });
    });

    it('should return expense by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/expenses/${adminExpense.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(adminExpense.id);
    });

    it('should return own expense for dietitian', async () => {
      const res = await request(app)
        .get(`/api/expenses/${dietitianExpense.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for assistant with no linked dietitians (scoping)', async () => {
      // Assistant has no linked dietitians in test setup
      const res = await request(app)
        .get(`/api/expenses/${adminExpense.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent expense', async () => {
      const res = await request(app)
        .get('/api/expenses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/expenses/not-a-uuid')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get(`/api/expenses/${adminExpense.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/expenses/:id
  // ========================================
  describe('PUT /api/expenses/:id', () => {
    let adminExpense;
    let dietitianExpense;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminExpense = await db.Expense.create({
        description: 'Equipment achat',
        amount: 500.00,
        category: 'EQUIPMENT',
        expense_date: '2026-02-01',
        created_by: adminAuth.user.id
      });
      // Dietitian can only update their own expenses
      dietitianExpense = await db.Expense.create({
        description: 'Dietitian equipment',
        amount: 250.00,
        category: 'EQUIPMENT',
        expense_date: '2026-02-01',
        created_by: dietitianAuth.user.id
      });
    });

    it('should update expense as admin', async () => {
      const res = await request(app)
        .put(`/api/expenses/${adminExpense.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          description: 'Equipment achat updated',
          amount: 550.00,
          category: 'EQUIPMENT',
          expense_date: '2026-02-01'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update own expense as dietitian', async () => {
      const res = await request(app)
        .put(`/api/expenses/${dietitianExpense.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          description: 'Updated by dietitian',
          amount: 260.00,
          category: 'EQUIPMENT',
          expense_date: '2026-02-01'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent expense', async () => {
      const res = await request(app)
        .put('/api/expenses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send({
          description: 'Updated',
          amount: 100,
          category: 'OTHER',
          expense_date: '2026-02-01'
        });

      expect(res.status).toBe(404);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/expenses/${adminExpense.id}`)
        .send({ description: 'Updated', amount: 100, category: 'OTHER', expense_date: '2026-02-01' });

      expect(res.status).toBe(401);
    });

    it('should reject update for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/expenses/${adminExpense.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ description: 'Updated', amount: 100, category: 'OTHER', expense_date: '2026-02-01' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/expenses/:id
  // ========================================
  describe('DELETE /api/expenses/:id', () => {
    let testExpense;

    beforeEach(async () => {
      const db = testDb.getDb();
      testExpense = await db.Expense.create({
        description: 'To delete expense',
        amount: 99.00,
        category: 'SUPPLIES',
        expense_date: '2026-02-01',
        created_by: adminAuth.user.id
      });
    });

    it('should delete expense as admin', async () => {
      const res = await request(app)
        .delete(`/api/expenses/${testExpense.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject delete for dietitian (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/expenses/${testExpense.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent expense', async () => {
      const res = await request(app)
        .delete('/api/expenses/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/expenses/${testExpense.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for assistant (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/expenses/${testExpense.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
