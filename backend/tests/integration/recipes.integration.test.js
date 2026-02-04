/**
 * Integration Tests for Recipes Routes
 * Routes: categories CRUD+reorder, recipes CRUD, publish/archive/duplicate/share
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Recipes API', () => {
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

  // --- Recipe Categories ---
  describe('Recipe Categories', () => {
    describe('GET /api/recipes/categories', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.RecipeCategory.bulkCreate([
          { name: 'Petit-déjeuner', display_order: 1, created_by: adminAuth.user.id },
          { name: 'Déjeuner', display_order: 2, created_by: adminAuth.user.id }
        ]);
      });

      it('should return categories for admin', async () => {
        const res = await request(app)
          .get('/api/recipes/categories')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return categories for dietitian', async () => {
        const res = await request(app)
          .get('/api/recipes/categories')
          .set('Authorization', dietitianAuth.authHeader);

        expect(res.status).toBe(200);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .get('/api/recipes/categories');

        expect(res.status).toBe(401);
      });

      it('should reject assistant without recipes.read', async () => {
        const res = await request(app)
          .get('/api/recipes/categories')
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/recipes/categories', () => {
      it('should create category as admin', async () => {
        const res = await request(app)
          .post('/api/recipes/categories')
          .set('Authorization', adminAuth.authHeader)
          .send({ name: 'Desserts', description: 'Sweet treats' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should reject assistant without recipes.create', async () => {
        const res = await request(app)
          .post('/api/recipes/categories')
          .set('Authorization', assistantAuth.authHeader)
          .send({ name: 'Unauthorized' });

        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/recipes/categories/:id', () => {
      let category;

      beforeEach(async () => {
        const db = testDb.getDb();
        category = await db.RecipeCategory.create({
          name: 'Original',
          display_order: 1,
          created_by: adminAuth.user.id
        });
      });

      it('should update category as admin', async () => {
        const res = await request(app)
          .put(`/api/recipes/categories/${category.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ name: 'Updated Category' });

        expect(res.status).toBe(200);
      });
    });

    describe('DELETE /api/recipes/categories/:id', () => {
      let category;

      beforeEach(async () => {
        const db = testDb.getDb();
        category = await db.RecipeCategory.create({
          name: 'Deletable',
          display_order: 1,
          created_by: adminAuth.user.id
        });
      });

      it('should delete category as admin', async () => {
        const res = await request(app)
          .delete(`/api/recipes/categories/${category.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/recipes/categories/reorder', () => {
      let categories;

      beforeEach(async () => {
        const db = testDb.getDb();
        categories = await db.RecipeCategory.bulkCreate([
          { name: 'Cat A', display_order: 1, created_by: adminAuth.user.id },
          { name: 'Cat B', display_order: 2, created_by: adminAuth.user.id }
        ]);
      });

      it('should reorder categories as admin', async () => {
        const res = await request(app)
          .post('/api/recipes/categories/reorder')
          .set('Authorization', adminAuth.authHeader)
          .send({ ordered_ids: [categories[1].id, categories[0].id] });

        expect(res.status).toBe(200);
      });
    });
  });

  // --- Recipes ---
  describe('Recipes CRUD', () => {
    describe('GET /api/recipes', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.Recipe.bulkCreate([
          { title: 'Salade César', slug: 'salade-cesar', status: 'published', created_by: adminAuth.user.id },
          { title: 'Soupe de légumes', slug: 'soupe-legumes', status: 'draft', created_by: adminAuth.user.id }
        ]);
      });

      it('should return recipes for admin', async () => {
        const res = await request(app)
          .get('/api/recipes')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return recipes for dietitian', async () => {
        const res = await request(app)
          .get('/api/recipes')
          .set('Authorization', dietitianAuth.authHeader);

        expect(res.status).toBe(200);
      });

      it('should support filtering by status', async () => {
        const res = await request(app)
          .get('/api/recipes?status=published')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .get('/api/recipes');

        expect(res.status).toBe(401);
      });

      it('should reject assistant without recipes.read', async () => {
        const res = await request(app)
          .get('/api/recipes')
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/recipes/:id', () => {
      let recipe;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Test Recipe',
          slug: 'test-recipe',
          description: 'A delicious test',
          created_by: adminAuth.user.id
        });
      });

      it('should return recipe by ID', async () => {
        const res = await request(app)
          .get(`/api/recipes/${recipe.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('Test Recipe');
      });
    });

    describe('GET /api/recipes/slug/:slug', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.Recipe.create({
          title: 'Slug Recipe',
          slug: 'slug-recipe',
          created_by: adminAuth.user.id
        });
      });

      it('should return recipe by slug', async () => {
        const res = await request(app)
          .get('/api/recipes/slug/slug-recipe')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('POST /api/recipes', () => {
      it('should create recipe as admin', async () => {
        const res = await request(app)
          .post('/api/recipes')
          .set('Authorization', adminAuth.authHeader)
          .send({
            title: 'New Recipe',
            description: 'A brand new recipe',
            difficulty: 'easy',
            prep_time_minutes: 15,
            cook_time_minutes: 30,
            servings: 4
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should create recipe as dietitian', async () => {
        const res = await request(app)
          .post('/api/recipes')
          .set('Authorization', dietitianAuth.authHeader)
          .send({
            title: 'Dietitian Recipe',
            difficulty: 'medium'
          });

        expect(res.status).toBe(201);
      });

      it('should reject assistant without recipes.create', async () => {
        const res = await request(app)
          .post('/api/recipes')
          .set('Authorization', assistantAuth.authHeader)
          .send({ title: 'Unauthorized' });

        expect(res.status).toBe(403);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .post('/api/recipes')
          .send({ title: 'No auth' });

        expect(res.status).toBe(401);
      });
    });

    describe('PUT /api/recipes/:id', () => {
      let recipe;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Editable Recipe',
          slug: 'editable-recipe',
          created_by: adminAuth.user.id
        });
      });

      it('should update recipe as admin', async () => {
        const res = await request(app)
          .put(`/api/recipes/${recipe.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ title: 'Updated Recipe', servings: 6 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('DELETE /api/recipes/:id', () => {
      let recipe;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Deletable Recipe',
          slug: 'deletable-recipe',
          created_by: adminAuth.user.id
        });
      });

      it('should delete recipe as admin', async () => {
        const res = await request(app)
          .delete(`/api/recipes/${recipe.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/recipes/:id/publish', () => {
      let recipe;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Draft Recipe',
          slug: 'draft-recipe',
          status: 'draft',
          created_by: adminAuth.user.id
        });
      });

      it('should publish recipe as admin', async () => {
        const res = await request(app)
          .post(`/api/recipes/${recipe.id}/publish`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject assistant without recipes.update', async () => {
        const res = await request(app)
          .post(`/api/recipes/${recipe.id}/publish`)
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/recipes/:id/archive', () => {
      let recipe;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Published Recipe',
          slug: 'published-recipe',
          status: 'published',
          created_by: adminAuth.user.id
        });
      });

      it('should archive recipe as admin', async () => {
        const res = await request(app)
          .post(`/api/recipes/${recipe.id}/archive`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('POST /api/recipes/:id/duplicate', () => {
      let recipe;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Original Recipe',
          slug: 'original-recipe',
          created_by: adminAuth.user.id
        });
      });

      it('should duplicate recipe as admin', async () => {
        const res = await request(app)
          .post(`/api/recipes/${recipe.id}/duplicate`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should reject assistant without recipes.create', async () => {
        const res = await request(app)
          .post(`/api/recipes/${recipe.id}/duplicate`)
          .set('Authorization', assistantAuth.authHeader);

        expect(res.status).toBe(403);
      });
    });

    describe('POST /api/recipes/:id/share', () => {
      let recipe, patient;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Shareable Recipe',
          slug: 'shareable-recipe',
          status: 'published',
          created_by: adminAuth.user.id
        });
        patient = await db.Patient.create({
          first_name: 'Test',
          last_name: 'Patient',
          email: 'patient@test.com',
          created_by: adminAuth.user.id
        });
      });

      it('should share recipe with patient as admin', async () => {
        const res = await request(app)
          .post(`/api/recipes/${recipe.id}/share`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            patient_id: patient.id,
            notes: 'Great for your diet plan'
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .post(`/api/recipes/${recipe.id}/share`)
          .send({ patient_id: patient.id });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/recipes/:id/shares', () => {
      let recipe;

      beforeEach(async () => {
        const db = testDb.getDb();
        recipe = await db.Recipe.create({
          title: 'Shared Recipe',
          slug: 'shared-recipe',
          created_by: adminAuth.user.id
        });
      });

      it('should return shares for recipe', async () => {
        const res = await request(app)
          .get(`/api/recipes/${recipe.id}/shares`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
