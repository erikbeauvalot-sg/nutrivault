/**
 * Bank Accounts Integration Tests
 * Configurable accounts, default account rules (location for revenue, default
 * account for expenses/entries), treasury per account and revenue editing.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures } = require('../fixtures');

let app;

describe('Bank accounts', () => {
  let adminAuth;
  let assistantAuth;
  let patient;
  let counter = 0;

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
    assistantAuth = await testAuth.createAssistant();
    patient = await testDb.getDb().Patient.create({ ...patientFixtures.validPatient });
  });

  afterAll(async () => {
    await testDb.close();
  });

  const as = (auth) => ({
    get: (url) => request(app).get(url).set('Authorization', auth.authHeader),
    post: (url, body) => request(app).post(url).set('Authorization', auth.authHeader).send(body),
    put: (url, body) => request(app).put(url).set('Authorization', auth.authHeader).send(body),
    patch: (url, body) => request(app).patch(url).set('Authorization', auth.authHeader).send(body),
    delete: (url) => request(app).delete(url).set('Authorization', auth.authHeader)
  });

  async function createAccount(body) {
    const res = await as(adminAuth).post('/api/bank-accounts', body);
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function createLocation(body) {
    const res = await as(adminAuth).post('/api/practice-locations', body);
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function createPaidInvoice(overrides = {}) {
    counter += 1;
    const db = testDb.getDb();
    const invoice = await db.Billing.create({
      patient_id: patient.id,
      invoice_number: `INV-BANK-${counter}`,
      invoice_date: new Date('2026-03-18T10:00:00Z'),
      due_date: new Date('2026-04-18T10:00:00Z'),
      service_description: 'Consultation',
      amount_total: 60,
      amount_paid: 60,
      amount_due: 0,
      status: 'PAID',
      payment_method: 'CHECK',
      ...overrides
    });
    await db.Payment.create({
      billing_id: invoice.id,
      amount: invoice.amount_paid,
      payment_method: invoice.payment_method,
      payment_date: invoice.invoice_date,
      status: 'PAID'
    });
    return invoice;
  }

  describe('CRUD', () => {
    it('creates accounts, keeps a single default and lists them', async () => {
      const pro = await createAccount({ label: 'Compte pro', bank_name: 'Ma Banque', is_default: true });
      const cash = await createAccount({ label: 'Caisse', is_default: true });
      expect(pro.code).toBe('COMPTE_PRO');

      const db = testDb.getDb();
      expect((await db.BankAccount.findByPk(pro.id)).is_default).toBe(false);
      expect((await db.BankAccount.findByPk(cash.id)).is_default).toBe(true);

      const list = await as(assistantAuth).get('/api/bank-accounts');
      expect(list.status).toBe(200);
      expect(list.body.data).toHaveLength(2);
    });

    it('requires the settings permission and refuses to delete a used account', async () => {
      const forbidden = await as(assistantAuth).post('/api/bank-accounts', { label: 'X' });
      expect(forbidden.status).toBe(403);

      const pro = await createAccount({ label: 'Compte pro' });
      await createPaidInvoice({ bank_account_code: pro.code });
      const res = await as(adminAuth).delete(`/api/bank-accounts/${pro.id}`);
      expect(res.status).toBe(409);
    });
  });

  describe('default account', () => {
    it('gives expenses and entries the default account', async () => {
      const pro = await createAccount({ label: 'Compte pro', is_default: true });

      const expense = await as(adminAuth).post('/api/expenses', {
        description: 'Loyer', amount: 450, category: 'RENT', expense_date: '2026-03-01'
      });
      expect(expense.status).toBe(201);
      expect(expense.body.data.bank_account_code).toBe(pro.code);

      const entry = await as(adminAuth).post('/api/accounting-entries', {
        description: 'Solde ouverture', amount: 1000, entry_type: 'CREDIT', entry_date: '2026-01-01'
      });
      expect(entry.status).toBe(201);
      expect(entry.body.data.bank_account_code).toBe(pro.code);
    });

    it('gives invoices the account of their location, and follows a location change', async () => {
      const pro = await createAccount({ label: 'Compte pro' });
      const other = await createAccount({ label: 'Compte Issy' });
      await createLocation({ label: 'Suresnes', is_default: true, bank_account_code: pro.code });
      const issy = await createLocation({ label: 'Issy', bank_account_code: other.code });

      const created = await as(adminAuth).post('/api/billing', {
        patient_id: patient.id, service_description: 'Consultation', amount_total: 60
      });
      expect(created.status).toBe(201);
      expect(created.body.data.bank_account_code).toBe(pro.code);

      const moved = await as(adminAuth).patch('/api/finance/revenue/location', {
        billing_ids: [created.body.data.id], location_code: issy.code
      });
      expect(moved.status).toBe(200);
      expect(moved.body.data[0].bank_account_code).toBe(other.code);
    });

    it('keeps an account chosen by hand when the location changes', async () => {
      const pro = await createAccount({ label: 'Compte pro' });
      const cash = await createAccount({ label: 'Caisse' });
      const other = await createAccount({ label: 'Compte Issy' });
      const suresnes = await createLocation({ label: 'Suresnes', bank_account_code: pro.code });
      const issy = await createLocation({ label: 'Issy', bank_account_code: other.code });
      const invoice = await createPaidInvoice({ location_code: suresnes.code, bank_account_code: cash.code });

      const res = await as(adminAuth).patch(`/api/finance/revenue/${invoice.id}`, { location_code: issy.code });
      expect(res.status).toBe(200);
      expect(res.body.data.bank_account_code).toBe(cash.code);
    });

    it('rejects unknown accounts', async () => {
      const res = await as(adminAuth).post('/api/expenses', {
        description: 'X', amount: 1, category: 'OTHER', expense_date: '2026-03-01', bank_account_code: 'NOPE'
      });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/finance/revenue/:id', () => {
    it('edits amount, cash date, method, location, account and description together', async () => {
      const pro = await createAccount({ label: 'Compte pro' });
      const suresnes = await createLocation({ label: 'Suresnes' });
      const invoice = await createPaidInvoice();

      const res = await as(adminAuth).patch(`/api/finance/revenue/${invoice.id}`, {
        amount: 75,
        cash_date: '2026-04-02',
        payment_method: 'CREDIT_CARD',
        location_code: suresnes.code,
        bank_account_code: pro.code,
        service_description: 'Bilan'
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        amount_total: 75,
        amount_paid: 75,
        cash_date: '2026-04-02',
        cash_date_overridden: true,
        payment_method: 'CREDIT_CARD',
        location_code: suresnes.code,
        bank_account_code: pro.code,
        service_description: 'Bilan'
      });

      const db = testDb.getDb();
      const stored = await db.Billing.findByPk(invoice.id);
      expect(parseFloat(stored.amount_due)).toBe(0);
      const payments = await db.Payment.findAll({ where: { billing_id: invoice.id } });
      expect(parseFloat(payments[0].amount)).toBe(75);
      const fields = stored.update_log.map(e => e.field);
      expect(fields).toEqual(expect.arrayContaining(['amount_paid', 'cash_date', 'payment_method', 'location_code', 'bank_account_code', 'service_description']));
    });

    it('rejects unpaid invoices, invalid amounts and users without billing.update', async () => {
      const unpaid = await createPaidInvoice({ status: 'SENT', amount_paid: 0, amount_due: 60 });
      expect((await as(adminAuth).patch(`/api/finance/revenue/${unpaid.id}`, { amount: 50 })).status).toBe(400);

      const invoice = await createPaidInvoice();
      expect((await as(adminAuth).patch(`/api/finance/revenue/${invoice.id}`, { amount: 0 })).status).toBe(400);
      expect((await as(assistantAuth).patch(`/api/finance/revenue/${invoice.id}`, { amount: 50 })).status).toBe(403);
    });
  });

  describe('treasury', () => {
    it('splits flows and balances per account, with unassigned records apart', async () => {
      const pro = await createAccount({ label: 'Compte pro', is_default: true });
      const cash = await createAccount({ label: 'Caisse' });

      await createPaidInvoice({ bank_account_code: pro.code, amount_total: 60, amount_paid: 60 });
      await createPaidInvoice({ bank_account_code: cash.code, amount_total: 40, amount_paid: 40 });
      await createPaidInvoice({ bank_account_code: null, amount_total: 10, amount_paid: 10 });
      await as(adminAuth).post('/api/expenses', { description: 'Loyer', amount: 450, category: 'RENT', expense_date: '2026-03-01' });
      // Opening balance written as an entry on the account
      await as(adminAuth).post('/api/accounting-entries', {
        description: 'Solde ouverture', amount: 1000, entry_type: 'CREDIT', entry_date: '2025-12-31'
      });

      const res = await as(adminAuth).get('/api/finance/treasury?start_date=2026-01-01&end_date=2026-12-31');
      expect(res.status).toBe(200);
      const byCode = Object.fromEntries(res.body.data.accounts.map(a => [a.code, a]));

      expect(byCode[pro.code]).toMatchObject({ revenue: 60, expenses: 450, adjustments: 0, net: -390, balance: 610 });
      expect(byCode[cash.code]).toMatchObject({ revenue: 40, expenses: 0, net: 40, balance: 40 });
      expect(byCode.none).toMatchObject({ revenue: 10, balance: 10 });
      expect(res.body.data.total).toMatchObject({ revenue: 110, expenses: 450, balance: 660 });
    });

    it('filters revenue and cash flow by account', async () => {
      const pro = await createAccount({ label: 'Compte pro' });
      await createPaidInvoice({ bank_account_code: pro.code });
      await createPaidInvoice({ bank_account_code: null });

      const revenue = await as(adminAuth).get(`/api/finance/revenue?bank_account=${pro.code}`);
      expect(revenue.body.data.invoices).toHaveLength(1);

      const none = await as(adminAuth).get('/api/finance/revenue?bank_account=none');
      expect(none.body.data.invoices).toHaveLength(1);
      expect(none.body.data.invoices[0].bank_account_code).toBeNull();
    });
  });
});
