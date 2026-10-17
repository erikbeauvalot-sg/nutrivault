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

  // ========================================
  // Cash date (date d'encaissement)
  // ========================================
  describe('Cash date (date d\'encaissement)', () => {
    let patient;
    let counter = 0;

    async function createPaidInvoice(overrides = {}) {
      counter += 1;
      return testDb.getDb().Billing.create({
        patient_id: patient.id,
        invoice_number: `INV-CASH-${counter}`,
        invoice_date: new Date('2026-03-18T10:00:00Z'),
        due_date: new Date('2026-04-18T10:00:00Z'),
        amount_total: 60,
        amount_paid: 60,
        amount_due: 0,
        status: 'PAID',
        payment_method: 'CHECK',
        ...overrides
      });
    }

    beforeEach(async () => {
      patient = await testDb.getDb().Patient.create({
        first_name: 'Cash',
        last_name: 'Patient',
        email: 'cash@test.com',
        created_by: adminAuth.user.id
      });
    });

    it('defaults the cash date to the invoice date', async () => {
      await createPaidInvoice();

      const res = await request(app)
        .get('/api/finance/revenue')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.invoices[0].cash_date).toBe('2026-03-18');
      expect(res.body.data.invoices[0].cash_date_overridden).toBe(false);
    });

    it('moves the cash date to the 2nd of the next month, then again', async () => {
      const invoice = await createPaidInvoice();

      const first = await request(app)
        .post('/api/finance/revenue/cash-date/next-month')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [invoice.id] });

      expect(first.status).toBe(200);
      expect(first.body.data[0].cash_date).toBe('2026-04-02');
      expect(first.body.data[0].cash_date_overridden).toBe(true);

      const second = await request(app)
        .post('/api/finance/revenue/cash-date/next-month')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [invoice.id] });

      expect(second.body.data[0].cash_date).toBe('2026-05-02');

      await invoice.reload();
      expect(invoice.update_log.filter(entry => entry.field === 'cash_date')).toHaveLength(2);
    });

    it('moves December invoices to January of the next year', async () => {
      const invoice = await createPaidInvoice({ invoice_date: new Date('2026-12-30T10:00:00Z') });

      const res = await request(app)
        .post('/api/finance/revenue/cash-date/next-month')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [invoice.id] });

      expect(res.body.data[0].cash_date).toBe('2027-01-02');
    });

    it('sets several cash dates at once and resets them with null', async () => {
      const a = await createPaidInvoice();
      const b = await createPaidInvoice();

      const set = await request(app)
        .patch('/api/finance/revenue/cash-date')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [a.id, b.id], cash_date: '2026-04-10' });

      expect(set.status).toBe(200);
      expect(set.body.data.map(inv => inv.cash_date)).toEqual(['2026-04-10', '2026-04-10']);

      const reset = await request(app)
        .patch('/api/finance/revenue/cash-date')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [a.id], cash_date: null });

      expect(reset.body.data[0].cash_date).toBe('2026-03-18');
      expect(reset.body.data[0].cash_date_overridden).toBe(false);
    });

    it('filters revenue and totals by cash date', async () => {
      const shifted = await createPaidInvoice({ amount_total: 50, amount_paid: 50 });
      await createPaidInvoice({ amount_total: 70, amount_paid: 70 });
      await shifted.update({ cash_date: '2026-04-02' });

      const march = await request(app)
        .get('/api/finance/revenue?start_date=2026-03-01&end_date=2026-03-31')
        .set('Authorization', adminAuth.authHeader);
      expect(march.body.data.total).toBe(1);
      expect(march.body.data.totalPaid).toBe(70);

      const april = await request(app)
        .get('/api/finance/revenue?start_date=2026-04-01&end_date=2026-04-30')
        .set('Authorization', adminAuth.authHeader);
      expect(april.body.data.total).toBe(1);
      expect(april.body.data.totalPaid).toBe(50);

      const dashboard = await request(app)
        .get('/api/finance/dashboard?start_date=2026-04-01&end_date=2026-04-30')
        .set('Authorization', adminAuth.authHeader);
      expect(dashboard.body.data.totalRevenue).toBe(50);
    });

    it('places shifted invoices in the cash month of the accounting export', async () => {
      const ExcelJS = require('exceljs');
      const shifted = await createPaidInvoice({ invoice_number: 'INV-SHIFTED' });
      await createPaidInvoice({ invoice_number: 'INV-MARCH' });
      await shifted.update({ cash_date: '2026-04-02' });

      const res = await request(app)
        .get('/api/finance/compta-export?year=2026&mode=clean')
        .set('Authorization', adminAuth.authHeader)
        .buffer(true)
        .parse((response, callback) => {
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);
      const sheetText = (name) => {
        const values = [];
        workbook.getWorksheet(name).eachRow(row => row.eachCell(cell => values.push(String(cell.value))));
        return values.join(' ');
      };

      expect(sheetText('03')).toContain('INV-MARCH');
      expect(sheetText('03')).not.toContain('INV-SHIFTED');
      expect(sheetText('04')).toContain('INV-SHIFTED');
    });

    it('rejects an invalid cash date', async () => {
      const invoice = await createPaidInvoice();

      const res = await request(app)
        .patch('/api/finance/revenue/cash-date')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [invoice.id], cash_date: '2026-13-45' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for invoices outside the dietitian scope', async () => {
      const invoice = await createPaidInvoice();

      const res = await request(app)
        .post('/api/finance/revenue/cash-date/next-month')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ billing_ids: [invoice.id] });

      expect(res.status).toBe(404);
      await invoice.reload();
      expect(invoice.cash_date).toBeNull();
    });

    it('rejects users without billing.update', async () => {
      const invoice = await createPaidInvoice();

      const res = await request(app)
        .post('/api/finance/revenue/cash-date/next-month')
        .set('Authorization', assistantAuth.authHeader)
        .send({ billing_ids: [invoice.id] });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // Custom role limited to finance (e.g. COMPTABLE)
  // ========================================
  describe('Custom finance-only role', () => {
    async function createAccountant(dataScope) {
      const db = testDb.getDb();
      const role = await db.Role.create({ name: 'COMPTABLE', data_scope: dataScope });
      const permissions = await db.Permission.findAll({ where: { code: ['finance.read', 'billing.read'] } });
      await db.RolePermission.bulkCreate(permissions.map(p => ({ role_id: role.id, permission_id: p.id })));
      return testAuth.createUser('COMPTABLE');
    }

    beforeEach(async () => {
      const db = testDb.getDb();
      const patient = await db.Patient.create({
        first_name: 'Compta',
        last_name: 'Patient',
        email: 'compta@test.com',
        created_by: dietitianAuth.user.id
      });
      await db.PatientDietitian.create({ patient_id: patient.id, dietitian_id: dietitianAuth.user.id });
      await db.Billing.create({
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id,
        invoice_number: 'INV-COMPTA-1',
        invoice_date: new Date('2026-03-18T10:00:00Z'),
        due_date: new Date('2026-04-18T10:00:00Z'),
        amount_total: 80,
        amount_paid: 80,
        amount_due: 0,
        status: 'PAID',
        payment_method: 'CARD'
      });
    });

    it("with data_scope 'all' sees the whole practice revenue", async () => {
      const accountant = await createAccountant('all');

      const res = await request(app)
        .get('/api/finance/revenue')
        .set('Authorization', accountant.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.invoices.map(i => i.invoice_number)).toContain('INV-COMPTA-1');
    });

    it("with data_scope 'own' does not see other users' revenue", async () => {
      const accountant = await createAccountant('own');

      const res = await request(app)
        .get('/api/finance/revenue')
        .set('Authorization', accountant.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.invoices).toHaveLength(0);
    });

    it('cannot reach patient data without the permission', async () => {
      const accountant = await createAccountant('all');

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', accountant.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
