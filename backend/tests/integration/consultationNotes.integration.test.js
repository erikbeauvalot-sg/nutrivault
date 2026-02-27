/**
 * Consultation Notes Integration Tests
 * Tests for /api/consultation-notes endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures, visits: visitFixtures } = require('../fixtures');

let app;

describe('Consultation Notes API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testPatient;
  let testVisit;
  let testTemplate;

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

    const db = testDb.getDb();

    // Create a patient linked to the dietitian
    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      assigned_dietitian_id: dietitianAuth.user.id
    });
    await db.PatientDietitian.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });

    // Create a visit for the patient
    testVisit = await db.Visit.create({
      ...visitFixtures.validVisit,
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });

    // Create a consultation template (required to create notes)
    testTemplate = await db.ConsultationTemplate.create({
      name: 'Test Note Template',
      template_type: 'general',
      visibility: 'shared',
      created_by: adminAuth.user.id
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // Helper: create a note directly in DB
  // ========================================
  async function createNoteInDb(userId, overrides = {}) {
    const db = testDb.getDb();
    return db.ConsultationNote.create({
      patient_id: testPatient.id,
      template_id: testTemplate.id,
      dietitian_id: userId,
      status: 'draft',
      ...overrides
    });
  }

  // ========================================
  // GET /api/consultation-notes
  // ========================================
  describe('GET /api/consultation-notes', () => {
    beforeEach(async () => {
      await createNoteInDb(dietitianAuth.user.id, { status: 'draft' });
      await createNoteInDb(dietitianAuth.user.id, { status: 'completed' });
    });

    it('should return 200 with list of notes for admin', async () => {
      const res = await request(app)
        .get('/api/consultation-notes')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 200 with own notes for dietitian (RBAC scoped)', async () => {
      const res = await request(app)
        .get('/api/consultation-notes')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // All notes belong to dietitian
      res.body.data.forEach(note => {
        expect(note.dietitian_id).toBe(dietitianAuth.user.id);
      });
    });

    it('should return 200 for assistant (has consultation_templates.read permission)', async () => {
      const res = await request(app)
        .get('/api/consultation-notes')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/consultation-notes');

      expect(res.status).toBe(401);
    });

    it('should support filtering by patient_id', async () => {
      const res = await request(app)
        .get(`/api/consultation-notes?patient_id=${testPatient.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(note => {
        expect(note.patient_id).toBe(testPatient.id);
      });
    });

    it('should support filtering by status', async () => {
      const res = await request(app)
        .get('/api/consultation-notes?status=draft')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(note => {
        expect(note.status).toBe('draft');
      });
    });
  });

  // ========================================
  // POST /api/consultation-notes
  // ========================================
  describe('POST /api/consultation-notes', () => {
    it('should create a note as dietitian with required fields', async () => {
      const res = await request(app)
        .post('/api/consultation-notes')
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          patient_id: testPatient.id,
          template_id: testTemplate.id,
          visit_id: testVisit.id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(testPatient.id);
      expect(res.body.data.template_id).toBe(testTemplate.id);
      expect(res.body.data.dietitian_id).toBe(dietitianAuth.user.id);
      expect(res.body.data.status).toBe('draft');
    });

    it('should create a note as admin', async () => {
      const res = await request(app)
        .post('/api/consultation-notes')
        .set('Authorization', adminAuth.authHeader)
        .send({
          patient_id: testPatient.id,
          template_id: testTemplate.id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(testPatient.id);
    });

    it('should create a note without a visit_id (visit_id is optional)', async () => {
      const res = await request(app)
        .post('/api/consultation-notes')
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          patient_id: testPatient.id,
          template_id: testTemplate.id
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when template_id refers to a non-existent template', async () => {
      const res = await request(app)
        .post('/api/consultation-notes')
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          patient_id: testPatient.id,
          template_id: '00000000-0000-0000-0000-000000000000'
        });

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/consultation-notes')
        .send({
          patient_id: testPatient.id,
          template_id: testTemplate.id
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no consultation_templates.create permission)', async () => {
      const res = await request(app)
        .post('/api/consultation-notes')
        .set('Authorization', assistantAuth.authHeader)
        .send({
          patient_id: testPatient.id,
          template_id: testTemplate.id
        });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // GET /api/consultation-notes/:id
  // ========================================
  describe('GET /api/consultation-notes/:id', () => {
    let testNote;

    beforeEach(async () => {
      testNote = await createNoteInDb(dietitianAuth.user.id);
    });

    it('should return 200 with note data for admin', async () => {
      const res = await request(app)
        .get(`/api/consultation-notes/${testNote.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testNote.id);
      expect(res.body.data.patient_id).toBe(testPatient.id);
    });

    it('should return 200 for the owning dietitian', async () => {
      const res = await request(app)
        .get(`/api/consultation-notes/${testNote.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .get('/api/consultation-notes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/consultation-notes/${testNote.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/consultation-notes/:id/values
  // ========================================
  describe('PUT /api/consultation-notes/:id/values', () => {
    let testNote;

    beforeEach(async () => {
      testNote = await createNoteInDb(dietitianAuth.user.id);
    });

    it('should save note values (summary) as the owning dietitian', async () => {
      const res = await request(app)
        .put(`/api/consultation-notes/${testNote.id}/values`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          summary: 'Patient is progressing well. Recommend increased protein intake.',
          instructionNotes: [],
          measureValues: [],
          customFieldValues: []
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBe('Patient is progressing well. Recommend increased protein intake.');
    });

    it('should save instruction notes as the owning dietitian', async () => {
      const db = testDb.getDb();
      const templateItem = await db.ConsultationTemplateItem.create({
        template_id: testTemplate.id,
        item_type: 'instruction',
        instruction_title: 'Obs',
        display_order: 0
      });

      const res = await request(app)
        .put(`/api/consultation-notes/${testNote.id}/values`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          instructionNotes: [
            { template_item_id: templateItem.id, text: 'Patient following diet plan' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .put('/api/consultation-notes/00000000-0000-0000-0000-000000000000/values')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ summary: 'Trying non-existent' });

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put(`/api/consultation-notes/${testNote.id}/values`)
        .send({ summary: 'Unauthenticated' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/consultation-notes/${testNote.id}/values`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ summary: 'Assistant trying to update' });

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // PUT /api/consultation-notes/:id/complete
  // ========================================
  describe('PUT /api/consultation-notes/:id/complete', () => {
    let testNote;

    beforeEach(async () => {
      testNote = await createNoteInDb(dietitianAuth.user.id, { status: 'draft' });
    });

    it('should complete a draft note as the owning dietitian', async () => {
      const res = await request(app)
        .put(`/api/consultation-notes/${testNote.id}/complete`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.completed_at).not.toBeNull();
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .put('/api/consultation-notes/00000000-0000-0000-0000-000000000000/complete')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put(`/api/consultation-notes/${testNote.id}/complete`);

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no update permission)', async () => {
      const res = await request(app)
        .put(`/api/consultation-notes/${testNote.id}/complete`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // DELETE /api/consultation-notes/:id
  // ========================================
  describe('DELETE /api/consultation-notes/:id', () => {
    let testNote;

    beforeEach(async () => {
      testNote = await createNoteInDb(dietitianAuth.user.id);
    });

    it('should delete a note as admin', async () => {
      const res = await request(app)
        .delete(`/api/consultation-notes/${testNote.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should delete own note as dietitian', async () => {
      const ownNote = await createNoteInDb(dietitianAuth.user.id);

      const res = await request(app)
        .delete(`/api/consultation-notes/${ownNote.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent note', async () => {
      const res = await request(app)
        .delete('/api/consultation-notes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .delete(`/api/consultation-notes/${testNote.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 for assistant (no delete permission)', async () => {
      const res = await request(app)
        .delete(`/api/consultation-notes/${testNote.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
