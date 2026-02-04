/**
 * Patients Integration Tests
 * Tests for /api/patients endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures } = require('../fixtures');

let app;

describe('Patients API', () => {
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
  // GET /api/patients
  // ========================================
  describe('GET /api/patients', () => {
    beforeEach(async () => {
      // Create some test patients and link them via M2M
      const db = testDb.getDb();
      for (const patient of patientFixtures.patientsList) {
        const created = await db.Patient.create({
          ...patient,
          assigned_dietitian_id: dietitianAuth.user.id
        });
        await db.PatientDietitian.create({
          patient_id: created.id,
          dietitian_id: dietitianAuth.user.id
        });
      }
    });

    it('should return list of patients for admin', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return filtered patients for dietitian (only assigned)', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return patients for assistant (read-only)', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/patients');

      expect(res.status).toBe(401);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/patients?page=1&limit=2')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should support search', async () => {
      const res = await request(app)
        .get('/api/patients?search=Alice')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/patients/:id
  // ========================================
  describe('GET /api/patients/:id', () => {
    let testPatient;

    beforeEach(async () => {
      const db = testDb.getDb();
      testPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        assigned_dietitian_id: dietitianAuth.user.id
      });
      await db.PatientDietitian.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    it('should return patient by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/patients/${testPatient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testPatient.id);
      expect(res.body.data.first_name).toBe(patientFixtures.validPatient.first_name);
    });

    it('should return patient for assigned dietitian', async () => {
      const res = await request(app)
        .get(`/api/patients/${testPatient.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent patient', async () => {
      const res = await request(app)
        .get('/api/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/patients/invalid-id')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /api/patients/:id/details
  // ========================================
  describe('GET /api/patients/:id/details', () => {
    let testPatient;

    beforeEach(async () => {
      const db = testDb.getDb();
      testPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        assigned_dietitian_id: dietitianAuth.user.id
      });
      await db.PatientDietitian.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    it('should return patient details with visits and measurements', async () => {
      const res = await request(app)
        .get(`/api/patients/${testPatient.id}/details`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
    });
  });

  // ========================================
  // POST /api/patients
  // ========================================
  describe('POST /api/patients', () => {
    it('should create a patient with valid data as admin', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', adminAuth.authHeader)
        .send(patientFixtures.validPatient);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.first_name).toBe(patientFixtures.validPatient.first_name);
      expect(res.body.data.last_name).toBe(patientFixtures.validPatient.last_name);
    });

    it('should create a patient with minimal data', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', adminAuth.authHeader)
        .send(patientFixtures.minimalPatient);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create a patient as dietitian', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', dietitianAuth.authHeader)
        .send(patientFixtures.validPatient);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject patient creation without first_name', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', adminAuth.authHeader)
        .send(patientFixtures.invalidPatients.missingFirstName);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject patient creation without last_name', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', adminAuth.authHeader)
        .send(patientFixtures.invalidPatients.missingLastName);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject patient creation with invalid email', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', adminAuth.authHeader)
        .send(patientFixtures.invalidPatients.invalidEmail);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject patient creation without authentication', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send(patientFixtures.validPatient);

      expect(res.status).toBe(401);
    });

    it('should reject patient creation for assistant (no permission)', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', assistantAuth.authHeader)
        .send(patientFixtures.validPatient);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // PUT /api/patients/:id
  // ========================================
  describe('PUT /api/patients/:id', () => {
    let testPatient;

    beforeEach(async () => {
      const db = testDb.getDb();
      testPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        assigned_dietitian_id: dietitianAuth.user.id
      });
      await db.PatientDietitian.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    it('should update patient with valid data as admin', async () => {
      const res = await request(app)
        .put(`/api/patients/${testPatient.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send(patientFixtures.patientUpdates.valid);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.first_name).toBe(patientFixtures.patientUpdates.valid.first_name);
    });

    it('should update patient as assigned dietitian', async () => {
      const res = await request(app)
        .put(`/api/patients/${testPatient.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ notes: 'Updated notes' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent patient', async () => {
      const res = await request(app)
        .put('/api/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader)
        .send(patientFixtures.patientUpdates.valid);

      expect(res.status).toBe(404);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/patients/${testPatient.id}`)
        .send(patientFixtures.patientUpdates.valid);

      expect(res.status).toBe(401);
    });

    it('should reject update for assistant (no permission)', async () => {
      const res = await request(app)
        .put(`/api/patients/${testPatient.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send(patientFixtures.patientUpdates.valid);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/patients/:id
  // ========================================
  describe('DELETE /api/patients/:id', () => {
    let testPatient;

    beforeEach(async () => {
      const db = testDb.getDb();
      testPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        assigned_dietitian_id: dietitianAuth.user.id
      });
      await db.PatientDietitian.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    it('should soft delete patient as admin', async () => {
      const res = await request(app)
        .delete(`/api/patients/${testPatient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify soft delete
      const db = testDb.getDb();
      const deletedPatient = await db.Patient.findByPk(testPatient.id);
      expect(deletedPatient.is_active).toBe(false);
    });

    it('should return 404 for non-existent patient', async () => {
      const res = await request(app)
        .delete('/api/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/patients/${testPatient.id}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete for assistant (no permission)', async () => {
      const res = await request(app)
        .delete(`/api/patients/${testPatient.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/patients/check-email/:email
  // ========================================
  describe('GET /api/patients/check-email/:email', () => {
    it('should return available for unused email', async () => {
      const res = await request(app)
        .get('/api/patients/check-email/unused@test.com')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return unavailable for used email', async () => {
      const db = testDb.getDb();
      await db.Patient.create({
        ...patientFixtures.validPatient,
        email: 'used@test.com'
      });

      const res = await request(app)
        .get('/api/patients/check-email/used@test.com')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================
  // Patient Tags Routes
  // ========================================
  describe('Patient Tags', () => {
    let testPatient;

    beforeEach(async () => {
      const db = testDb.getDb();
      testPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        assigned_dietitian_id: dietitianAuth.user.id
      });
      await db.PatientDietitian.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    describe('GET /api/patients/tags', () => {
      it('should return all available tags', async () => {
        const res = await request(app)
          .get('/api/patients/tags')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('GET /api/patients/:patientId/tags', () => {
      it('should return tags for a patient', async () => {
        const res = await request(app)
          .get(`/api/patients/${testPatient.id}/tags`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('POST /api/patients/:patientId/tags', () => {
      it('should add a tag to a patient', async () => {
        const res = await request(app)
          .post(`/api/patients/${testPatient.id}/tags`)
          .set('Authorization', adminAuth.authHeader)
          .send({ tagName: 'vip' });

        expect([200, 201]).toContain(res.status);
        expect(res.body.success).toBe(true);
      });
    });

    describe('PUT /api/patients/:patientId/tags', () => {
      it('should update all tags for a patient', async () => {
        const res = await request(app)
          .put(`/api/patients/${testPatient.id}/tags`)
          .set('Authorization', adminAuth.authHeader)
          .send({ tags: ['tag1', 'tag2'] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('DELETE /api/patients/:patientId/tags/:tagName', () => {
      it('should remove a tag from a patient', async () => {
        // First add a tag
        await request(app)
          .post(`/api/patients/${testPatient.id}/tags`)
          .set('Authorization', adminAuth.authHeader)
          .send({ tagName: 'removable' });

        const res = await request(app)
          .delete(`/api/patients/${testPatient.id}/tags/removable`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ========================================
  // Patient Custom Fields Routes
  // ========================================
  describe('Patient Custom Fields', () => {
    let testPatient;

    beforeEach(async () => {
      const db = testDb.getDb();
      testPatient = await db.Patient.create({
        ...patientFixtures.validPatient,
        assigned_dietitian_id: dietitianAuth.user.id
      });
      await db.PatientDietitian.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id
      });
    });

    describe('GET /api/patients/:patientId/custom-fields', () => {
      it('should return custom fields for a patient', async () => {
        const res = await request(app)
          .get(`/api/patients/${testPatient.id}/custom-fields`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
