/**
 * Integration Tests for Annotations Routes
 * Routes: GET/POST /patients/:patientId/annotations, PUT/DELETE /annotations/:id
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Annotations API', () => {
  let adminAuth, dietitianAuth, assistantAuth;
  let patient;

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

    const db = testDb.getDb();
    patient = await db.Patient.create({
      first_name: 'Test',
      last_name: 'Patient',
      email: 'patient@test.com',
      created_by: adminAuth.user.id
    });
  });

  describe('GET /api/patients/:patientId/annotations', () => {
    it('should return annotations for a patient as admin', async () => {
      const db = testDb.getDb();
      await db.MeasureAnnotation.create({
        patient_id: patient.id,
        event_date: new Date(),
        event_type: 'medication_change',
        title: 'Started new medication',
        created_by: adminAuth.user.id
      });

      const res = await request(app)
        .get(`/api/patients/${patient.id}/annotations`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Started new medication');
    });

    it('should return empty array when no annotations exist', async () => {
      const res = await request(app)
        .get(`/api/patients/${patient.id}/annotations`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return 404 for non-existent patient', async () => {
      const res = await request(app)
        .get('/api/patients/99999/annotations')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should allow dietitian with measures.read permission', async () => {
      const res = await request(app)
        .get(`/api/patients/${patient.id}/annotations`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get(`/api/patients/${patient.id}/annotations`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/patients/:patientId/annotations', () => {
    it('should create annotation as admin', async () => {
      const res = await request(app)
        .post(`/api/patients/${patient.id}/annotations`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          event_date: '2025-01-15',
          event_type: 'diet_change',
          title: 'Started keto diet',
          description: 'Patient began ketogenic diet',
          color: '#4CAF50'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Started keto diet');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post(`/api/patients/${patient.id}/annotations`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          description: 'Missing required fields'
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent patient', async () => {
      const res = await request(app)
        .post('/api/patients/99999/annotations')
        .set('Authorization', adminAuth.authHeader)
        .send({
          event_date: '2025-01-15',
          title: 'Test annotation'
        });

      expect(res.status).toBe(404);
    });

    it('should create annotation as dietitian with measures.create permission', async () => {
      const res = await request(app)
        .post(`/api/patients/${patient.id}/annotations`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({
          event_date: '2025-01-15',
          title: 'Dietitian annotation'
        });

      expect(res.status).toBe(201);
    });

    it('should reject assistant without measures.create permission', async () => {
      const res = await request(app)
        .post(`/api/patients/${patient.id}/annotations`)
        .set('Authorization', assistantAuth.authHeader)
        .send({
          event_date: '2025-01-15',
          title: 'Assistant annotation'
        });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post(`/api/patients/${patient.id}/annotations`)
        .send({
          event_date: '2025-01-15',
          title: 'No auth annotation'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/annotations/:id', () => {
    let annotation;

    beforeEach(async () => {
      const db = testDb.getDb();
      annotation = await db.MeasureAnnotation.create({
        patient_id: patient.id,
        event_date: new Date('2025-01-15'),
        event_type: 'other',
        title: 'Original title',
        description: 'Original description',
        color: '#FF5733',
        created_by: adminAuth.user.id
      });
    });

    it('should update annotation as admin', async () => {
      const res = await request(app)
        .put(`/api/annotations/${annotation.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({
          title: 'Updated title',
          color: '#2196F3'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated title');
    });

    it('should return 404 for non-existent annotation', async () => {
      const res = await request(app)
        .put('/api/annotations/99999')
        .set('Authorization', adminAuth.authHeader)
        .send({ title: 'Ghost annotation' });

      expect(res.status).toBe(404);
    });

    it('should reject assistant without measures.update permission', async () => {
      const res = await request(app)
        .put(`/api/annotations/${annotation.id}`)
        .set('Authorization', assistantAuth.authHeader)
        .send({ title: 'Unauthorized update' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/annotations/:id', () => {
    let annotation;

    beforeEach(async () => {
      const db = testDb.getDb();
      annotation = await db.MeasureAnnotation.create({
        patient_id: patient.id,
        event_date: new Date('2025-01-15'),
        event_type: 'other',
        title: 'To be deleted',
        created_by: adminAuth.user.id
      });
    });

    it('should delete annotation as admin', async () => {
      const res = await request(app)
        .delete(`/api/annotations/${annotation.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent annotation', async () => {
      const res = await request(app)
        .delete('/api/annotations/99999')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject assistant without measures.delete permission', async () => {
      const res = await request(app)
        .delete(`/api/annotations/${annotation.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .delete(`/api/annotations/${annotation.id}`);

      expect(res.status).toBe(401);
    });
  });
});
