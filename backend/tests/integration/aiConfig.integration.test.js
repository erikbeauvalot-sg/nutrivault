/**
 * Integration Tests for AI Config Routes
 * Routes: GET /providers, GET /pricing, GET /current, PUT /, POST /test
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

// Mock the AI provider service to avoid actual API calls
jest.mock('../../src/services/aiProvider.service', () => ({
  getAvailableProviders: jest.fn(() => [
    {
      id: 'openai',
      name: 'OpenAI',
      configured: false,
      models: [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ]
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      configured: false,
      models: [
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }
      ]
    }
  ]),
  getPricingInfo: jest.fn(() => ({
    openai: { 'gpt-4': { input: 0.03, output: 0.06 } },
    anthropic: { 'claude-3-sonnet': { input: 0.003, output: 0.015 } }
  })),
  getAIConfiguration: jest.fn(async () => ({
    provider: 'openai',
    model: 'gpt-4'
  })),
  saveAIConfiguration: jest.fn(async (provider, model) => ({
    provider,
    model,
    saved: true
  })),
  generateContent: jest.fn(async () => 'Connection successful')
}));

describe('AI Config API', () => {
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

  describe('GET /api/ai-config/providers', () => {
    it('should return providers for admin', async () => {
      const res = await request(app)
        .get('/api/ai-config/providers')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should reject dietitian (requires users.delete permission)', async () => {
      const res = await request(app)
        .get('/api/ai-config/providers')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/ai-config/providers');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/ai-config/pricing', () => {
    it('should return pricing for admin', async () => {
      const res = await request(app)
        .get('/api/ai-config/pricing')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get('/api/ai-config/pricing')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/ai-config/current', () => {
    it('should return current config for any authenticated user', async () => {
      const res = await request(app)
        .get('/api/ai-config/current')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBeDefined();
      expect(res.body.data.model).toBeDefined();
    });

    it('should return current config for admin', async () => {
      const res = await request(app)
        .get('/api/ai-config/current')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.provider).toBe('openai');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/ai-config/current');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/ai-config', () => {
    it('should save config as admin', async () => {
      const res = await request(app)
        .put('/api/ai-config')
        .set('Authorization', adminAuth.authHeader)
        .send({
          provider: 'anthropic',
          model: 'claude-3-sonnet'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when provider is missing', async () => {
      const res = await request(app)
        .put('/api/ai-config')
        .set('Authorization', adminAuth.authHeader)
        .send({ model: 'gpt-4' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when model is missing', async () => {
      const res = await request(app)
        .put('/api/ai-config')
        .set('Authorization', adminAuth.authHeader)
        .send({ provider: 'openai' });

      expect(res.status).toBe(400);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .put('/api/ai-config')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ provider: 'openai', model: 'gpt-4' });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/ai-config')
        .send({ provider: 'openai', model: 'gpt-4' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/ai-config/test', () => {
    it('should test connection as admin', async () => {
      const res = await request(app)
        .post('/api/ai-config/test')
        .set('Authorization', adminAuth.authHeader)
        .send({
          provider: 'openai',
          model: 'gpt-4'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('successful');
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/ai-config/test')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ provider: 'openai', model: 'gpt-4' });

      expect(res.status).toBe(403);
    });
  });
});
