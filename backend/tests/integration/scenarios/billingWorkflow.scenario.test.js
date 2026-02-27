/**
 * Billing Workflow Scenario Test
 *
 * End-to-end backend scenario via HTTP (supertest) covering:
 *   1. Create a client (POST /api/clients)
 *   2. Create a quote (POST /api/quotes)
 *   3. Verify quote appears in GET /api/quotes
 *   4. Update quote (PUT /api/quotes/:id)
 *   5. Check finance dashboard (GET /api/finance/dashboard)
 *   6. Verify accounting entries listing (GET /api/accounting-entries)
 *
 * Happy path only — all steps should succeed (2xx).
 */

const request = require('supertest');
const testDb = require('../../setup/testDb');
const testAuth = require('../../setup/testAuth');

let app;

describe('Billing Workflow Scenario', () => {
  let adminAuth, dietitianAuth;

  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();
    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('should complete the full billing workflow', async () => {
    // -------------------------------------------------------
    // Step 1: Create a client as admin
    // -------------------------------------------------------
    const createClientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', adminAuth.authHeader)
      .send({
        client_type: 'person',
        first_name: 'Marie',
        last_name: 'Martin',
        email: 'marie.martin.billing@test.com',
        phone: '0600000002',
        language_preference: 'fr'
      });

    expect(createClientRes.status).toBe(201);
    expect(createClientRes.body.success).toBe(true);
    expect(createClientRes.body.data).toHaveProperty('id');
    expect(createClientRes.body.data.client_type).toBe('person');
    expect(createClientRes.body.data.first_name).toBe('Marie');

    const clientId = createClientRes.body.data.id;

    // -------------------------------------------------------
    // Step 2: Create a quote for the client as admin
    // -------------------------------------------------------
    const quoteDate = new Date().toISOString();
    const validityDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const createQuoteRes = await request(app)
      .post('/api/quotes')
      .set('Authorization', adminAuth.authHeader)
      .send({
        client_id: clientId,
        subject: 'Programme nutritionnel 3 mois',
        quote_date: quoteDate,
        validity_date: validityDate,
        tax_rate: 0,
        notes: 'Devis pour suivi nutritionnel',
        items: [
          {
            item_name: 'Consultation initiale',
            description: 'Bilan complet',
            quantity: 1,
            unit_price: 80
          },
          {
            item_name: 'Consultation de suivi',
            description: 'Suivi mensuel',
            quantity: 3,
            unit_price: 60
          }
        ]
      });

    expect(createQuoteRes.status).toBe(201);
    expect(createQuoteRes.body.success).toBe(true);
    expect(createQuoteRes.body.data).toHaveProperty('id');
    expect(createQuoteRes.body.data.client_id).toBe(clientId);
    expect(createQuoteRes.body.data.status).toBe('DRAFT');

    const quoteId = createQuoteRes.body.data.id;

    // -------------------------------------------------------
    // Step 3: Verify quote appears in GET /api/quotes
    // -------------------------------------------------------
    const listQuotesRes = await request(app)
      .get('/api/quotes')
      .set('Authorization', adminAuth.authHeader);

    expect(listQuotesRes.status).toBe(200);
    expect(listQuotesRes.body.success).toBe(true);

    // Quotes may be nested in data or data.quotes
    const quotesData = listQuotesRes.body.data;
    const quotesList = Array.isArray(quotesData)
      ? quotesData
      : (quotesData.quotes || []);

    const foundQuote = quotesList.find(q => q.id === quoteId);
    expect(foundQuote).toBeDefined();
    expect(foundQuote.client_id).toBe(clientId);

    // -------------------------------------------------------
    // Step 4: Update the quote subject
    // -------------------------------------------------------
    const updateQuoteRes = await request(app)
      .put(`/api/quotes/${quoteId}`)
      .set('Authorization', adminAuth.authHeader)
      .send({
        subject: 'Programme nutritionnel 6 mois - UPDATED',
        notes: 'Mis à jour après discussion'
      });

    expect(updateQuoteRes.status).toBe(200);
    expect(updateQuoteRes.body.success).toBe(true);
    expect(updateQuoteRes.body.data.subject).toBe('Programme nutritionnel 6 mois - UPDATED');

    // -------------------------------------------------------
    // Step 5: Check finance dashboard is accessible
    // -------------------------------------------------------
    const dashboardRes = await request(app)
      .get('/api/finance/dashboard')
      .set('Authorization', adminAuth.authHeader);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.success).toBe(true);
    // Dashboard response should have some structure — don't over-assert shape
    expect(dashboardRes.body).toHaveProperty('data');

    // -------------------------------------------------------
    // Step 6: Verify accounting entries listing is accessible
    // -------------------------------------------------------
    const accountingRes = await request(app)
      .get('/api/accounting-entries')
      .set('Authorization', adminAuth.authHeader);

    expect(accountingRes.status).toBe(200);
    expect(accountingRes.body.success).toBe(true);

    const entriesData = accountingRes.body.data;
    const entriesList = Array.isArray(entriesData)
      ? entriesData
      : (entriesData.entries || []);

    expect(Array.isArray(entriesList)).toBe(true);
  });

  // -------------------------------------------------------
  // Additional targeted checks
  // -------------------------------------------------------
  it('should reject client creation with invalid client_type', async () => {
    const res = await request(app)
      .post('/api/clients')
      .set('Authorization', adminAuth.authHeader)
      .send({
        client_type: 'invalid_type',
        first_name: 'Bad',
        last_name: 'Type'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject quote creation without required items', async () => {
    // First create a valid client
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', adminAuth.authHeader)
      .send({
        client_type: 'company',
        company_name: 'No Items Corp'
      });
    expect(clientRes.status).toBe(201);
    const clientId = clientRes.body.data.id;

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', adminAuth.authHeader)
      .send({
        client_id: clientId,
        quote_date: new Date().toISOString(),
        validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [] // empty items — should fail validation
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject quote creation without authentication', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .send({
        client_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        items: [{ item_name: 'Test', quantity: 1, unit_price: 10 }]
      });

    expect(res.status).toBe(401);
  });

  it('should reject client creation without authentication', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({
        client_type: 'person',
        first_name: 'Unauth',
        last_name: 'User'
      });

    expect(res.status).toBe(401);
  });

  it('should allow a dietitian to create and read clients and quotes', async () => {
    // Dietitian should have clients.create and quotes.create permissions
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', dietitianAuth.authHeader)
      .send({
        client_type: 'person',
        first_name: 'Dietitian',
        last_name: 'Client'
      });

    expect(clientRes.status).toBe(201);
    const clientId = clientRes.body.data.id;

    const quoteRes = await request(app)
      .post('/api/quotes')
      .set('Authorization', dietitianAuth.authHeader)
      .send({
        client_id: clientId,
        quote_date: new Date().toISOString(),
        validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tax_rate: 0,
        items: [
          {
            item_name: 'Séance',
            quantity: 1,
            unit_price: 55
          }
        ]
      });

    expect(quoteRes.status).toBe(201);
    expect(quoteRes.body.data.status).toBe('DRAFT');

    // Dietitian can read quotes
    const listRes = await request(app)
      .get('/api/quotes')
      .set('Authorization', dietitianAuth.authHeader);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
  });

  it('should return 404 for a non-existent quote', async () => {
    // Use a well-formed UUID v4 that does not exist in the database
    const fakeId = '00000000-0000-4000-a000-000000000002';
    const res = await request(app)
      .get(`/api/quotes/${fakeId}`)
      .set('Authorization', adminAuth.authHeader);

    expect(res.status).toBe(404);
  });

  it('should allow changing quote status via PATCH /api/quotes/:id/status', async () => {
    // Create client and quote
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', adminAuth.authHeader)
      .send({ client_type: 'person', first_name: 'Status', last_name: 'Test' });
    expect(clientRes.status).toBe(201);
    const clientId = clientRes.body.data.id;

    const quoteRes = await request(app)
      .post('/api/quotes')
      .set('Authorization', adminAuth.authHeader)
      .send({
        client_id: clientId,
        quote_date: new Date().toISOString(),
        validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tax_rate: 0,
        items: [{ item_name: 'Item', quantity: 1, unit_price: 100 }]
      });
    expect(quoteRes.status).toBe(201);
    const quoteId = quoteRes.body.data.id;

    // Change status to SENT
    const statusRes = await request(app)
      .patch(`/api/quotes/${quoteId}/status`)
      .set('Authorization', adminAuth.authHeader)
      .send({ status: 'SENT' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.status).toBe('SENT');
  });
});
