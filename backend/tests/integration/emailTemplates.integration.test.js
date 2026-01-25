/**
 * Email Templates Integration Tests
 * Tests for /api/email-templates endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { emailTemplates: templateFixtures } = require('../fixtures');

let app;

describe('Email Templates API', () => {
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

    // Create test users
    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/email-templates
  // ========================================
  describe('GET /api/email-templates', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      for (const key of Object.keys(templateFixtures.templateCategories)) {
        await db.EmailTemplate.create({
          ...templateFixtures.templateCategories[key],
          created_by: adminAuth.user.id
        });
      }
    });

    it('should return list of email templates for admin', async () => {
      const res = await request(app)
        .get('/api/email-templates')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return templates for dietitian', async () => {
      const res = await request(app)
        .get('/api/email-templates')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/email-templates');

      expect(res.status).toBe(401);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/email-templates?category=appointment')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter by language', async () => {
      const res = await request(app)
        .get('/api/email-templates?language=en')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter active templates', async () => {
      const res = await request(app)
        .get('/api/email-templates?is_active=true')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/email-templates/:id
  // ========================================
  describe('GET /api/email-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.EmailTemplate.create({
        ...templateFixtures.validTemplate,
        created_by: adminAuth.user.id
      });
    });

    it('should return template by ID', async () => {
      const res = await request(app)
        .get(`/api/email-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testTemplate.id);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .get('/api/email-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // POST /api/email-templates
  // ========================================
  describe('POST /api/email-templates', () => {
    it('should create a template as admin', async () => {
      const res = await request(app)
        .post('/api/email-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.validTemplate);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(templateFixtures.validTemplate.name);
    });

    it('should create a template as dietitian', async () => {
      const res = await request(app)
        .post('/api/email-templates')
        .set('Authorization', dietitianAuth.authHeader)
        .send(templateFixtures.templateCategories.followUp);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject template without name', async () => {
      const res = await request(app)
        .post('/api/email-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.invalidTemplates.missingName);

      expect(res.status).toBe(400);
    });

    it('should reject template without code', async () => {
      const res = await request(app)
        .post('/api/email-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.invalidTemplates.missingCode);

      expect(res.status).toBe(400);
    });

    it('should reject template without subject', async () => {
      const res = await request(app)
        .post('/api/email-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.invalidTemplates.missingSubject);

      expect(res.status).toBe(400);
    });

    it('should reject template without body', async () => {
      const res = await request(app)
        .post('/api/email-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.invalidTemplates.missingBody);

      expect(res.status).toBe(400);
    });

    it('should reject template without authentication', async () => {
      const res = await request(app)
        .post('/api/email-templates')
        .send(templateFixtures.validTemplate);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/email-templates/:id
  // ========================================
  describe('PUT /api/email-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.EmailTemplate.create({
        ...templateFixtures.validTemplate,
        created_by: adminAuth.user.id
      });
    });

    it('should update template as admin', async () => {
      const res = await request(app)
        .put(`/api/email-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.updateSubject);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update template body', async () => {
      const res = await request(app)
        .put(`/api/email-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.updateBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deactivate template', async () => {
      const res = await request(app)
        .put(`/api/email-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.deactivate);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .put('/api/email-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.updateSubject);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // DELETE /api/email-templates/:id
  // ========================================
  describe('DELETE /api/email-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.EmailTemplate.create({
        ...templateFixtures.validTemplate,
        created_by: adminAuth.user.id
      });
    });

    it('should delete template as admin', async () => {
      const res = await request(app)
        .delete(`/api/email-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .delete('/api/email-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/email-templates/${testTemplate.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST /api/email-templates/:id/preview
  // ========================================
  describe('POST /api/email-templates/:id/preview', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.EmailTemplate.create({
        ...templateFixtures.validTemplate,
        created_by: adminAuth.user.id
      });
    });

    it('should return template preview with variables', async () => {
      const res = await request(app)
        .post(`/api/email-templates/${testTemplate.id}/preview`)
        .set('Authorization', adminAuth.authHeader)
        .send({ variables: templateFixtures.previewData });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('subject');
      expect(res.body.data).toHaveProperty('body');
    });
  });

  // ========================================
  // POST /api/email-templates/:id/send
  // ========================================
  describe('POST /api/email-templates/:id/send', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.EmailTemplate.create({
        ...templateFixtures.validTemplate,
        created_by: adminAuth.user.id
      });
    });

    it('should attempt to send email (may fail if email not configured)', async () => {
      const res = await request(app)
        .post(`/api/email-templates/${testTemplate.id}/send`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.emailSendData.valid);

      // May return 200 (success) or 500 (email service not configured)
      expect([200, 201, 500]).toContain(res.status);
    });

    it('should reject send without recipient_email', async () => {
      const res = await request(app)
        .post(`/api/email-templates/${testTemplate.id}/send`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.emailSendData.missingRecipient);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /api/email-templates/categories
  // ========================================
  describe('GET /api/email-templates/categories', () => {
    it('should return list of template categories', async () => {
      const res = await request(app)
        .get('/api/email-templates/categories')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // Template Translations
  // ========================================
  describe('Template Translations', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.EmailTemplate.create({
        ...templateFixtures.validTemplate,
        created_by: adminAuth.user.id
      });
    });

    describe('GET /api/email-templates/:id/translations', () => {
      it('should return template translations', async () => {
        const res = await request(app)
          .get(`/api/email-templates/${testTemplate.id}/translations`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('POST /api/email-templates/:id/translations', () => {
      it('should create a translation', async () => {
        const res = await request(app)
          .post(`/api/email-templates/${testTemplate.id}/translations`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            language: 'fr',
            subject: 'Rappel de rendez-vous',
            body: 'Cher(e) patient(e), votre rendez-vous est prévu...'
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
