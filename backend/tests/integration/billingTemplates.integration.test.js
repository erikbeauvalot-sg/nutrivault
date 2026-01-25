/**
 * Billing Templates Integration Tests
 * Tests for /api/billing-templates endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { billingTemplates: templateFixtures } = require('../fixtures');

let app;

describe('Billing Templates API', () => {
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
  // GET /api/billing-templates
  // ========================================
  describe('GET /api/billing-templates', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      for (const template of templateFixtures.templatesList) {
        const created = await db.BillingTemplate.create({
          name: template.name,
          description: template.description,
          is_active: template.is_active,
          created_by: adminAuth.user.id
        });
        // Create items
        for (const item of template.items) {
          await db.BillingTemplateItem.create({
            ...item,
            billing_template_id: created.id
          });
        }
      }
    });

    it('should return list of billing templates for admin', async () => {
      const res = await request(app)
        .get('/api/billing-templates')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return templates for dietitian', async () => {
      const res = await request(app)
        .get('/api/billing-templates')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/billing-templates');

      expect(res.status).toBe(401);
    });

    it('should filter active templates', async () => {
      const res = await request(app)
        .get('/api/billing-templates?is_active=true')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/billing-templates/:id
  // ========================================
  describe('GET /api/billing-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.BillingTemplate.create({
        name: templateFixtures.validTemplate.name,
        description: templateFixtures.validTemplate.description,
        is_active: templateFixtures.validTemplate.is_active,
        created_by: adminAuth.user.id
      });
      // Create items
      for (const item of templateFixtures.validTemplate.items) {
        await db.BillingTemplateItem.create({
          ...item,
          billing_template_id: testTemplate.id
        });
      }
    });

    it('should return template by ID with items', async () => {
      const res = await request(app)
        .get(`/api/billing-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testTemplate.id);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .get('/api/billing-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // POST /api/billing-templates
  // ========================================
  describe('POST /api/billing-templates', () => {
    it('should create a template as admin', async () => {
      const res = await request(app)
        .post('/api/billing-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.validTemplate);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(templateFixtures.validTemplate.name);
    });

    it('should create a template with multiple items', async () => {
      const res = await request(app)
        .post('/api/billing-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.multiItemTemplate);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create a template with tax', async () => {
      const res = await request(app)
        .post('/api/billing-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateWithTax);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject template without name', async () => {
      const res = await request(app)
        .post('/api/billing-templates')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.invalidTemplates.missingName);

      expect(res.status).toBe(400);
    });

    it('should reject template without authentication', async () => {
      const res = await request(app)
        .post('/api/billing-templates')
        .send(templateFixtures.validTemplate);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/billing-templates/:id
  // ========================================
  describe('PUT /api/billing-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.BillingTemplate.create({
        name: templateFixtures.validTemplate.name,
        description: templateFixtures.validTemplate.description,
        is_active: templateFixtures.validTemplate.is_active,
        created_by: adminAuth.user.id
      });
    });

    it('should update template name', async () => {
      const res = await request(app)
        .put(`/api/billing-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.updateName);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update template description', async () => {
      const res = await request(app)
        .put(`/api/billing-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.updateDescription);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deactivate template', async () => {
      const res = await request(app)
        .put(`/api/billing-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.deactivate);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .put('/api/billing-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send(templateFixtures.templateUpdates.updateName);

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // DELETE /api/billing-templates/:id
  // ========================================
  describe('DELETE /api/billing-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      const db = testDb.getDb();
      testTemplate = await db.BillingTemplate.create({
        name: templateFixtures.validTemplate.name,
        description: templateFixtures.validTemplate.description,
        is_active: templateFixtures.validTemplate.is_active,
        created_by: adminAuth.user.id
      });
    });

    it('should delete template as admin', async () => {
      const res = await request(app)
        .delete(`/api/billing-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .delete('/api/billing-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/billing-templates/${testTemplate.id}`);

      expect(res.status).toBe(401);
    });
  });
});
