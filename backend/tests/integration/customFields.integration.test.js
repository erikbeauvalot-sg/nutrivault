/**
 * Custom Fields Integration Tests
 * Tests for /api/custom-fields endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { customFields: customFieldFixtures } = require('../fixtures');

let app;

describe('Custom Fields API', () => {
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
  // Category Endpoints
  // ========================================
  describe('Categories', () => {
    // GET /api/custom-fields/categories
    describe('GET /api/custom-fields/categories', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        for (const category of customFieldFixtures.categoriesList) {
          await db.CustomFieldCategory.create({
            ...category,
            created_by: adminAuth.user.id
          });
        }
      });

      it('should return list of categories for admin', async () => {
        const res = await request(app)
          .get('/api/custom-fields/categories')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return categories for dietitian', async () => {
        const res = await request(app)
          .get('/api/custom-fields/categories')
          .set('Authorization', dietitianAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject request without authentication', async () => {
        const res = await request(app)
          .get('/api/custom-fields/categories');

        expect(res.status).toBe(401);
      });

      it('should filter by entity_type', async () => {
        const res = await request(app)
          .get('/api/custom-fields/categories?entity_type=patient')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // GET /api/custom-fields/categories/:id
    describe('GET /api/custom-fields/categories/:id', () => {
      let testCategory;

      beforeEach(async () => {
        const db = testDb.getDb();
        testCategory = await db.CustomFieldCategory.create({
          ...customFieldFixtures.validCategory,
          created_by: adminAuth.user.id
        });
      });

      it('should return category by ID', async () => {
        const res = await request(app)
          .get(`/api/custom-fields/categories/${testCategory.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(testCategory.id);
      });

      it('should return 404 for non-existent category', async () => {
        const res = await request(app)
          .get('/api/custom-fields/categories/00000000-0000-0000-0000-000000000000')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(404);
      });
    });

    // POST /api/custom-fields/categories
    describe('POST /api/custom-fields/categories', () => {
      it('should create a category as admin', async () => {
        const res = await request(app)
          .post('/api/custom-fields/categories')
          .set('Authorization', adminAuth.authHeader)
          .send(customFieldFixtures.validCategory);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe(customFieldFixtures.validCategory.name);
      });

      it('should reject category creation without name', async () => {
        const res = await request(app)
          .post('/api/custom-fields/categories')
          .set('Authorization', adminAuth.authHeader)
          .send(customFieldFixtures.invalidCategories.missingName);

        expect(res.status).toBe(400);
      });

      it('should reject category creation without authentication', async () => {
        const res = await request(app)
          .post('/api/custom-fields/categories')
          .send(customFieldFixtures.validCategory);

        expect(res.status).toBe(401);
      });
    });

    // PUT /api/custom-fields/categories/:id
    describe('PUT /api/custom-fields/categories/:id', () => {
      let testCategory;

      beforeEach(async () => {
        const db = testDb.getDb();
        testCategory = await db.CustomFieldCategory.create({
          ...customFieldFixtures.validCategory,
          created_by: adminAuth.user.id
        });
      });

      it('should update category as admin', async () => {
        const res = await request(app)
          .put(`/api/custom-fields/categories/${testCategory.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(customFieldFixtures.categoryUpdates.updateName);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should deactivate category', async () => {
        const res = await request(app)
          .put(`/api/custom-fields/categories/${testCategory.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(customFieldFixtures.categoryUpdates.deactivate);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // DELETE /api/custom-fields/categories/:id
    describe('DELETE /api/custom-fields/categories/:id', () => {
      let testCategory;

      beforeEach(async () => {
        const db = testDb.getDb();
        testCategory = await db.CustomFieldCategory.create({
          ...customFieldFixtures.validCategory,
          created_by: adminAuth.user.id
        });
      });

      it('should delete category as admin', async () => {
        const res = await request(app)
          .delete(`/api/custom-fields/categories/${testCategory.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ========================================
  // Field Definition Endpoints
  // ========================================
  describe('Field Definitions', () => {
    let testCategory;

    beforeEach(async () => {
      const db = testDb.getDb();
      testCategory = await db.CustomFieldCategory.create({
        ...customFieldFixtures.validCategory,
        created_by: adminAuth.user.id
      });
    });

    // GET /api/custom-fields/definitions
    describe('GET /api/custom-fields/definitions', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.CustomFieldDefinition.create({
          ...customFieldFixtures.fieldDefinitions.textField,
          category_id: testCategory.id,
          created_by: adminAuth.user.id
        });
      });

      it('should return list of field definitions', async () => {
        const res = await request(app)
          .get('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter by category_id', async () => {
        const res = await request(app)
          .get(`/api/custom-fields/definitions?category_id=${testCategory.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // POST /api/custom-fields/definitions
    describe('POST /api/custom-fields/definitions', () => {
      it('should create a text field definition', async () => {
        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send({
            ...customFieldFixtures.fieldDefinitions.textField,
            category_id: testCategory.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create a select field definition', async () => {
        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send({
            ...customFieldFixtures.fieldDefinitions.selectField,
            category_id: testCategory.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create a number field definition', async () => {
        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send({
            ...customFieldFixtures.fieldDefinitions.numberField,
            category_id: testCategory.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create a boolean field definition', async () => {
        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send({
            ...customFieldFixtures.fieldDefinitions.booleanField,
            category_id: testCategory.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should reject field definition without name', async () => {
        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send({
            ...customFieldFixtures.invalidFields.missingName,
            category_id: testCategory.id
          });

        expect(res.status).toBe(400);
      });
    });

    // PUT /api/custom-fields/definitions/:id
    describe('PUT /api/custom-fields/definitions/:id', () => {
      let testField;

      beforeEach(async () => {
        const db = testDb.getDb();
        testField = await db.CustomFieldDefinition.create({
          ...customFieldFixtures.fieldDefinitions.textField,
          category_id: testCategory.id,
          created_by: adminAuth.user.id
        });
      });

      it('should update field definition', async () => {
        const res = await request(app)
          .put(`/api/custom-fields/definitions/${testField.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(customFieldFixtures.fieldUpdates.updateLabel);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should make field required', async () => {
        const res = await request(app)
          .put(`/api/custom-fields/definitions/${testField.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(customFieldFixtures.fieldUpdates.makeRequired);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // DELETE /api/custom-fields/definitions/:id
    describe('DELETE /api/custom-fields/definitions/:id', () => {
      let testField;

      beforeEach(async () => {
        const db = testDb.getDb();
        testField = await db.CustomFieldDefinition.create({
          ...customFieldFixtures.fieldDefinitions.textField,
          category_id: testCategory.id,
          created_by: adminAuth.user.id
        });
      });

      it('should delete field definition', async () => {
        const res = await request(app)
          .delete(`/api/custom-fields/definitions/${testField.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
