/**
 * Practice Locations Integration Tests
 * Configurable consultation locations, the invoice location field and the
 * bulk "set location" action of the revenue page.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { billing: billingFixtures, patients: patientFixtures } = require('../fixtures');

let app;

describe('Practice locations', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let patient;

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
    patient = await db.Patient.create({ ...patientFixtures.validPatient });
    await db.PatientDietitian.create({ patient_id: patient.id, dietitian_id: dietitianAuth.user.id });
  });

  afterAll(async () => {
    await testDb.close();
  });

  async function createLocation(body) {
    const res = await request(app)
      .post('/api/practice-locations')
      .set('Authorization', adminAuth.authHeader)
      .send(body);
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function createInvoice(extra = {}) {
    const res = await request(app)
      .post('/api/billing')
      .set('Authorization', adminAuth.authHeader)
      .send({ ...billingFixtures.validInvoice, patient_id: patient.id, ...extra });
    return res;
  }

  describe('CRUD', () => {
    it('creates locations with a code derived from the label', async () => {
      const issy = await createLocation({ label: 'Issy Les Moulineaux' });
      expect(issy.code).toBe('ISSY_LES_MOULINEAUX');
      expect(issy.is_default).toBe(false);

      const list = await request(app).get('/api/practice-locations').set('Authorization', dietitianAuth.authHeader);
      expect(list.status).toBe(200);
      expect(list.body.data.map(l => l.label)).toEqual(['Issy Les Moulineaux']);
    });

    it('keeps a single default location', async () => {
      const suresnes = await createLocation({ label: 'Suresnes', is_default: true });
      const issy = await createLocation({ label: 'Issy Les Moulineaux', is_default: true });

      const db = testDb.getDb();
      expect((await db.PracticeLocation.findByPk(suresnes.id)).is_default).toBe(false);
      expect((await db.PracticeLocation.findByPk(issy.id)).is_default).toBe(true);
    });

    it('requires the settings permission to manage the list', async () => {
      const res = await request(app)
        .post('/api/practice-locations')
        .set('Authorization', assistantAuth.authHeader)
        .send({ label: 'Suresnes' });
      expect(res.status).toBe(403);
    });

    it('refuses to delete a location used by an invoice', async () => {
      const suresnes = await createLocation({ label: 'Suresnes' });
      await createInvoice({ location_code: suresnes.code });

      const res = await request(app)
        .delete(`/api/practice-locations/${suresnes.id}`)
        .set('Authorization', adminAuth.authHeader);
      expect(res.status).toBe(409);
    });
  });

  describe('invoice location', () => {
    it('gives new invoices the default location', async () => {
      await createLocation({ label: 'Suresnes', is_default: true });

      const res = await createInvoice();
      expect(res.status).toBe(201);
      expect(res.body.data.location_code).toBe('SURESNES');
    });

    it('accepts an explicit location, or none', async () => {
      await createLocation({ label: 'Suresnes', is_default: true });
      const issy = await createLocation({ label: 'Issy Les Moulineaux' });

      expect((await createInvoice({ location_code: issy.code })).body.data.location_code).toBe(issy.code);
      expect((await createInvoice({ location_code: null })).body.data.location_code).toBeNull();
    });

    it('rejects an unknown location', async () => {
      const res = await createInvoice({ location_code: 'NOWHERE' });
      expect(res.status).toBe(400);
    });

    it('tracks a location change in the invoice history', async () => {
      const issy = await createLocation({ label: 'Issy Les Moulineaux' });
      const invoice = (await createInvoice()).body.data;

      const res = await request(app)
        .put(`/api/billing/${invoice.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ location_code: issy.code });
      expect(res.status).toBe(200);

      const stored = await testDb.getDb().Billing.findByPk(invoice.id);
      expect(stored.location_code).toBe(issy.code);
      expect(stored.update_log.at(-1)).toMatchObject({ field: 'location_code', old_value: null, new_value: issy.code });
    });
  });

  describe('expense location', () => {
    const expense = { description: 'Loyer Issy', amount: 300, category: 'RENT', expense_date: '2026-03-01' };

    it('has no location by default and accepts one from the list', async () => {
      await createLocation({ label: 'Suresnes', is_default: true });
      const issy = await createLocation({ label: 'Issy Les Moulineaux' });

      const none = await request(app).post('/api/expenses').set('Authorization', adminAuth.authHeader).send(expense);
      expect(none.status).toBe(201);
      // The default location is for invoices only
      expect(none.body.data.location_code).toBeFalsy();

      const located = await request(app).post('/api/expenses').set('Authorization', adminAuth.authHeader)
        .send({ ...expense, location_code: issy.code });
      expect(located.status).toBe(201);
      expect(located.body.data.location_code).toBe(issy.code);

      const cleared = await request(app).put(`/api/expenses/${located.body.data.id}`).set('Authorization', adminAuth.authHeader)
        .send({ ...expense, location_code: null });
      expect(cleared.status).toBe(200);
      expect(cleared.body.data.location_code).toBeNull();
    });

    it('rejects an unknown location and protects used locations from deletion', async () => {
      const unknown = await request(app).post('/api/expenses').set('Authorization', adminAuth.authHeader)
        .send({ ...expense, location_code: 'NOWHERE' });
      expect(unknown.status).toBe(400);

      const issy = await createLocation({ label: 'Issy Les Moulineaux' });
      await request(app).post('/api/expenses').set('Authorization', adminAuth.authHeader)
        .send({ ...expense, location_code: issy.code });
      const del = await request(app).delete(`/api/practice-locations/${issy.id}`).set('Authorization', adminAuth.authHeader);
      expect(del.status).toBe(409);
    });
  });

  describe('PATCH /api/finance/revenue/location', () => {
    it('sets and clears the location of several invoices', async () => {
      const issy = await createLocation({ label: 'Issy Les Moulineaux' });
      const a = (await createInvoice()).body.data;
      const b = (await createInvoice()).body.data;

      const set = await request(app)
        .patch('/api/finance/revenue/location')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [a.id, b.id], location_code: issy.code });
      expect(set.status).toBe(200);
      expect(set.body.data.map(inv => inv.location_code)).toEqual([issy.code, issy.code]);

      const clear = await request(app)
        .patch('/api/finance/revenue/location')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [a.id], location_code: null });
      expect(clear.status).toBe(200);
      expect((await testDb.getDb().Billing.findByPk(a.id)).location_code).toBeNull();
    });

    it('rejects unknown locations and users without billing.update', async () => {
      const invoice = (await createInvoice()).body.data;

      const unknown = await request(app)
        .patch('/api/finance/revenue/location')
        .set('Authorization', adminAuth.authHeader)
        .send({ billing_ids: [invoice.id], location_code: 'NOWHERE' });
      expect(unknown.status).toBe(400);

      const forbidden = await request(app)
        .patch('/api/finance/revenue/location')
        .set('Authorization', assistantAuth.authHeader)
        .send({ billing_ids: [invoice.id], location_code: null });
      expect(forbidden.status).toBe(403);
    });
  });
});
