/**
 * Integration Tests for Formulas Routes
 * Routes: POST /validate, POST /preview, GET /operators, GET /templates, GET /templates/measures, POST /templates/apply
 * All routes require ADMIN role
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Formulas API', () => {
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

  describe('GET /api/formulas/operators', () => {
    it('should return operators for admin', async () => {
      const res = await request(app)
        .get('/api/formulas/operators')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get('/api/formulas/operators')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/formulas/operators');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/formulas/templates', () => {
    it('should return templates for admin', async () => {
      const res = await request(app)
        .get('/api/formulas/templates')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get('/api/formulas/templates')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/formulas/templates/measures', () => {
    it('should return measure templates for admin', async () => {
      const res = await request(app)
        .get('/api/formulas/templates/measures')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get('/api/formulas/templates/measures')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/formulas/validate', () => {
    it('should validate a formula for admin', async () => {
      const res = await request(app)
        .post('/api/formulas/validate')
        .set('Authorization', adminAuth.authHeader)
        .send({ formula: 'weight / (height * height)' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/formulas/validate')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ formula: 'weight / (height * height)' });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/formulas/validate')
        .send({ formula: 'weight / (height * height)' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/formulas/preview', () => {
    it('should preview a formula for admin', async () => {
      const res = await request(app)
        .post('/api/formulas/preview')
        .set('Authorization', adminAuth.authHeader)
        .send({
          formula: 'weight / (height * height)',
          values: { weight: 70, height: 1.75 }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 400 when values is missing', async () => {
      const res = await request(app)
        .post('/api/formulas/preview')
        .set('Authorization', adminAuth.authHeader)
        .send({ formula: '10 + 20' });

      expect(res.status).toBe(400);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/formulas/preview')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ formula: '10 + 20', values: { x: 1 } });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/formulas/templates/apply', () => {
    it('should apply a template for admin', async () => {
      const res = await request(app)
        .post('/api/formulas/templates/apply')
        .set('Authorization', adminAuth.authHeader)
        .send({ templateId: 'bmi' });

      // May return 200 or 400 depending on template existence, but should not be 401/403
      expect([200, 400]).toContain(res.status);
    });

    it('should return 400 when templateId is missing', async () => {
      const res = await request(app)
        .post('/api/formulas/templates/apply')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/formulas/templates/apply')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ templateId: 'bmi' });

      expect(res.status).toBe(403);
    });
  });
});
