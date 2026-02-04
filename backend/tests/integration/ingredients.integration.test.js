/**
 * Integration Tests for Ingredients Routes
 * Routes: search, lookup, categories CRUD+reorder+stats, ingredients CRUD+duplicate
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Ingredients API', () => {
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

  // --- Ingredient Categories ---
  describe('Ingredient Categories', () => {
    describe('GET /api/ingredients/categories', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.IngredientCategory.bulkCreate([
          { name: 'Fruits', display_order: 1, is_active: true, created_by: adminAuth.user.id },
          { name: 'Vegetables', display_order: 2, is_active: true, created_by: adminAuth.user.id },
          { name: 'Archived Cat', display_order: 3, is_active: false, created_by: adminAuth.user.id }
        ]);
      });

      it('should return all categories for admin', async () => {
        const res = await request(app)
          .get('/api/ingredients/categories')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return categories for dietitian with recipes.read', async () => {
        const res = await request(app)
          .get('/api/ingredients/categories')
          .set('Authorization', dietitianAuth.authHeader);

        expect(res.status).toBe(200);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .get('/api/ingredients/categories');

        expect(res.status).toBe(401);
      });

      it('should reject assistant without recipes.read', async () => {
        const res = await request(app)
          .get('/api/ingredients/categories')
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/ingredients/categories/stats', () => {
      it('should return category stats for admin', async () => {
        const res = await request(app)
          .get('/api/ingredients/categories/stats')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('POST /api/ingredients/categories', () => {
      it('should create category as admin', async () => {
        const res = await request(app)
          .post('/api/ingredients/categories')
          .set('Authorization', adminAuth.authHeader)
          .send({ name: 'Dairy Products', description: 'Milk, cheese, etc.' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create category as dietitian with recipes.create', async () => {
        const res = await request(app)
          .post('/api/ingredients/categories')
          .set('Authorization', dietitianAuth.authHeader)
          .send({ name: 'Grains' });

        expect(res.status).toBe(201);
      });

      it('should reject assistant without recipes.create', async () => {
        const res = await request(app)
          .post('/api/ingredients/categories')
          .set('Authorization', assistantAuth.authHeader)
          .send({ name: 'Unauthorized' });

        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/ingredients/categories/:id', () => {
      let category;

      beforeEach(async () => {
        const db = testDb.getDb();
        category = await db.IngredientCategory.create({
          name: 'Original Cat',
          display_order: 1,
          created_by: adminAuth.user.id
        });
      });

      it('should update category as admin', async () => {
        const res = await request(app)
          .put(`/api/ingredients/categories/${category.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ name: 'Updated Cat', color: '#FF5722' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('DELETE /api/ingredients/categories/:id', () => {
      let category;

      beforeEach(async () => {
        const db = testDb.getDb();
        category = await db.IngredientCategory.create({
          name: 'Deletable Cat',
          display_order: 1,
          created_by: adminAuth.user.id
        });
      });

      it('should delete category as admin', async () => {
        const res = await request(app)
          .delete(`/api/ingredients/categories/${category.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
      });

      it('should reject assistant without recipes.delete', async () => {
        const res = await request(app)
          .delete(`/api/ingredients/categories/${category.id}`)
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/ingredients/categories/reorder', () => {
      let categories;

      beforeEach(async () => {
        const db = testDb.getDb();
        categories = await db.IngredientCategory.bulkCreate([
          { name: 'Cat A', display_order: 1, created_by: adminAuth.user.id },
          { name: 'Cat B', display_order: 2, created_by: adminAuth.user.id }
        ]);
      });

      it('should reorder categories as admin', async () => {
        const res = await request(app)
          .post('/api/ingredients/categories/reorder')
          .set('Authorization', adminAuth.authHeader)
          .send({ ordered_ids: [categories[1].id, categories[0].id] });

        expect(res.status).toBe(200);
      });
    });
  });

  // --- Ingredients ---
  describe('Ingredients CRUD', () => {
    describe('GET /api/ingredients', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.Ingredient.bulkCreate([
          { name: 'Apple', name_normalized: 'apple', created_by: adminAuth.user.id },
          { name: 'Banana', name_normalized: 'banana', created_by: adminAuth.user.id },
          { name: 'Carrot', name_normalized: 'carrot', created_by: adminAuth.user.id }
        ]);
      });

      it('should return ingredients for admin', async () => {
        const res = await request(app)
          .get('/api/ingredients')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return ingredients for dietitian', async () => {
        const res = await request(app)
          .get('/api/ingredients')
          .set('Authorization', dietitianAuth.authHeader);

        expect(res.status).toBe(200);
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get('/api/ingredients?page=1&limit=2')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .get('/api/ingredients');

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/ingredients/search', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.Ingredient.bulkCreate([
          { name: 'Apple', name_normalized: 'apple', created_by: adminAuth.user.id },
          { name: 'Apricot', name_normalized: 'apricot', created_by: adminAuth.user.id }
        ]);
      });

      it('should search ingredients', async () => {
        const res = await request(app)
          .get('/api/ingredients/search?q=app')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .get('/api/ingredients/search?q=app');

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/ingredients/:id', () => {
      let ingredient;

      beforeEach(async () => {
        const db = testDb.getDb();
        ingredient = await db.Ingredient.create({
          name: 'Test Ingredient',
          name_normalized: 'test ingredient',
          created_by: adminAuth.user.id
        });
      });

      it('should return ingredient by ID', async () => {
        const res = await request(app)
          .get(`/api/ingredients/${ingredient.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('POST /api/ingredients', () => {
      it('should create ingredient as admin', async () => {
        const res = await request(app)
          .post('/api/ingredients')
          .set('Authorization', adminAuth.authHeader)
          .send({
            name: 'Quinoa',
            default_unit: 'g',
            nutrition_per_100g: { calories: 368, protein: 14.1 }
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create ingredient as dietitian', async () => {
        const res = await request(app)
          .post('/api/ingredients')
          .set('Authorization', dietitianAuth.authHeader)
          .send({ name: 'Tofu' });

        expect(res.status).toBe(201);
      });

      it('should reject assistant without recipes.create', async () => {
        const res = await request(app)
          .post('/api/ingredients')
          .set('Authorization', assistantAuth.authHeader)
          .send({ name: 'Unauthorized Ingredient' });

        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/ingredients/:id', () => {
      let ingredient;

      beforeEach(async () => {
        const db = testDb.getDb();
        ingredient = await db.Ingredient.create({
          name: 'Original Name',
          name_normalized: 'original name',
          created_by: adminAuth.user.id
        });
      });

      it('should update ingredient as admin', async () => {
        const res = await request(app)
          .put(`/api/ingredients/${ingredient.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ name: 'Updated Name' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('DELETE /api/ingredients/:id', () => {
      let ingredient;

      beforeEach(async () => {
        const db = testDb.getDb();
        ingredient = await db.Ingredient.create({
          name: 'Deletable',
          name_normalized: 'deletable',
          created_by: adminAuth.user.id
        });
      });

      it('should delete ingredient as admin', async () => {
        const res = await request(app)
          .delete(`/api/ingredients/${ingredient.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
      });

      it('should reject assistant without recipes.delete', async () => {
        const res = await request(app)
          .delete(`/api/ingredients/${ingredient.id}`)
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/ingredients/:id/duplicate', () => {
      let ingredient;

      beforeEach(async () => {
        const db = testDb.getDb();
        ingredient = await db.Ingredient.create({
          name: 'Duplicable',
          name_normalized: 'duplicable',
          created_by: adminAuth.user.id
        });
      });

      it('should duplicate ingredient as admin', async () => {
        const res = await request(app)
          .post(`/api/ingredients/${ingredient.id}/duplicate`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should reject assistant without recipes.create', async () => {
        const res = await request(app)
          .post(`/api/ingredients/${ingredient.id}/duplicate`)
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });
  });
});
