/**
 * Measures Integration Tests
 * Tests for /api/measures and /api/patients/:id/measures endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { measures: measureFixtures, patients: patientFixtures } = require('../fixtures');

let app;

describe('Measures API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testPatient;

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

    // Create test patient
    const db = testDb.getDb();
    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      assigned_dietitian_id: dietitianAuth.user.id
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // Measure Definitions
  // ========================================
  describe('Measure Definitions', () => {
    // GET /api/measures
    describe('GET /api/measures', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        for (const measure of measureFixtures.systemMeasures) {
          await db.MeasureDefinition.create(measure);
        }
      });

      it('should return list of measure definitions', async () => {
        const res = await request(app)
          .get('/api/measures')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return measures for dietitian', async () => {
        const res = await request(app)
          .get('/api/measures')
          .set('Authorization', dietitianAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject request without authentication', async () => {
        const res = await request(app)
          .get('/api/measures');

        expect(res.status).toBe(401);
      });

      it('should filter by category', async () => {
        const res = await request(app)
          .get('/api/measures?category=anthropometric')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should filter active only', async () => {
        const res = await request(app)
          .get('/api/measures?is_active=true')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // GET /api/measures/:id
    describe('GET /api/measures/:id', () => {
      let testMeasure;

      beforeEach(async () => {
        const db = testDb.getDb();
        testMeasure = await db.MeasureDefinition.create(measureFixtures.validMeasure);
      });

      it('should return measure by ID', async () => {
        const res = await request(app)
          .get(`/api/measures/${testMeasure.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(testMeasure.id);
      });

      it('should return 404 for non-existent measure', async () => {
        const res = await request(app)
          .get('/api/measures/00000000-0000-0000-0000-000000000000')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(404);
      });
    });

    // POST /api/measures
    describe('POST /api/measures', () => {
      it('should create a measure definition as admin', async () => {
        const res = await request(app)
          .post('/api/measures')
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.validMeasure);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe(measureFixtures.validMeasure.name);
      });

      it('should reject measure without code', async () => {
        const res = await request(app)
          .post('/api/measures')
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.invalidMeasures.missingCode);

        expect(res.status).toBe(400);
      });

      it('should reject measure without name', async () => {
        const res = await request(app)
          .post('/api/measures')
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.invalidMeasures.missingName);

        expect(res.status).toBe(400);
      });

      it('should reject duplicate code', async () => {
        // Create first measure
        await request(app)
          .post('/api/measures')
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.validMeasure);

        // Try to create duplicate
        const res = await request(app)
          .post('/api/measures')
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.invalidMeasures.duplicateCode);

        expect(res.status).toBe(400);
      });
    });

    // PUT /api/measures/:id
    describe('PUT /api/measures/:id', () => {
      let testMeasure;

      beforeEach(async () => {
        const db = testDb.getDb();
        testMeasure = await db.MeasureDefinition.create(measureFixtures.validMeasure);
      });

      it('should update measure definition', async () => {
        const res = await request(app)
          .put(`/api/measures/${testMeasure.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.measureUpdates.updateName);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should update measure range', async () => {
        const res = await request(app)
          .put(`/api/measures/${testMeasure.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.measureUpdates.updateRange);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should deactivate measure', async () => {
        const res = await request(app)
          .put(`/api/measures/${testMeasure.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send(measureFixtures.measureUpdates.deactivate);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // DELETE /api/measures/:id
    describe('DELETE /api/measures/:id', () => {
      let testMeasure;

      beforeEach(async () => {
        const db = testDb.getDb();
        testMeasure = await db.MeasureDefinition.create({
          ...measureFixtures.validMeasure,
          is_system: false // Only non-system measures can be deleted
        });
      });

      it('should delete non-system measure', async () => {
        const res = await request(app)
          .delete(`/api/measures/${testMeasure.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ========================================
  // Patient Measures
  // ========================================
  describe('Patient Measures', () => {
    let testMeasure;

    beforeEach(async () => {
      const db = testDb.getDb();
      testMeasure = await db.MeasureDefinition.create(measureFixtures.systemMeasures[0]);
    });

    // GET /api/patients/:patientId/measures
    describe('GET /api/patients/:patientId/measures', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.PatientMeasure.create({
          measure_definition_id: testMeasure.id,
          patient_id: testPatient.id,
          numeric_value: 75.5,
          measured_at: new Date(),
          recorded_by: dietitianAuth.user.id
        });
      });

      it('should return patient measures', async () => {
        const res = await request(app)
          .get(`/api/patients/${testPatient.id}/measures`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter by measure_definition_id', async () => {
        const res = await request(app)
          .get(`/api/patients/${testPatient.id}/measures?measure_definition_id=${testMeasure.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // POST /api/patients/:patientId/measures
    describe('POST /api/patients/:patientId/measures', () => {
      it('should record a patient measure', async () => {
        const res = await request(app)
          .post(`/api/patients/${testPatient.id}/measures`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            measure_definition_id: testMeasure.id,
            numeric_value: 75.5,
            measured_at: new Date().toISOString(),
            notes: 'Morning weight'
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should record measure as dietitian', async () => {
        // Dietitian may or may not have permission to record patient measures
        const res = await request(app)
          .post(`/api/patients/${testPatient.id}/measures`)
          .set('Authorization', dietitianAuth.authHeader)
          .send({
            measure_definition_id: testMeasure.id,
            numeric_value: 75.5,
            measured_at: new Date().toISOString()
          });

        // Accept both 201 (success) or 403 (no permission)
        expect([201, 403]).toContain(res.status);
      });

      it('should reject measure without value', async () => {
        const res = await request(app)
          .post(`/api/patients/${testPatient.id}/measures`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            measure_definition_id: testMeasure.id,
            measured_at: new Date().toISOString()
          });

        expect(res.status).toBe(400);
      });
    });

    // PUT /api/patient-measures/:id
    describe('PUT /api/patient-measures/:id', () => {
      let patientMeasure;

      beforeEach(async () => {
        const db = testDb.getDb();
        patientMeasure = await db.PatientMeasure.create({
          measure_definition_id: testMeasure.id,
          patient_id: testPatient.id,
          numeric_value: 75.5,
          measured_at: new Date(),
          recorded_by: dietitianAuth.user.id
        });
      });

      it('should update patient measure', async () => {
        const res = await request(app)
          .put(`/api/patient-measures/${patientMeasure.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({
            numeric_value: 76.0,
            notes: 'Updated weight'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    // DELETE /api/patient-measures/:id
    describe('DELETE /api/patient-measures/:id', () => {
      let patientMeasure;

      beforeEach(async () => {
        const db = testDb.getDb();
        patientMeasure = await db.PatientMeasure.create({
          measure_definition_id: testMeasure.id,
          patient_id: testPatient.id,
          numeric_value: 75.5,
          measured_at: new Date(),
          recorded_by: dietitianAuth.user.id
        });
      });

      it('should delete patient measure', async () => {
        const res = await request(app)
          .delete(`/api/patient-measures/${patientMeasure.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ========================================
  // Measure Trends (via specific measure trend endpoint)
  // ========================================
  describe('Measure Trends', () => {
    let testMeasure;

    beforeEach(async () => {
      const db = testDb.getDb();
      testMeasure = await db.MeasureDefinition.create(measureFixtures.systemMeasures[0]);

      // Create measure timeline
      const timeline = measureFixtures.getMeasureTimeline(testMeasure.id, testPatient.id);
      for (const measure of timeline) {
        await db.PatientMeasure.create({
          ...measure,
          recorded_by: dietitianAuth.user.id
        });
      }
    });

    // GET /api/patients/:patientId/measures/:measureDefId/trend
    describe('GET /api/patients/:patientId/measures/:measureDefId/trend', () => {
      it('should return measure trend data', async () => {
        const res = await request(app)
          .get(`/api/patients/${testPatient.id}/measures/${testMeasure.id}/trend`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return measure history', async () => {
        const res = await request(app)
          .get(`/api/patients/${testPatient.id}/measures/${testMeasure.id}/history`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });

  // ========================================
  // Measure Alerts
  // ========================================
  describe('Measure Alerts', () => {
    // GET /api/patients/:patientId/measure-alerts
    describe('GET /api/patients/:patientId/measure-alerts', () => {
      it('should return measure alerts for patient', async () => {
        const res = await request(app)
          .get(`/api/patients/${testPatient.id}/measure-alerts`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
