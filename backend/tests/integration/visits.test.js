/**
 * Integration Tests: Visits API
 *
 * Tests visit management endpoints with RBAC:
 * - CRUD operations
 * - Admin vs Dietitian access control
 * - Visit status workflow
 * - Search and filtering
 */

const request = require('supertest');
const app = require('../../src/app');
const { createUser, createRole, createPatient, createVisit, createPermission } = require('../helpers');
const db = require('../../models');

describe('Visits API - Integration Tests', () => {
  let adminToken, dietitianToken, otherDietitianToken;
  let adminUser, dietitianUser, otherDietitianUser;
  let adminRole, dietitianRole;
  let patient, otherPatient;

  beforeEach(async () => {
    // Create roles
    adminRole = await createRole({ name: 'ADMIN' });
    dietitianRole = await createRole({ name: 'DIETITIAN' });

    // Create permissions
    const permissions = [
      { name: 'visits.list', resource: 'visits', action: 'list' },
      { name: 'visits.read', resource: 'visits', action: 'read' },
      { name: 'visits.create', resource: 'visits', action: 'create' },
      { name: 'visits.update', resource: 'visits', action: 'update' },
      { name: 'visits.delete', resource: 'visits', action: 'delete' }
    ];

    for (const permData of permissions) {
      const perm = await createPermission(permData);
      await db.RolePermission.create({ role_id: adminRole.id, permission_id: perm.id });
      await db.RolePermission.create({ role_id: dietitianRole.id, permission_id: perm.id });
    }

    // Create users
    adminUser = await createUser({
      username: 'admin_visit',
      email: 'admin_visit@test.com',
      role: adminRole
    });

    dietitianUser = await createUser({
      username: 'dietitian_visit',
      email: 'dietitian_visit@test.com',
      role: dietitianRole
    });

    otherDietitianUser = await createUser({
      username: 'other_dietitian_visit',
      email: 'other_dietitian_visit@test.com',
      role: dietitianRole
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_visit', password: 'Test123!' });
    adminToken = adminLogin.body.data.accessToken;

    const dietitianLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dietitian_visit', password: 'Test123!' });
    dietitianToken = dietitianLogin.body.data.accessToken;

    const otherDietitianLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'other_dietitian_visit', password: 'Test123!' });
    otherDietitianToken = otherDietitianLogin.body.data.accessToken;

    // Create test patients
    patient = await createPatient({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.visit@test.com',
      assigned_dietitian_id: dietitianUser.id,
      created_by: dietitianUser.id
    });

    otherPatient = await createPatient({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.visit@test.com',
      assigned_dietitian_id: otherDietitianUser.id,
      created_by: otherDietitianUser.id
    });
  });

  describe('GET /api/visits', () => {
    beforeEach(async () => {
      // Create test visits
      await createVisit({
        patient,
        dietitian: dietitianUser,
        visit_date: new Date('2024-01-15'),
        visit_type: 'Initial Consultation',
        status: 'SCHEDULED'
      });

      await createVisit({
        patient,
        dietitian: dietitianUser,
        visit_date: new Date('2024-02-20'),
        visit_type: 'Follow-up',
        status: 'COMPLETED'
      });

      await createVisit({
        patient: otherPatient,
        dietitian: otherDietitianUser,
        visit_date: new Date('2024-01-10'),
        visit_type: 'Initial Consultation',
        status: 'SCHEDULED'
      });
    });

    it('should return all visits for admin', async () => {
      const res = await request(app)
        .get('/api/visits')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.visits).toHaveLength(3);
      expect(res.body.data.total).toBe(3);
    });

    it('should return only assigned patient visits for dietitian', async () => {
      const res = await request(app)
        .get('/api/visits')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.visits).toHaveLength(2);
      expect(res.body.data.visits[0].patient_id).toBe(patient.id);
    });

    it('should filter by patient_id', async () => {
      const res = await request(app)
        .get('/api/visits')
        .query({ patient_id: patient.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.visits).toHaveLength(2);
      expect(res.body.data.visits.every(v => v.patient_id === patient.id)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/visits')
        .query({ status: 'SCHEDULED' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.visits).toHaveLength(2);
      expect(res.body.data.visits.every(v => v.status === 'SCHEDULED')).toBe(true);
    });

    it('should filter by visit_type', async () => {
      const res = await request(app)
        .get('/api/visits')
        .query({ visit_type: 'Initial Consultation' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.visits).toHaveLength(2);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/visits')
        .query({
          from_date: '2024-02-01',
          to_date: '2024-02-28'
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.visits).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/visits')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.visits).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(3);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/visits');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/visits/:id', () => {
    let visit;

    beforeEach(async () => {
      visit = await createVisit({
        patient,
        dietitian: dietitianUser,
        visit_date: new Date(),
        visit_type: 'Initial Consultation',
        chief_complaint: 'Weight loss consultation'
      });
    });

    it('should return visit details for admin', async () => {
      const res = await request(app)
        .get(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(visit.id);
      expect(res.body.data.chief_complaint).toBe('Weight loss consultation');
    });

    it('should return visit for assigned dietitian', async () => {
      const res = await request(app)
        .get(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(visit.id);
    });

    it('should deny access to unassigned dietitian', async () => {
      const res = await request(app)
        .get(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${otherDietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .get('/api/visits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/visits/${visit.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/visits', () => {
    it('should create visit successfully', async () => {
      const visitData = {
        patient_id: patient.id,
        visit_date: new Date().toISOString(),
        visit_type: 'Initial Consultation',
        chief_complaint: 'Nutritional counseling',
        subjective: 'Patient reports low energy',
        objective: 'Patient appears healthy',
        assessment: 'Possible dietary deficiency',
        plan: 'Increase iron-rich foods'
      };

      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send(visitData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(patient.id);
      expect(res.body.data.status).toBe('SCHEDULED');
    });

    it('should create visit with measurements', async () => {
      const visitData = {
        patient_id: patient.id,
        visit_date: new Date().toISOString(),
        visit_type: 'Follow-up',
        weight: 75.5,
        height: 175.0,
        bmi: 24.7,
        blood_pressure: '120/80'
      };

      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send(visitData);

      expect(res.status).toBe(201);
      expect(res.body.data.weight).toBe(75.5);
      expect(res.body.data.height).toBe(175.0);
      expect(res.body.data.bmi).toBe(24.7);
    });

    it('should reject without required fields', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          patient_id: patient.id
          // Missing visit_date and visit_type
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject for non-existent patient', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          patient_id: '00000000-0000-0000-0000-000000000000',
          visit_date: new Date().toISOString(),
          visit_type: 'Initial Consultation'
        });

      expect(res.status).toBe(404);
    });

    it('should reject for unassigned patient', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          patient_id: otherPatient.id,
          visit_date: new Date().toISOString(),
          visit_type: 'Initial Consultation'
        });

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/visits')
        .send({
          patient_id: patient.id,
          visit_date: new Date().toISOString(),
          visit_type: 'Initial Consultation'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/visits/:id', () => {
    let visit;

    beforeEach(async () => {
      visit = await createVisit({
        patient,
        dietitian: dietitianUser,
        visit_date: new Date(),
        visit_type: 'Initial Consultation',
        status: 'SCHEDULED'
      });
    });

    it('should update visit successfully', async () => {
      const res = await request(app)
        .put(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          chief_complaint: 'Updated complaint',
          assessment: 'New assessment'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chief_complaint).toBe('Updated complaint');
      expect(res.body.data.assessment).toBe('New assessment');
    });

    it('should update visit status', async () => {
      const res = await request(app)
        .put(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          status: 'COMPLETED'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('should update measurements', async () => {
      const res = await request(app)
        .put(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          weight: 80.0,
          height: 180.0,
          bmi: 24.7
        });

      expect(res.status).toBe(200);
      expect(res.body.data.weight).toBe(80.0);
    });

    it('should allow admin to update any visit', async () => {
      const otherVisit = await createVisit({
        patient: otherPatient,
        dietitian: otherDietitianUser,
        visit_date: new Date(),
        visit_type: 'Follow-up'
      });

      const res = await request(app)
        .put(`/api/visits/${otherVisit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Admin update'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Admin update');
    });

    it('should deny unassigned dietitian', async () => {
      const res = await request(app)
        .put(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${otherDietitianToken}`)
        .send({
          notes: 'Unauthorized update'
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .put('/api/visits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Test'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/visits/:id', () => {
    let visit;

    beforeEach(async () => {
      visit = await createVisit({
        patient,
        dietitian: dietitianUser,
        visit_date: new Date(),
        visit_type: 'Initial Consultation'
      });
    });

    it('should delete visit successfully', async () => {
      const res = await request(app)
        .delete(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify visit is soft deleted
      const deletedVisit = await db.Visit.findByPk(visit.id, { paranoid: false });
      expect(deletedVisit.deleted_at).not.toBeNull();
    });

    it('should allow admin to delete any visit', async () => {
      const otherVisit = await createVisit({
        patient: otherPatient,
        dietitian: otherDietitianUser,
        visit_date: new Date(),
        visit_type: 'Follow-up'
      });

      const res = await request(app)
        .delete(`/api/visits/${otherVisit.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny unassigned dietitian', async () => {
      const res = await request(app)
        .delete(`/api/visits/${visit.id}`)
        .set('Authorization', `Bearer ${otherDietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent visit', async () => {
      const res = await request(app)
        .delete('/api/visits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/visits/stats', () => {
    beforeEach(async () => {
      await createVisit({
        patient,
        dietitian: dietitianUser,
        visit_date: new Date(),
        visit_type: 'Initial Consultation',
        status: 'SCHEDULED'
      });

      await createVisit({
        patient,
        dietitian: dietitianUser,
        visit_date: new Date(),
        visit_type: 'Follow-up',
        status: 'COMPLETED'
      });

      await createVisit({
        patient: otherPatient,
        dietitian: otherDietitianUser,
        visit_date: new Date(),
        visit_type: 'Initial Consultation',
        status: 'SCHEDULED'
      });
    });

    it('should return stats for admin', async () => {
      const res = await request(app)
        .get('/api/visits/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.by_status).toBeDefined();
      expect(res.body.data.by_type).toBeDefined();
    });

    it('should return only assigned patient stats for dietitian', async () => {
      const res = await request(app)
        .get('/api/visits/stats')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
    });
  });
});
