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

  describe('POST /api/documents/batch/send-by-email', () => {
    const emailService = require('../../src/services/email.service');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'test-batch');
    let sendSpy;
    let docA, docB;

    beforeAll(() => {
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, 'a.pdf'), 'A');
      fs.writeFileSync(path.join(uploadsDir, 'b.pdf'), 'B');
    });

    afterAll(() => {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    });

    beforeEach(async () => {
      sendSpy = jest.spyOn(emailService, 'sendDocumentsAsAttachments')
        .mockResolvedValue({ messageId: 'test-message', logId: 'test-log' });
      docA = await createTestDocument({ file_name: 'a.pdf', file_path: 'test-batch/a.pdf' });
      docB = await createTestDocument({ file_name: 'b.pdf', file_path: 'test-batch/b.pdf' });
    });

    afterEach(() => {
      sendSpy.mockRestore();
    });

    it('should send all documents in a single email', async () => {
      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [docA.id, docB.id], patient_id: patient.id, message: 'Hello' });

      expect(res.status).toBe(200);
      expect(res.body.data.document_count).toBe(2);
      expect(res.body.data.sent_to).toBe('patient@test.com');
      expect(sendSpy).toHaveBeenCalledTimes(1);

      const [items, , , message] = sendSpy.mock.calls[0];
      expect(items.map(item => item.document.id)).toEqual([docA.id, docB.id]);
      expect(message).toBe('Hello');

      const shares = await testDb.getDb().DocumentShare.findAll({ where: { patient_id: patient.id } });
      expect(shares).toHaveLength(2);
      expect(shares.every(share => share.sent_via === 'email_attachment')).toBe(true);
    });

    it('should ignore duplicate document IDs', async () => {
      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [docA.id, docA.id], patient_id: patient.id });

      expect(res.status).toBe(200);
      expect(res.body.data.document_count).toBe(1);
    });

    it('should return 400 when document_ids is empty', async () => {
      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [], patient_id: patient.id });

      expect(res.status).toBe(400);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should return 404 when a document does not exist', async () => {
      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [docA.id, '00000000-0000-4000-8000-000000000000'], patient_id: patient.id });

      expect(res.status).toBe(404);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should return 400 when the patient has no email', async () => {
      const noEmail = await testDb.getDb().Patient.create({
        first_name: 'No',
        last_name: 'Email',
        created_by: adminAuth.user.id
      });

      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [docA.id], patient_id: noEmail.id });

      expect(res.status).toBe(400);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should return 400 when attachments exceed the size limit', async () => {
      const big = await createTestDocument({ file_name: 'big.pdf', file_path: 'test-batch/a.pdf', file_size: 16 * 1024 * 1024 });

      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [big.id], patient_id: patient.id });

      expect(res.status).toBe(400);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should return 403 when dietitian is not linked to the patient', async () => {
      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ document_ids: [docA.id], patient_id: patient.id });

      expect(res.status).toBe(403);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should allow dietitian linked to the patient', async () => {
      await testDb.getDb().PatientDietitian.create({
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id
      });

      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ document_ids: [docA.id, docB.id], patient_id: patient.id });

      expect(res.status).toBe(200);
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when a document belongs to another patient', async () => {
      const db = testDb.getDb();
      const other = await db.Patient.create({
        first_name: 'Other',
        last_name: 'Patient',
        email: 'other@test.com',
        created_by: adminAuth.user.id
      });

      // docA is attached to `patient`, so it must not go to `other`
      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [docA.id], patient_id: other.id });

      expect(res.status).toBe(403);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should allow library documents to be sent to any accessible patient', async () => {
      const db = testDb.getDb();
      const other = await db.Patient.create({
        first_name: 'Other',
        last_name: 'Patient',
        email: 'other@test.com',
        created_by: adminAuth.user.id
      });
      const libraryDoc = await createTestDocument({
        file_name: 'guide.pdf',
        file_path: 'test-batch/a.pdf',
        resource_type: null,
        resource_id: null
      });

      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', adminAuth.authHeader)
        .send({ document_ids: [libraryDoc.id], patient_id: other.id });

      expect(res.status).toBe(200);
    });

    it('should return 403 when sending another user\'s personal document', async () => {
      const userDoc = await createTestDocument({
        file_name: 'admin-only.pdf',
        file_path: 'test-batch/a.pdf',
        resource_type: 'user',
        resource_id: adminAuth.user.id
      });
      await testDb.getDb().PatientDietitian.create({
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id
      });

      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ document_ids: [userDoc.id], patient_id: patient.id });

      expect(res.status).toBe(403);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/documents/batch/send-by-email')
        .send({ document_ids: [docA.id], patient_id: patient.id });

      expect(res.status).toBe(401);
    });
  });
});
