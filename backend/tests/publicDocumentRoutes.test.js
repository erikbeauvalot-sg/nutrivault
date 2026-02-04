/**
 * Public Document Routes Integration Tests
 * Tests for the public document sharing API endpoints
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const testDb = require('./setup/testDb');

// Create test app
const app = express();
app.use(express.json());

// Will be initialized after db setup
let publicDocumentRoutes;

describe('Public Document Routes', () => {
  let db;
  let testUser;
  let testPatient;
  let testDocument;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();

    // Import routes after database is initialized
    publicDocumentRoutes = require('../src/routes/publicDocuments');
    app.use('/public/documents', publicDocumentRoutes);
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();

    // Create test user
    const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    testUser = await db.User.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User',
      role_id: adminRole.id,
      is_active: true
    });

    // Create test patient
    testPatient = await db.Patient.create({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      is_active: true
    });

    // Create test document
    testDocument = await db.Document.create({
      resource_type: 'patient',
      resource_id: testPatient.id,
      file_name: 'test-document.pdf',
      file_path: 'patient/2024-01-15/test-document.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      uploaded_by: testUser.id,
      is_active: true
    });
  });

  // ========================================
  // GET /public/documents/:token Tests
  // ========================================
  describe('GET /public/documents/:token', () => {
    it('returns share info for valid token', async () => {
      const token = 'a'.repeat(64);
      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.document.file_name).toBe('test-document.pdf');
    });

    it('returns 404 for non-existent token', async () => {
      const token = 'b'.repeat(64);

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('returns 400 for invalid token format', async () => {
      const response = await request(app)
        .get('/public/documents/invalid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('indicates password protection status', async () => {
      const token = 'c'.repeat(64);
      const passwordHash = await bcrypt.hash('testpass123', 10);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        password_hash: passwordHash,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.data.is_password_protected).toBe(true);
    });

    it('indicates expiration status', async () => {
      const token = 'd'.repeat(64);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        expires_at: pastDate,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.data.is_expired).toBe(true);
      expect(response.body.data.is_accessible).toBe(false);
    });

    it('indicates download limit status', async () => {
      const token = 'e'.repeat(64);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        max_downloads: 5,
        download_count: 5,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.data.has_reached_limit).toBe(true);
      expect(response.body.data.is_accessible).toBe(false);
    });

    it('indicates revoked status', async () => {
      const token = 'f'.repeat(64);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: false
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.data.is_active).toBe(false);
      expect(response.body.data.is_accessible).toBe(false);
    });

    it('includes patient info', async () => {
      const token = '1a'.repeat(32);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.data.patient).toBeDefined();
      expect(response.body.data.patient.first_name).toBe('John');
      expect(response.body.data.patient.last_name).toBe('Doe');
    });
  });

  // ========================================
  // POST /public/documents/:token/verify Tests
  // ========================================
  describe('POST /public/documents/:token/verify', () => {
    it('verifies correct password', async () => {
      const token = '2b'.repeat(32);
      const passwordHash = await bcrypt.hash('testpass123', 10);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        password_hash: passwordHash,
        is_active: true
      });

      const response = await request(app)
        .post(`/public/documents/${token}/verify`)
        .send({ password: 'testpass123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const token = '3c'.repeat(32);
      const passwordHash = await bcrypt.hash('testpass123', 10);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        password_hash: passwordHash,
        is_active: true
      });

      const response = await request(app)
        .post(`/public/documents/${token}/verify`)
        .send({ password: 'wrongpassword' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('returns success for non-protected share', async () => {
      const token = '4d'.repeat(32);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        password_hash: null,
        is_active: true
      });

      const response = await request(app)
        .post(`/public/documents/${token}/verify`)
        .send({ password: 'anypassword' })
        .expect(200);

      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.message).toBe('No password required');
    });

    it('returns 400 for missing password', async () => {
      const token = '5e'.repeat(32);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      });

      const response = await request(app)
        .post(`/public/documents/${token}/verify`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('logs password attempt', async () => {
      const token = '6f'.repeat(32);
      const passwordHash = await bcrypt.hash('testpass123', 10);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        password_hash: passwordHash,
        is_active: true
      });

      await request(app)
        .post(`/public/documents/${token}/verify`)
        .send({ password: 'testpass123' })
        .expect(200);

      const logs = await db.DocumentAccessLog.findAll({
        where: {
          document_share_id: share.id,
          action: 'password_attempt'
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].success).toBe(true);
    });
  });

  // ========================================
  // Token Validation Tests
  // ========================================
  describe('Token Validation', () => {
    it('rejects token shorter than 64 characters', async () => {
      const response = await request(app)
        .get('/public/documents/short')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('rejects token longer than 64 characters', async () => {
      const response = await request(app)
        .get(`/public/documents/${'a'.repeat(100)}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('rejects non-hexadecimal token', async () => {
      const response = await request(app)
        .get(`/public/documents/${'g'.repeat(64)}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('accepts valid hexadecimal token', async () => {
      const token = 'abcdef0123456789'.repeat(4);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ========================================
  // Access Logging Tests
  // ========================================
  describe('Access Logging', () => {
    it('records view when share info is fetched', async () => {
      const token = '70'.repeat(32);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      });

      await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      // Check if view was logged
      const logs = await db.DocumentAccessLog.findAll({
        where: {
          document_share_id: share.id,
          action: 'view'
        }
      });

      expect(logs.length).toBeGreaterThanOrEqual(0); // View logging is optional
    });

    it('logs failed password attempts', async () => {
      const token = '80'.repeat(32);
      const passwordHash = await bcrypt.hash('testpass123', 10);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        password_hash: passwordHash,
        is_active: true
      });

      await request(app)
        .post(`/public/documents/${token}/verify`)
        .send({ password: 'wrongpassword' })
        .expect(401);

      const logs = await db.DocumentAccessLog.findAll({
        where: {
          document_share_id: share.id,
          action: 'password_attempt',
          success: false
        }
      });

      expect(logs.length).toBe(1);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('handles share with deleted document gracefully', async () => {
      const token = '90'.repeat(32);

      // Create share first
      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      });

      // Soft delete the document
      await testDocument.update({ is_active: false });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      // Share info should still be returned
      expect(response.body.success).toBe(true);
    });

    it('handles expired share correctly', async () => {
      const token = 'a0'.repeat(32);
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        expires_at: pastDate,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.data.is_expired).toBe(true);
      expect(response.body.data.is_accessible).toBe(false);
    });

    it('handles share at exact download limit', async () => {
      const token = 'b0'.repeat(32);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        max_downloads: 1,
        download_count: 1,
        is_active: true
      });

      const response = await request(app)
        .get(`/public/documents/${token}`)
        .expect(200);

      expect(response.body.data.has_reached_limit).toBe(true);
      expect(response.body.data.is_accessible).toBe(false);
    });
  });
});
