/**
 * Consultation Templates Integration Tests
 * Tests for /api/consultation-templates endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures } = require('../fixtures');

let app;

describe('Consultation Templates API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testPatient;

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

    // Clean models not in testDb.reset() list (they ARE in the list now, but destroy
    // explicitly to ensure a clean slate in correct order)
    await db.ConsultationTemplateItem.destroy({ where: {}, force: true });
    await db.ConsultationTemplate.destroy({ where: {}, force: true });

    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      assigned_dietitian_id: dietitianAuth.user.id
    });
    await db.PatientDietitian.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // Helper: create a template directly in DB
  // ========================================
  async function createTemplateInDb(userId, overrides = {}) {
    const db = testDb.getDb();
    return db.ConsultationTemplate.create({
      name: overrides.name || 'Test Template',
      description: overrides.description || 'A test template',
      template_type: overrides.template_type || 'general',
      visibility: overrides.visibility || 'private',
      is_default: overrides.is_default || false,
      created_by: userId,
      ...overrides
    });
  }

  // ========================================
  // GET /api/consultation-templates
  // ========================================
  describe('GET /api/consultation-templates', () => {
    beforeEach(async () => {
      // Create a shared template visible to everyone
      await createTemplateInDb(adminAuth.user.id, { name: 'Admin Template', visibility: 'shared' });
      // Create a private template for the dietitian
      await createTemplateInDb(dietitianAuth.user.id, { name: 'Dietitian Private', visibility: 'private' });
    });

    it('should return 200 with list of templates for admin', async () => {
      const res = await request(app)
        .get('/api/consultation-templates')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 200 with templates for dietitian (own + shared)', async () => {
      const res = await request(app)
        .get('/api/consultation-templates')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Dietitian sees their own private + the shared admin one
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 200 for assistant (has consultation_templates.read)', async () => {
      const res = await request(app)
        .get('/api/consultation-templates')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/consultation-templates');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST /api/consultation-templates
  // ========================================
  describe('POST /api/consultation-templates', () => {
    it('should create a template as admin with minimal data', async () => {
      const res = await request(app)
        .post('/api/consultation-templates')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'New Admin Template' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Admin Template');
      expect(res.body.data.created_by).toBe(adminAuth.user.id);
    });

    it('should create a template as dietitian with full data', async () => {
      const res = await request(app)
        .post('/api/consultation-templates')
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          name: 'Dietitian Full Template',
          description: 'A comprehensive template',
          template_type: 'follow_up',
          visibility: 'shared',
          color: '#4a9e6f',
          tags: ['nutrition', 'weight'],
          is_default: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Dietitian Full Template');
      expect(res.body.data.visibility).toBe('shared');
    });

    it('should create a template with inline items', async () => {
      const res = await request(app)
        .post('/api/consultation-templates')
        .set('Authorization', adminAuth.authHeader)
        .send({
          name: 'Template With Items',
          items: [
            {
              item_type: 'instruction',
              display_order: 0,
              instruction_title: 'Welcome note',
              instruction_content: 'Welcome to your consultation.'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].instruction_title).toBe('Welcome note');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/consultation-templates')
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'No name provided' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/consultation-templates')
        .send({ name: 'Unauthenticated Template' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no consultation_templates.create permission)', async () => {
      const res = await request(app)
        .post('/api/consultation-templates')
        .set('Authorization', assistantAuth.authHeader)
        .send({ name: 'Assistant Template' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/consultation-templates/:id
  // ========================================
  describe('GET /api/consultation-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      testTemplate = await createTemplateInDb(dietitianAuth.user.id, {
        name: 'Visible Template',
        visibility: 'shared'
      });
    });

    it('should return 200 with template data for admin', async () => {
      const res = await request(app)
        .get(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testTemplate.id);
      expect(res.body.data.name).toBe('Visible Template');
    });

    it('should return 200 for dietitian who owns the template', async () => {
      const res = await request(app)
        .get(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 200 for assistant reading a shared template', async () => {
      const res = await request(app)
        .get(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .get('/api/consultation-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/consultation-templates/${testTemplate.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/consultation-templates/:id
  // ========================================
  describe('PUT /api/consultation-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      testTemplate = await createTemplateInDb(dietitianAuth.user.id, {
        name: 'Template To Update'
      });
    });

    it('should update template as admin', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Updated By Admin', description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated By Admin');
    });

    it('should update template as the owning dietitian', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ name: 'Updated By Dietitian', color: '#336699' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated By Dietitian');
    });

    it('should update visibility to shared', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ visibility: 'shared' });

      expect(res.status).toBe(200);
      expect(res.body.data.visibility).toBe('shared');
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .put('/api/consultation-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/${testTemplate.id}`)
        .send({ name: 'No Auth' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ name: 'Assistant Update' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/consultation-templates/:id
  // ========================================
  describe('DELETE /api/consultation-templates/:id', () => {
    let testTemplate;

    beforeEach(async () => {
      testTemplate = await createTemplateInDb(adminAuth.user.id, {
        name: 'Template To Delete'
      });
    });

    it('should delete template as admin', async () => {
      const res = await request(app)
        .delete(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should delete own template as dietitian', async () => {
      const db = testDb.getDb();
      const ownTemplate = await createTemplateInDb(dietitianAuth.user.id, {
        name: 'Dietitian Own Template'
      });

      const res = await request(app)
        .delete(`/api/consultation-templates/${ownTemplate.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .delete('/api/consultation-templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .delete(`/api/consultation-templates/${testTemplate.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/consultation-templates/${testTemplate.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // POST /api/consultation-templates/:id/duplicate
  // ========================================
  describe('POST /api/consultation-templates/:id/duplicate', () => {
    let testTemplate;

    beforeEach(async () => {
      testTemplate = await createTemplateInDb(adminAuth.user.id, {
        name: 'Original Template',
        visibility: 'shared'
      });
    });

    it('should duplicate a template as admin', async () => {
      const res = await request(app)
        .post(`/api/consultation-templates/${testTemplate.id}/duplicate`)
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Copy of Original Template' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).not.toBe(testTemplate.id);
      expect(res.body.data.created_by).toBe(adminAuth.user.id);
    });

    it('should duplicate a template as dietitian', async () => {
      const res = await request(app)
        .post(`/api/consultation-templates/${testTemplate.id}/duplicate`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ name: 'Dietitian Copy' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created_by).toBe(dietitianAuth.user.id);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .post('/api/consultation-templates/00000000-0000-0000-0000-000000000000/duplicate')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Ghost Copy' });

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/consultation-templates/${testTemplate.id}/duplicate`)
        .send({ name: 'Unauth Copy' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no create permission)', async () => {
      const res = await request(app)
        .post(`/api/consultation-templates/${testTemplate.id}/duplicate`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ name: 'Assistant Copy' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // POST /api/consultation-templates/:id/items
  // ========================================
  describe('POST /api/consultation-templates/:id/items', () => {
    let testTemplate;

    beforeEach(async () => {
      testTemplate = await createTemplateInDb(adminAuth.user.id, {
        name: 'Template For Items'
      });
    });

    it('should add an instruction item to a template as admin', async () => {
      const res = await request(app)
        .post(`/api/consultation-templates/${testTemplate.id}/items`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          item_type: 'instruction',
          instruction_title: 'Dietary Guidelines',
          instruction_content: 'Please review the attached guidelines.',
          display_order: 0
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item_type).toBe('instruction');
      expect(res.body.data.instruction_title).toBe('Dietary Guidelines');
    });

    it('should add an instruction item as dietitian', async () => {
      const ownTemplate = await createTemplateInDb(dietitianAuth.user.id, {
        name: 'Dietitian Item Template'
      });

      const res = await request(app)
        .post(`/api/consultation-templates/${ownTemplate.id}/items`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          item_type: 'instruction',
          instruction_title: 'Follow-up Notes',
          display_order: 0
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .post('/api/consultation-templates/00000000-0000-0000-0000-000000000000/items')
        .set('Authorization', adminAuth.authHeader)
        .send({ item_type: 'instruction' });

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/consultation-templates/${testTemplate.id}/items`)
        .send({ item_type: 'instruction' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no update permission)', async () => {
      const res = await request(app)
        .post(`/api/consultation-templates/${testTemplate.id}/items`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ item_type: 'instruction' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // PUT /api/consultation-templates/items/:itemId
  // ========================================
  describe('PUT /api/consultation-templates/items/:itemId', () => {
    let testTemplate;
    let testItem;

    beforeEach(async () => {
      testTemplate = await createTemplateInDb(adminAuth.user.id, { name: 'Item Update Template' });

      const db = testDb.getDb();
      testItem = await db.ConsultationTemplateItem.create({
        template_id: testTemplate.id,
        item_type: 'instruction',
        instruction_title: 'Original Title',
        instruction_content: 'Original content',
        display_order: 0
      });
    });

    it('should update an item as admin', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/items/${testItem.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          instruction_title: 'Updated Title',
          instruction_content: 'Updated content'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.instruction_title).toBe('Updated Title');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .put('/api/consultation-templates/items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send({ instruction_title: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/items/${testItem.id}`)
        .send({ instruction_title: 'No auth' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/consultation-templates/items/${testItem.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ instruction_title: 'Assistant update' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/consultation-templates/items/:itemId
  // ========================================
  describe('DELETE /api/consultation-templates/items/:itemId', () => {
    let testTemplate;
    let testItem;

    beforeEach(async () => {
      testTemplate = await createTemplateInDb(adminAuth.user.id, { name: 'Item Delete Template' });

      const db = testDb.getDb();
      testItem = await db.ConsultationTemplateItem.create({
        template_id: testTemplate.id,
        item_type: 'instruction',
        instruction_title: 'Item To Delete',
        display_order: 0
      });
    });

    it('should delete an item as admin', async () => {
      const res = await request(app)
        .delete(`/api/consultation-templates/items/${testItem.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .delete('/api/consultation-templates/items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .delete(`/api/consultation-templates/items/${testItem.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/consultation-templates/items/${testItem.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
