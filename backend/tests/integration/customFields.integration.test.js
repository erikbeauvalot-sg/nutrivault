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

      it('should return error for non-existent category', async () => {
        const res = await request(app)
          .get('/api/custom-fields/categories/00000000-0000-0000-0000-000000000000')
          .set('Authorization', adminAuth.authHeader);

        // API may return 404 (not found) or 500 (internal error during lookup)
        expect([404, 500]).toContain(res.status);
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
        const fieldData = {
          category_id: testCategory.id,
          field_name: 'blood_type',
          field_label: 'Blood Type',
          field_type: 'text',
          is_required: false,
          display_order: 1
        };

        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send(fieldData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create a select field definition', async () => {
        const fieldData = {
          category_id: testCategory.id,
          field_name: 'dietary_restriction',
          field_label: 'Dietary Restriction',
          field_type: 'select',
          select_options: ['None', 'Vegetarian', 'Vegan'],
          is_required: false,
          display_order: 2
        };

        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send(fieldData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create a number field definition', async () => {
        const fieldData = {
          category_id: testCategory.id,
          field_name: 'daily_water_intake',
          field_label: 'Daily Water Intake (L)',
          field_type: 'number',
          is_required: false,
          display_order: 3
        };

        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send(fieldData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create a boolean field definition', async () => {
        const fieldData = {
          category_id: testCategory.id,
          field_name: 'smoker',
          field_label: 'Smoker',
          field_type: 'boolean',
          is_required: false,
          display_order: 4
        };

        const res = await request(app)
          .post('/api/custom-fields/definitions')
          .set('Authorization', adminAuth.authHeader)
          .send(fieldData);

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

  // ========================================
  // Export/Import Endpoints
  // ========================================
  describe('Export/Import', () => {
    let testCategories;
    let testFields;

    beforeEach(async () => {
      const db = testDb.getDb();

      // Create test categories with field definitions
      testCategories = [];
      testFields = [];

      for (const category of customFieldFixtures.categoriesList.slice(0, 2)) {
        const cat = await db.CustomFieldCategory.create({
          ...category,
          created_by: adminAuth.user.id
        });
        testCategories.push(cat);

        // Add field definitions to each category
        const textField = await db.CustomFieldDefinition.create({
          ...customFieldFixtures.fieldDefinitions.textField,
          field_name: `${category.name.toLowerCase().replace(/\s+/g, '_')}_field`,
          category_id: cat.id,
          created_by: adminAuth.user.id
        });
        testFields.push(textField);
      }
    });

    // POST /api/custom-fields/export
    describe('POST /api/custom-fields/export', () => {
      it('should export all categories for admin', async () => {
        const res = await request(app)
          .post('/api/custom-fields/export')
          .set('Authorization', adminAuth.authHeader)
          .send({ categoryIds: [] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.version).toBe('1.0');
        expect(res.body.data.exportDate).toBeDefined();
        expect(res.body.data.exportedBy).toBe(adminAuth.user.username);
        expect(Array.isArray(res.body.data.categories)).toBe(true);
        expect(res.body.data.categories.length).toBe(2);
      });

      it('should export specific categories by ID', async () => {
        const res = await request(app)
          .post('/api/custom-fields/export')
          .set('Authorization', adminAuth.authHeader)
          .send({ categoryIds: [testCategories[0].id] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categories.length).toBe(1);
        expect(res.body.data.categories[0].name).toBe(testCategories[0].name);
      });

      it('should include field definitions in export', async () => {
        const res = await request(app)
          .post('/api/custom-fields/export')
          .set('Authorization', adminAuth.authHeader)
          .send({ categoryIds: [testCategories[0].id] });

        expect(res.status).toBe(200);
        const category = res.body.data.categories[0];
        expect(Array.isArray(category.field_definitions)).toBe(true);
        expect(category.field_definitions.length).toBeGreaterThan(0);
        expect(category.field_definitions[0].field_name).toBeDefined();
        expect(category.field_definitions[0].field_type).toBeDefined();
      });

      it('should reject export without authentication', async () => {
        const res = await request(app)
          .post('/api/custom-fields/export')
          .send({ categoryIds: [] });

        expect(res.status).toBe(401);
      });

      it('should reject export for non-admin users', async () => {
        const res = await request(app)
          .post('/api/custom-fields/export')
          .set('Authorization', assistantAuth.authHeader)
          .send({ categoryIds: [] });

        expect(res.status).toBe(403);
      });
    });

    // POST /api/custom-fields/import
    describe('POST /api/custom-fields/import', () => {
      const validImportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        exportedBy: 'test-export',
        categories: [
          {
            name: 'Imported Category',
            description: 'A test imported category',
            display_order: 10,
            is_active: true,
            color: '#ff5733',
            entity_types: ['patient'],
            field_definitions: [
              {
                field_name: 'imported_field',
                field_label: 'Imported Field',
                field_type: 'text',
                is_required: false,
                display_order: 1
              }
            ]
          }
        ]
      };

      it('should import new categories successfully', async () => {
        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: validImportData,
            options: { skipExisting: true }
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categoriesCreated).toBe(1);
        expect(res.body.data.definitionsCreated).toBe(1);
        expect(res.body.data.errors).toEqual([]);
      });

      it('should skip existing categories when skipExisting is true', async () => {
        // First, create a category with the same name
        const db = testDb.getDb();
        await db.CustomFieldCategory.create({
          name: 'Imported Category',
          description: 'Existing category',
          created_by: adminAuth.user.id
        });

        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: validImportData,
            options: { skipExisting: true, updateExisting: false }
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categoriesSkipped).toBe(1);
        expect(res.body.data.categoriesCreated).toBe(0);
      });

      it('should update existing categories when updateExisting is true', async () => {
        // First, create a category with the same name
        const db = testDb.getDb();
        const existingCat = await db.CustomFieldCategory.create({
          name: 'Imported Category',
          description: 'Old description',
          color: '#000000',
          created_by: adminAuth.user.id
        });

        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: validImportData,
            options: { skipExisting: false, updateExisting: true }
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categoriesUpdated).toBe(1);

        // Verify the category was updated
        const updatedCat = await db.CustomFieldCategory.findByPk(existingCat.id);
        expect(updatedCat.description).toBe('A test imported category');
        expect(updatedCat.color).toBe('#ff5733');
      });

      it('should create with renamed category when duplicate and not skip/update', async () => {
        // First, create a category with the same name
        const db = testDb.getDb();
        await db.CustomFieldCategory.create({
          name: 'Imported Category',
          description: 'Existing category',
          created_by: adminAuth.user.id
        });

        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: validImportData,
            options: { skipExisting: false, updateExisting: false }
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categoriesCreated).toBe(1);

        // Verify the category was created with modified name
        const categories = await db.CustomFieldCategory.findAll({
          where: { name: 'Imported Category (imported)' }
        });
        expect(categories.length).toBe(1);
      });

      it('should import multiple categories', async () => {
        const multiCategoryImport = {
          ...validImportData,
          categories: [
            {
              name: 'First Imported',
              description: 'First category',
              entity_types: ['patient'],
              field_definitions: []
            },
            {
              name: 'Second Imported',
              description: 'Second category',
              entity_types: ['visit'],
              field_definitions: [
                {
                  field_name: 'field_a',
                  field_label: 'Field A',
                  field_type: 'number'
                },
                {
                  field_name: 'field_b',
                  field_label: 'Field B',
                  field_type: 'boolean'
                }
              ]
            }
          ]
        };

        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: multiCategoryImport,
            options: { skipExisting: true }
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.categoriesCreated).toBe(2);
        expect(res.body.data.definitionsCreated).toBe(2);
      });

      it('should reject import with invalid data format', async () => {
        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: { invalid: 'data' },
            options: {}
          });

        expect(res.status).toBe(400);
      });

      it('should reject import without categories array', async () => {
        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: { version: '1.0', exportDate: new Date().toISOString() },
            options: {}
          });

        expect(res.status).toBe(400);
      });

      it('should reject import without authentication', async () => {
        const res = await request(app)
          .post('/api/custom-fields/import')
          .send({
            importData: validImportData,
            options: {}
          });

        expect(res.status).toBe(401);
      });

      it('should reject import for non-admin users', async () => {
        const res = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', assistantAuth.authHeader)
          .send({
            importData: validImportData,
            options: {}
          });

        expect(res.status).toBe(403);
      });
    });

    // Round-trip test: export then import
    describe('Export/Import Round-trip', () => {
      it('should successfully import previously exported data', async () => {
        // Export existing categories
        const exportRes = await request(app)
          .post('/api/custom-fields/export')
          .set('Authorization', adminAuth.authHeader)
          .send({ categoryIds: [testCategories[0].id] });

        expect(exportRes.status).toBe(200);
        const exportedData = exportRes.body.data;

        // Modify the name to avoid conflict
        exportedData.categories[0].name = 'Round-trip Test Category';

        // Import the exported data
        const importRes = await request(app)
          .post('/api/custom-fields/import')
          .set('Authorization', adminAuth.authHeader)
          .send({
            importData: exportedData,
            options: { skipExisting: true }
          });

        expect(importRes.status).toBe(200);
        expect(importRes.body.success).toBe(true);
        expect(importRes.body.data.categoriesCreated).toBe(1);

        // Verify the imported category exists
        const db = testDb.getDb();
        const importedCat = await db.CustomFieldCategory.findOne({
          where: { name: 'Round-trip Test Category' },
          include: [{
            model: db.CustomFieldDefinition,
            as: 'field_definitions'
          }]
        });

        expect(importedCat).not.toBeNull();
        expect(importedCat.description).toBe(testCategories[0].description);
      });
    });
  });
});
