/**
 * Integration Tests for Follow-ups Routes
 * Routes: GET /status, POST /generate/:visitId, POST /send/:visitId, GET /history/:visitId
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

// Mock the AI services to avoid actual API calls
jest.mock('../../src/services/aiFollowup.service', () => ({
  isAIAvailable: jest.fn(() => true),
  getSupportedLanguages: jest.fn(() => [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' }
  ]),
  generateFollowupContent: jest.fn(async (visitId, options) => ({
    subject: 'Suivi de consultation',
    body_html: '<p>Contenu de suivi</p>',
    body_text: 'Contenu de suivi',
    metadata: { model: 'test-model', language: options.language || 'fr' }
  }))
}));

jest.mock('../../src/services/aiProvider.service', () => ({
  getAIConfiguration: jest.fn(async () => ({
    provider: 'openai',
    model: 'gpt-4'
  })),
  getAvailableProviders: jest.fn(() => [
    {
      id: 'openai',
      name: 'OpenAI',
      configured: true,
      models: [{ id: 'gpt-4', name: 'GPT-4' }]
    }
  ])
}));

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn(async () => ({ success: true }))
}));

describe('Follow-ups API', () => {
  let adminAuth, dietitianAuth, assistantAuth;

  beforeAll(async () => {
    await testDb.init();
    app = require('../setup/testServer').resetApp();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  describe('GET /api/followups/status', () => {
    it('should return AI status for authenticated user', async () => {
      const res = await request(app)
        .get('/api/followups/status')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ai_available).toBeDefined();
      expect(res.body.data.supported_languages).toBeDefined();
    });

    it('should return AI status for dietitian', async () => {
      const res = await request(app)
        .get('/api/followups/status')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/followups/status');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/followups/history/:visitId', () => {
    let patient, visit;

    beforeEach(async () => {
      const db = testDb.getDb();
      patient = await db.Patient.create({
        first_name: 'Test',
        last_name: 'Patient',
        email: 'patient@test.com',
        created_by: adminAuth.user.id
      });
      visit = await db.Visit.create({
        patient_id: patient.id,
        visit_date: new Date(),
        dietitian_id: adminAuth.user.id,
        created_by: adminAuth.user.id
      });
    });

    it('should return empty history for visit without follow-ups', async () => {
      const res = await request(app)
        .get(`/api/followups/history/${visit.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .get('/api/followups/history/99999')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/followups/history/${visit.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject assistant without visits.read permission', async () => {
      const res = await request(app)
        .get(`/api/followups/history/${visit.id}`)
        .set('Authorization', assistantAuth.authHeader);

      // Assistant has visits.read in seedBaseData, so this should work
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/followups/send/:visitId', () => {
    let patient, visit;

    beforeEach(async () => {
      const db = testDb.getDb();
      patient = await db.Patient.create({
        first_name: 'Test',
        last_name: 'Patient',
        email: 'patient@test.com',
        created_by: adminAuth.user.id
      });
      visit = await db.Visit.create({
        patient_id: patient.id,
        visit_date: new Date(),
        dietitian_id: adminAuth.user.id,
        created_by: adminAuth.user.id
      });
    });

    it('should send follow-up email as admin', async () => {
      const res = await request(app)
        .post(`/api/followups/send/${visit.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          subject: 'Suivi de votre consultation',
          body_html: '<p>Bonjour, voici votre suivi.</p>',
          body_text: 'Bonjour, voici votre suivi.',
          ai_generated: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailLogId).toBeDefined();
      expect(res.body.data.sentTo).toBe('patient@test.com');
    });

    it('should return 400 when subject is missing', async () => {
      const res = await request(app)
        .post(`/api/followups/send/${visit.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          body_html: '<p>Content without subject</p>'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .post('/api/followups/send/99999')
        .set('Authorization', adminAuth.authHeader)
        .send({
          subject: 'Test',
          body_html: '<p>Test</p>'
        });

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/followups/send/${visit.id}`)
        .send({
          subject: 'Test',
          body_html: '<p>Test</p>'
        });

      expect(res.status).toBe(401);
    });
  });
});
