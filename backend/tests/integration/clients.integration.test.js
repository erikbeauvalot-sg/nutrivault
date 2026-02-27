/**
 * Clients Integration Tests
 * Tests for /api/clients endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Clients API', () => {
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

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/clients
  // ========================================
  describe('GET /api/clients', () => {
    it('should return list for admin', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return list for dietitian', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return list for assistant (read permission)', async () => {
      const res = await request(app)
        .get('/api/clients')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/clients');

      expect(res.status).toBe(401);
    });

    it('should support filtering by client_type', async () => {
      const res = await request(app)
        .get('/api/clients?client_type=person')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support search query parameter', async () => {
      const res = await request(app)
        .get('/api/clients?search=test')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/clients?page=1&limit=5')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject invalid client_type filter with 400', async () => {
      const res = await request(app)
        .get('/api/clients?client_type=invalid')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /api/clients/search
  // ========================================
  describe('GET /api/clients/search', () => {
    it('should return search results for admin', async () => {
      const res = await request(app)
        .get('/api/clients/search?q=test')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/clients/search?q=test');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST /api/clients
  // ========================================
  describe('POST /api/clients', () => {
    const validPersonClient = {
      client_type: 'person',
      first_name: 'Alice',
      last_name: 'Dupont',
      email: 'alice.dupont@example.com',
      phone: '0612345678'
    };

    const validCompanyClient = {
      client_type: 'company',
      company_name: 'NutriCorp',
      email: 'contact@nutricorp.fr',
      siret: '12345678901234'
    };

    it('should create a person client as admin', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', adminAuth.authHeader)
        .send(validPersonClient);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.client_type).toBe('person');
      expect(res.body.data.first_name).toBe('Alice');
    });

    it('should create a company client as admin', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', adminAuth.authHeader)
        .send(validCompanyClient);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.client_type).toBe('company');
      expect(res.body.data.company_name).toBe('NutriCorp');
    });

    it('should create a client as dietitian', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', dietitianAuth.authHeader)
        .send(validPersonClient);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject creation without client_type', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', adminAuth.authHeader)
        .send({ first_name: 'Alice', last_name: 'Dupont' });

      expect(res.status).toBe(400);
    });

    it('should reject creation with invalid client_type', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', adminAuth.authHeader)
        .send({ client_type: 'organization', company_name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should reject creation with invalid email format', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', adminAuth.authHeader)
        .send({ ...validPersonClient, email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('should reject creation without authentication', async () => {
      const res = await request(app)
        .post('/api/clients')
        .send(validPersonClient);

      expect(res.status).toBe(401);
    });

    it('should reject creation for assistant (no create permission)', async () => {
      const res = await request(app)
        .post('/api/clients')
        .set('Authorization', assistantAuth.authHeader)
        .send(validPersonClient);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/clients/:id
  // ========================================
  describe('GET /api/clients/:id', () => {
    let adminClient;
    let dietitianClient;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminClient = await db.Client.create({
        client_type: 'person',
        first_name: 'Jean',
        last_name: 'Martin',
        email: 'jean.martin@example.com',
        created_by: adminAuth.user.id
      });
      // Dietitian can only see clients they created
      dietitianClient = await db.Client.create({
        client_type: 'person',
        first_name: 'Sophie',
        last_name: 'Legrand',
        email: 'sophie.legrand@example.com',
        created_by: dietitianAuth.user.id
      });
    });

    it('should return client by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/clients/${adminClient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(adminClient.id);
    });

    it('should return own client for dietitian', async () => {
      const res = await request(app)
        .get(`/api/clients/${dietitianClient.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 for assistant with no linked dietitians (scoping)', async () => {
      // Assistant role has no linked dietitians in test setup, so scoping returns 403
      const res = await request(app)
        .get(`/api/clients/${adminClient.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent client', async () => {
      const res = await request(app)
        .get('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/clients/not-a-uuid')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get(`/api/clients/${adminClient.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/clients/:id
  // ========================================
  describe('PUT /api/clients/:id', () => {
    let adminClient;
    let dietitianClient;

    beforeEach(async () => {
      const db = testDb.getDb();
      adminClient = await db.Client.create({
        client_type: 'person',
        first_name: 'Marie',
        last_name: 'Curie',
        email: 'marie.curie@example.com',
        created_by: adminAuth.user.id
      });
      // Dietitian can only update clients they created
      dietitianClient = await db.Client.create({
        client_type: 'person',
        first_name: 'Pierre',
        last_name: 'Dupont',
        email: 'pierre.dupont@example.com',
        created_by: dietitianAuth.user.id
      });
    });

    it('should update client as admin', async () => {
      const res = await request(app)
        .put(`/api/clients/${adminClient.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ client_type: 'person', first_name: 'Marie', last_name: 'Curie', phone: '0698765432' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update own client as dietitian', async () => {
      const res = await request(app)
        .put(`/api/clients/${dietitianClient.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ client_type: 'person', first_name: 'Pierre', last_name: 'Dupont-Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent client', async () => {
      const res = await request(app)
        .put('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send({ client_type: 'person', first_name: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/clients/${adminClient.id}`)
        .send({ client_type: 'person', first_name: 'Updated' });

      expect(res.status).toBe(401);
    });

    it('should reject update for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/clients/${adminClient.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ client_type: 'person', first_name: 'Updated' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/clients/:id
  // ========================================
  describe('DELETE /api/clients/:id', () => {
    let testClient;

    beforeEach(async () => {
      const db = testDb.getDb();
      testClient = await db.Client.create({
        client_type: 'company',
        company_name: 'ToDelete Corp',
        created_by: adminAuth.user.id
      });
    });

    it('should delete client as admin', async () => {
      const res = await request(app)
        .delete(`/api/clients/${testClient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent client', async () => {
      const res = await request(app)
        .delete('/api/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/clients/${testClient.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for dietitian (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/clients/${testClient.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject delete for assistant (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/clients/${testClient.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
