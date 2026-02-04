/**
 * Integration Tests for AI Prompts Routes
 * Routes: GET /usage-types, GET /usage/:usage, GET /, GET /:id, POST /, PUT /:id,
 *         DELETE /:id, POST /:id/set-default, POST /:id/duplicate, POST /:id/test
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('AI Prompts API', () => {
  let adminAuth, dietitianAuth;

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
  });

  const validPromptData = {
    usage: 'followup',
    name: 'Test Followup Prompt',
    description: 'A test prompt for follow-ups',
    language_code: 'fr',
    system_prompt: 'You are a helpful dietitian assistant.',
    user_prompt_template: 'Generate a follow-up for patient {{patient_name}}.',
    available_variables: ['patient_name', 'visit_date'],
    is_active: true,
    is_default: false
  };

  describe('GET /api/ai-prompts/usage-types', () => {
    it('should return usage types for any authenticated user', async () => {
      const res = await request(app)
        .get('/api/ai-prompts/usage-types')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should return usage types for dietitian', async () => {
      const res = await request(app)
        .get('/api/ai-prompts/usage-types')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/ai-prompts/usage-types');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/ai-prompts/usage/:usage', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      await db.AIPrompt.create({
        ...validPromptData,
        is_default: true,
        created_by: adminAuth.user.id
      });
    });

    it('should return active prompt for usage type', async () => {
      const res = await request(app)
        .get('/api/ai-prompts/usage/followup')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should return 404 when no active prompt exists', async () => {
      const res = await request(app)
        .get('/api/ai-prompts/usage/nonexistent')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/ai-prompts/usage/followup');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/ai-prompts (ADMIN only)', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      await db.AIPrompt.create({
        ...validPromptData,
        created_by: adminAuth.user.id
      });
    });

    it('should return all prompts for admin', async () => {
      const res = await request(app)
        .get('/api/ai-prompts')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get('/api/ai-prompts')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/ai-prompts/:id (ADMIN only)', () => {
    let prompt;

    beforeEach(async () => {
      const db = testDb.getDb();
      prompt = await db.AIPrompt.create({
        ...validPromptData,
        created_by: adminAuth.user.id
      });
    });

    it('should return prompt by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/ai-prompts/${prompt.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent prompt', async () => {
      const res = await request(app)
        .get('/api/ai-prompts/99999')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get(`/api/ai-prompts/${prompt.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/ai-prompts (ADMIN only)', () => {
    it('should create prompt as admin', async () => {
      const res = await request(app)
        .post('/api/ai-prompts')
        .set('Authorization', adminAuth.authHeader)
        .send(validPromptData);

      expect(res.status).toBe(201);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/ai-prompts')
        .set('Authorization', adminAuth.authHeader)
        .send({
          name: 'Incomplete prompt'
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/ai-prompts')
        .set('Authorization', dietitianAuth.authHeader)
        .send(validPromptData);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ai-prompts')
        .send(validPromptData);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/ai-prompts/:id (ADMIN only)', () => {
    let prompt;

    beforeEach(async () => {
      const db = testDb.getDb();
      prompt = await db.AIPrompt.create({
        ...validPromptData,
        created_by: adminAuth.user.id
      });
    });

    it('should update prompt as admin', async () => {
      const res = await request(app)
        .put(`/api/ai-prompts/${prompt.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          name: 'Updated Prompt Name',
          description: 'Updated description'
        });

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .put(`/api/ai-prompts/${prompt.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ name: 'Unauthorized Update' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/ai-prompts/:id (ADMIN only)', () => {
    let prompt;

    beforeEach(async () => {
      const db = testDb.getDb();
      prompt = await db.AIPrompt.create({
        ...validPromptData,
        created_by: adminAuth.user.id
      });
    });

    it('should delete prompt as admin', async () => {
      const res = await request(app)
        .delete(`/api/ai-prompts/${prompt.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .delete(`/api/ai-prompts/${prompt.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/ai-prompts/:id/set-default (ADMIN only)', () => {
    let prompt;

    beforeEach(async () => {
      const db = testDb.getDb();
      prompt = await db.AIPrompt.create({
        ...validPromptData,
        created_by: adminAuth.user.id
      });
    });

    it('should set prompt as default for admin', async () => {
      const res = await request(app)
        .post(`/api/ai-prompts/${prompt.id}/set-default`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post(`/api/ai-prompts/${prompt.id}/set-default`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/ai-prompts/:id/duplicate (ADMIN only)', () => {
    let prompt;

    beforeEach(async () => {
      const db = testDb.getDb();
      prompt = await db.AIPrompt.create({
        ...validPromptData,
        created_by: adminAuth.user.id
      });
    });

    it('should duplicate prompt as admin', async () => {
      const res = await request(app)
        .post(`/api/ai-prompts/${prompt.id}/duplicate`)
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Duplicated Prompt' });

      expect(res.status).toBe(201);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post(`/api/ai-prompts/${prompt.id}/duplicate`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
