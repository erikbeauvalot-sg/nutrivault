/**
 * Integration Tests for Documents Routes
 * Routes: CRUD, tags, shares, download, search, stats, send-to-patient/group/email
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

// Create a small test file for upload tests
const testFilePath = path.join(__dirname, 'test-upload.txt');

describe('Documents API', () => {
  let adminAuth, dietitianAuth, assistantAuth;
  let patient;

  beforeAll(async () => {
    await testDb.init();
    app = require('../setup/testServer').resetApp();
    // Create test file
    fs.writeFileSync(testFilePath, 'Test file content for document upload');
  });

  afterAll(async () => {
    await testDb.close();
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();

    const db = testDb.getDb();
    patient = await db.Patient.create({
      first_name: 'Test',
      last_name: 'Patient',
      email: 'patient@test.com',
      created_by: adminAuth.user.id
    });
  });

  // Helper to create a document directly in DB
  async function createTestDocument(overrides = {}) {
    const db = testDb.getDb();
    return db.Document.create({
      file_name: 'test-doc.pdf',
      file_path: '/uploads/test-doc.pdf',
      file_size: 12345,
      mime_type: 'application/pdf',
      uploaded_by: adminAuth.user.id,
      resource_type: 'patient',
      resource_id: patient.id,
      description: 'Test document',
      tags: ['diet', 'plan'],
      ...overrides
    });
  }

  describe('GET /api/documents', () => {
    beforeEach(async () => {
      await createTestDocument();
      await createTestDocument({ file_name: 'second-doc.pdf', description: 'Second doc' });
    });

    it('should return documents for admin', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return documents for dietitian', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should filter by resource_type', async () => {
      const res = await request(app)
        .get('/api/documents?resource_type=patient')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/documents');

      expect(res.status).toBe(401);
    });

    it('should reject assistant without documents.read', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/documents/stats', () => {
    it('should return stats for admin', async () => {
      const res = await request(app)
        .get('/api/documents/stats')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/documents/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/documents/search', () => {
    beforeEach(async () => {
      await createTestDocument({ tags: ['nutrition', 'plan'] });
    });

    it('should search documents for admin', async () => {
      const res = await request(app)
        .get('/api/documents/search?search=test')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/documents/search?search=test');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/documents/:id', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should return document by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/documents/${document.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.file_name).toBe('test-doc.pdf');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/documents/${document.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/documents/:id', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should update document as admin', async () => {
      const res = await request(app)
        .put(`/api/documents/${document.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ description: 'Updated description', category: 'medical' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject assistant without documents.update', async () => {
      const res = await request(app)
        .put(`/api/documents/${document.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ description: 'Unauthorized' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should delete document as admin', async () => {
      const res = await request(app)
        .delete(`/api/documents/${document.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject assistant without documents.delete', async () => {
      const res = await request(app)
        .delete(`/api/documents/${document.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // --- Tags ---
  describe('POST /api/documents/:id/tags', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument({ tags: ['existing'] });
    });

    it('should add tags to document as admin', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/tags`)
        .set('Authorization', adminAuth.authHeader)
        .send({ tags: ['new-tag', 'another-tag'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for empty tags array', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/tags`)
        .set('Authorization', adminAuth.authHeader)
        .send({ tags: [] });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/tags`)
        .send({ tags: ['no-auth'] });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/documents/:id/tags', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument({ tags: ['tag1', 'tag2', 'tag3'] });
    });

    it('should remove tags from document', async () => {
      const res = await request(app)
        .delete(`/api/documents/${document.id}/tags`)
        .set('Authorization', adminAuth.authHeader)
        .send({ tags: ['tag1'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // --- Shares ---
  describe('POST /api/documents/:id/send-to-patient', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should send document to patient as admin', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/send-to-patient`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          patient_id: patient.id,
          sent_via: 'portal',
          notes: 'Please review'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when patient_id is missing', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/send-to-patient`)
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/send-to-patient`)
        .send({ patient_id: patient.id });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/documents/:id/send-to-group', () => {
    let document, patient2;

    beforeEach(async () => {
      document = await createTestDocument();
      const db = testDb.getDb();
      patient2 = await db.Patient.create({
        first_name: 'Second',
        last_name: 'Patient',
        email: 'patient2@test.com',
        created_by: adminAuth.user.id
      });
    });

    it('should send document to group as admin', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/send-to-group`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          patient_ids: [patient.id, patient2.id],
          sent_via: 'portal'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when patient_ids is empty', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/send-to-group`)
        .set('Authorization', adminAuth.authHeader)
        .send({ patient_ids: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/documents/:id/shares', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should return shares for document', async () => {
      const res = await request(app)
        .get(`/api/documents/${document.id}/shares`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/documents/:id/shares-with-logs', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should return shares with access logs', async () => {
      const res = await request(app)
        .get(`/api/documents/${document.id}/shares-with-logs`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/documents/:id/create-share-link', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should create share link as admin', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/create-share-link`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          patient_id: patient.id,
          notes: 'Download link'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when patient_id is missing', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/create-share-link`)
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/documents/patient/:patientId/shares', () => {
    it('should return patient document shares', async () => {
      const res = await request(app)
        .get(`/api/documents/patient/${patient.id}/shares`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/documents/:id/send-by-email', () => {
    let document;

    beforeEach(async () => {
      document = await createTestDocument();
    });

    it('should return 400 when patient_id is missing', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/send-by-email`)
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/documents/${document.id}/send-by-email`)
        .send({ patient_id: patient.id });

      expect(res.status).toBe(401);
    });
  });
});
