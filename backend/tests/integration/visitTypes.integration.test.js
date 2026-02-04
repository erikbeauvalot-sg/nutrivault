/**
 * Integration Tests for Visit Types Routes
 * Routes: GET /, GET /:id, POST /, PUT /reorder, PUT /:id, DELETE /:id
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Visit Types API', () => {
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

  describe('GET /api/visit-types', () => {
    beforeEach(async () => {
      const db = testDb.getDb();
      await db.VisitType.bulkCreate([
        { name: 'Initial Consultation', description: 'First visit', display_order: 1, is_active: true, color: '#4CAF50', duration_minutes: 60 },
        { name: 'Follow-up', description: 'Follow-up visit', display_order: 2, is_active: true, color: '#2196F3', duration_minutes: 30 },
        { name: 'Archived Type', description: 'Inactive type', display_order: 3, is_active: false }
      ]);
    });

    it('should return all visit types for authenticated user', async () => {
      const res = await request(app)
        .get('/api/visit-types')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should filter by is_active', async () => {
      const res = await request(app)
        .get('/api/visit-types?is_active=true')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter by search term', async () => {
      const res = await request(app)
        .get('/api/visit-types?search=Follow')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Follow-up');
    });

    it('should return visit types ordered by display_order', async () => {
      const res = await request(app)
        .get('/api/visit-types')
        .set('Authorization', adminAuth.authHeader);

      expect(res.body.data[0].name).toBe('Initial Consultation');
      expect(res.body.data[1].name).toBe('Follow-up');
    });

    it('should allow dietitian to list visit types', async () => {
      const res = await request(app)
        .get('/api/visit-types')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/visit-types');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/visit-types/:id', () => {
    let visitType;

    beforeEach(async () => {
      const db = testDb.getDb();
      visitType = await db.VisitType.create({
        name: 'Test Type',
        description: 'A test visit type',
        display_order: 1,
        is_active: true,
        color: '#FF5722',
        duration_minutes: 45,
        default_price: 75.00
      });
    });

    it('should return visit type by ID', async () => {
      const res = await request(app)
        .get(`/api/visit-types/${visitType.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Type');
      expect(res.body.data.color).toBe('#FF5722');
    });

    it('should return 404 for non-existent visit type', async () => {
      const res = await request(app)
        .get('/api/visit-types/99999')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/visit-types/${visitType.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/visit-types', () => {
    it('should create visit type with admin having settings.manage permission', async () => {
      const res = await request(app)
        .post('/api/visit-types')
        .set('Authorization', adminAuth.authHeader)
        .send({
          name: 'New Visit Type',
          description: 'A new type',
          color: '#9C27B0',
          duration_minutes: 30,
          default_price: 50.00
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Visit Type');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/visit-types')
        .set('Authorization', adminAuth.authHeader)
        .send({
          description: 'Missing name'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for duplicate name', async () => {
      const db = testDb.getDb();
      await db.VisitType.create({ name: 'Existing Type', display_order: 1 });

      const res = await request(app)
        .post('/api/visit-types')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Existing Type' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject dietitian without settings.manage permission', async () => {
      const res = await request(app)
        .post('/api/visit-types')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ name: 'Unauthorized Type' });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/visit-types')
        .send({ name: 'No Auth' });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/visit-types/:id', () => {
    let visitType;

    beforeEach(async () => {
      const db = testDb.getDb();
      visitType = await db.VisitType.create({
        name: 'Original Type',
        description: 'Original description',
        display_order: 1,
        is_active: true
      });
    });

    it('should update visit type as admin', async () => {
      const res = await request(app)
        .put(`/api/visit-types/${visitType.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          name: 'Updated Type',
          description: 'Updated description',
          color: '#E91E63'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Type');
    });

    it('should return 404 for non-existent visit type', async () => {
      const res = await request(app)
        .put('/api/visit-types/99999')
        .set('Authorization', adminAuth.authHeader)
        .send({ name: 'Ghost Type' });

      expect(res.status).toBe(404);
    });

    it('should reject dietitian without settings.manage permission', async () => {
      const res = await request(app)
        .put(`/api/visit-types/${visitType.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ name: 'Unauthorized Update' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/visit-types/:id', () => {
    let visitType;

    beforeEach(async () => {
      const db = testDb.getDb();
      visitType = await db.VisitType.create({
        name: 'Deletable Type',
        display_order: 1
      });
    });

    it('should delete visit type as admin', async () => {
      const res = await request(app)
        .delete(`/api/visit-types/${visitType.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion
      const db = testDb.getDb();
      const deleted = await db.VisitType.findByPk(visitType.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent visit type', async () => {
      const res = await request(app)
        .delete('/api/visit-types/99999')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject dietitian without settings.manage permission', async () => {
      const res = await request(app)
        .delete(`/api/visit-types/${visitType.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/visit-types/reorder', () => {
    let types;

    beforeEach(async () => {
      const db = testDb.getDb();
      types = await db.VisitType.bulkCreate([
        { name: 'Type A', display_order: 1 },
        { name: 'Type B', display_order: 2 },
        { name: 'Type C', display_order: 3 }
      ]);
    });

    it('should reorder visit types as admin', async () => {
      const res = await request(app)
        .put('/api/visit-types/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({
          order: [
            { id: types[2].id, display_order: 1 },
            { id: types[0].id, display_order: 2 },
            { id: types[1].id, display_order: 3 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].name).toBe('Type C');
    });

    it('should return 400 for invalid order format', async () => {
      const res = await request(app)
        .put('/api/visit-types/reorder')
        .set('Authorization', adminAuth.authHeader)
        .send({ order: 'not-an-array' });

      expect(res.status).toBe(400);
    });

    it('should reject dietitian without settings.manage permission', async () => {
      const res = await request(app)
        .put('/api/visit-types/reorder')
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          order: [{ id: types[0].id, display_order: 1 }]
        });

      expect(res.status).toBe(403);
    });
  });
});
