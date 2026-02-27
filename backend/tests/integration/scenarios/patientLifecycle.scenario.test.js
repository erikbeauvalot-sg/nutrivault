/**
 * Patient Lifecycle Scenario Test
 *
 * End-to-end backend scenario via HTTP (supertest) covering:
 *   1. Create a patient (POST /api/patients) as admin
 *   2. Create a visit for the patient (POST /api/visits) as dietitian
 *   3. Verify visit appears in GET /api/visits?patient_id=X
 *   4. Update visit status to COMPLETED (PUT /api/visits/:id)
 *   5. Get patient by ID (GET /api/patients/:id)
 *   6. Delete patient (DELETE /api/patients/:id)
 *
 * Happy path only — all steps should succeed (2xx).
 */

const request = require('supertest');
const testDb = require('../../setup/testDb');
const testAuth = require('../../setup/testAuth');

let app;

describe('Patient Lifecycle Scenario', () => {
  let adminAuth, dietitianAuth;

  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();
    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('should complete the full patient lifecycle', async () => {
    // -------------------------------------------------------
    // Step 1: Create a patient as admin
    // -------------------------------------------------------
    const createPatientRes = await request(app)
      .post('/api/patients')
      .set('Authorization', adminAuth.authHeader)
      .send({
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean.dupont.lifecycle@test.com',
        phone: '0600000001',
        language_preference: 'fr',
        assigned_dietitian_id: dietitianAuth.user.id
      });

    expect(createPatientRes.status).toBe(201);
    expect(createPatientRes.body.success).toBe(true);
    expect(createPatientRes.body.data).toHaveProperty('id');
    expect(createPatientRes.body.data.first_name).toBe('Jean');

    const patientId = createPatientRes.body.data.id;

    // Ensure PatientDietitian M2M link exists — the route may create it automatically
    // when assigned_dietitian_id is set, so use findOrCreate to avoid unique constraint errors
    const db = testDb.getDb();
    await db.PatientDietitian.findOrCreate({
      where: {
        patient_id: patientId,
        dietitian_id: dietitianAuth.user.id
      },
      defaults: {
        patient_id: patientId,
        dietitian_id: dietitianAuth.user.id
      }
    });

    // -------------------------------------------------------
    // Step 2: Create a visit for the patient as dietitian
    // -------------------------------------------------------
    const visitDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week from now
    const createVisitRes = await request(app)
      .post('/api/visits')
      .set('Authorization', dietitianAuth.authHeader)
      .send({
        patient_id: patientId,
        dietitian_id: dietitianAuth.user.id,
        visit_date: visitDate,
        visit_type: 'Initial',
        status: 'SCHEDULED',
        duration_minutes: 60
      });

    expect(createVisitRes.status).toBe(201);
    expect(createVisitRes.body.success).toBe(true);
    expect(createVisitRes.body.data).toHaveProperty('id');
    expect(createVisitRes.body.data.patient_id).toBe(patientId);

    const visitId = createVisitRes.body.data.id;

    // -------------------------------------------------------
    // Step 3: Verify visit appears in GET /api/visits?patient_id=X
    // -------------------------------------------------------
    const listVisitsRes = await request(app)
      .get(`/api/visits?patient_id=${patientId}`)
      .set('Authorization', dietitianAuth.authHeader);

    expect(listVisitsRes.status).toBe(200);
    expect(listVisitsRes.body.success).toBe(true);
    expect(Array.isArray(listVisitsRes.body.data)).toBe(true);

    const foundVisit = listVisitsRes.body.data.find(v => v.id === visitId);
    expect(foundVisit).toBeDefined();
    expect(foundVisit.patient_id).toBe(patientId);

    // -------------------------------------------------------
    // Step 4: Update visit status to COMPLETED
    // -------------------------------------------------------
    const completedDate = new Date(Date.now() - 1000).toISOString(); // slightly in the past
    const updateVisitRes = await request(app)
      .put(`/api/visits/${visitId}`)
      .set('Authorization', dietitianAuth.authHeader)
      .send({
        status: 'COMPLETED',
        visit_date: completedDate
      });

    expect(updateVisitRes.status).toBe(200);
    expect(updateVisitRes.body.success).toBe(true);
    expect(updateVisitRes.body.data.status).toBe('COMPLETED');

    // -------------------------------------------------------
    // Step 5: Get patient by ID and verify basic fields
    // -------------------------------------------------------
    const getPatientRes = await request(app)
      .get(`/api/patients/${patientId}`)
      .set('Authorization', adminAuth.authHeader);

    expect(getPatientRes.status).toBe(200);
    expect(getPatientRes.body.success).toBe(true);
    expect(getPatientRes.body.data.id).toBe(patientId);
    expect(getPatientRes.body.data.first_name).toBe('Jean');
    expect(getPatientRes.body.data.last_name).toBe('Dupont');

    // -------------------------------------------------------
    // Step 6: Delete patient as admin
    // -------------------------------------------------------
    const deletePatientRes = await request(app)
      .delete(`/api/patients/${patientId}`)
      .set('Authorization', adminAuth.authHeader);

    expect(deletePatientRes.status).toBe(200);
    expect(deletePatientRes.body.success).toBe(true);

    // Verify patient is deactivated — the API soft-deletes (sets is_active=false),
    // so the patient record still exists but is marked inactive.
    const getDeletedRes = await request(app)
      .get(`/api/patients/${patientId}`)
      .set('Authorization', adminAuth.authHeader);

    // Soft delete: record remains findable, just inactive
    expect(getDeletedRes.status).toBe(200);
    expect(getDeletedRes.body.data.is_active).toBe(false);
  });

  // -------------------------------------------------------
  // Additional targeted checks
  // -------------------------------------------------------
  it('should reject patient creation without required fields', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', adminAuth.authHeader)
      .send({
        // missing first_name and last_name
        email: 'missing.name@test.com'
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject visit creation without authentication', async () => {
    const res = await request(app)
      .post('/api/visits')
      .send({
        patient_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        dietitian_id: dietitianAuth.user.id,
        visit_date: new Date().toISOString(),
        status: 'SCHEDULED'
      });

    expect(res.status).toBe(401);
  });

  it('should return 404 for a non-existent patient', async () => {
    // Use a well-formed UUID v4 that does not exist in the database
    const fakeId = '00000000-0000-4000-a000-000000000001';
    const res = await request(app)
      .get(`/api/patients/${fakeId}`)
      .set('Authorization', adminAuth.authHeader);

    expect(res.status).toBe(404);
  });

  it('should allow listing visits filtered by patient_id with no results', async () => {
    // Create a patient but no visits
    const createRes = await request(app)
      .post('/api/patients')
      .set('Authorization', adminAuth.authHeader)
      .send({
        first_name: 'Empty',
        last_name: 'Visits',
        email: 'empty.visits@test.com'
      });

    expect(createRes.status).toBe(201);
    const pid = createRes.body.data.id;

    const listRes = await request(app)
      .get(`/api/visits?patient_id=${pid}`)
      .set('Authorization', adminAuth.authHeader);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBe(0);
  });
});
