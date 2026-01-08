/**
 * Integration Tests: Patients API
 *
 * Tests patient management endpoints with RBAC:
 * - CRUD operations
 * - Admin vs Dietitian access control
 * - Patient assignment logic
 * - Search and filtering
 */

const request = require('supertest');
const app = require('../../src/app');
const { createUser, createRole, createPatient, createPermission } = require('../helpers');
const db = require('../../models');

describe('Patients API - Integration Tests', () => {
  let adminToken, dietitianToken, adminUser, dietitianUser, adminRole, dietitianRole;

  beforeEach(async () => {
    // Create roles
    adminRole = await createRole({ name: 'ADMIN' });
    dietitianRole = await createRole({ name: 'DIETITIAN' });

    // Create permissions
    const permissions = [
      { name: 'patients.list', resource: 'patients', action: 'list' },
      { name: 'patients.read', resource: 'patients', action: 'read' },
      { name: 'patients.create', resource: 'patients', action: 'create' },
      { name: 'patients.update', resource: 'patients', action: 'update' },
      { name: 'patients.delete', resource: 'patients', action: 'delete' }
    ];

    for (const permData of permissions) {
      const perm = await createPermission(permData);
      await db.RolePermission.create({ role_id: adminRole.id, permission_id: perm.id });
      await db.RolePermission.create({ role_id: dietitianRole.id, permission_id: perm.id });
    }

    // Create users
    adminUser = await createUser({
      username: 'admin_patient',
      email: 'admin_patient@test.com',
      role: adminRole
    });

    dietitianUser = await createUser({
      username: 'dietitian_patient',
      email: 'dietitian_patient@test.com',
      role: dietitianRole
    });

    // Login
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_patient', password: 'Test123!' });
    adminToken = adminLogin.body.data.accessToken;

    const dietitianLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dietitian_patient', password: 'Test123!' });
    dietitianToken = dietitianLogin.body.data.accessToken;
  });

  describe('GET /api/patients', () => {
    let patient1, patient2, patient3;

    beforeEach(async () => {
      patient1 = await createPatient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });

      patient2 = await createPatient({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@test.com',
        assigned_dietitian_id: adminUser.id,
        created_by: adminUser.id
      });

      patient3 = await createPatient({
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@test.com',
        is_active: false,
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });
    });

    it('should return all patients for admin', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.patients).toHaveLength(3);
    });

    it('should return only assigned patients for dietitian', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.patients).toHaveLength(2); // patient1 and patient3
      expect(res.body.data.patients.every(p => 
        p.assigned_dietitian_id === dietitianUser.id
      )).toBe(true);
    });

    it('should filter by active status', async () => {
      const res = await request(app)
        .get('/api/patients?is_active=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.patients).toHaveLength(2);
    });

    it('should search by name', async () => {
      const res = await request(app)
        .get('/api/patients?search=John')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.patients.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/patients');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/patients/:id', () => {
    let patient;

    beforeEach(async () => {
      patient = await createPatient({
        first_name: 'Test',
        last_name: 'Patient',
        email: 'testpatient@test.com',
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });
    });

    it('should return patient details for admin', async () => {
      const res = await request(app)
        .get(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(patient.id);
      expect(res.body.data.first_name).toBe('Test');
    });

    it('should return patient details for assigned dietitian', async () => {
      const res = await request(app)
        .get(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(patient.id);
    });

    it('should deny access for non-assigned dietitian', async () => {
      const otherDietitian = await createUser({
        username: 'other_dietitian',
        email: 'other@test.com',
        role: dietitianRole
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'other_dietitian', password: 'Test123!' });

      const res = await request(app)
        .get(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${otherLogin.body.data.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent patient', async () => {
      const res = await request(app)
        .get('/api/patients/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/patients', () => {
    it('should create patient successfully', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          first_name: 'New',
          last_name: 'Patient',
          email: 'newpatient@test.com',
          phone: '555-1234',
          date_of_birth: '1990-01-01',
          gender: 'MALE',
          assigned_dietitian_id: dietitianUser.id
        });

      expect(res.status).toBe(201);
      expect(res.body.data.first_name).toBe('New');
      expect(res.body.data.assigned_dietitian_id).toBe(dietitianUser.id);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          first_name: 'Test'
        });

      expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      await createPatient({
        first_name: 'Existing',
        last_name: 'Patient',
        email: 'existing@test.com',
        assigned_dietitian_id: dietitianUser.id
      });

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          first_name: 'New',
          last_name: 'Patient',
          email: 'existing@test.com',
          phone: '555-1234',
          date_of_birth: '1990-01-01',
          assigned_dietitian_id: dietitianUser.id
        });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/patients/:id', () => {
    let patient;

    beforeEach(async () => {
      patient = await createPatient({
        first_name: 'Original',
        last_name: 'Name',
        email: 'original@test.com',
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });
    });

    it('should update patient successfully', async () => {
      const res = await request(app)
        .put(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          first_name: 'Updated',
          phone: '555-9999'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('Updated');
      expect(res.body.data.phone).toBe('555-9999');
    });

    it('should deny update for non-assigned dietitian', async () => {
      const otherDietitian = await createUser({
        username: 'other_dietitian2',
        email: 'other2@test.com',
        role: dietitianRole
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'other_dietitian2', password: 'Test123!' });

      const res = await request(app)
        .put(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${otherLogin.body.data.accessToken}`)
        .send({ first_name: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/patients/:id', () => {
    let patient;

    beforeEach(async () => {
      patient = await createPatient({
        first_name: 'ToDelete',
        last_name: 'Patient',
        email: 'todelete@test.com',
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });
    });

    it('should soft delete patient', async () => {
      const res = await request(app)
        .delete(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);

      // Verify soft delete
      await patient.reload();
      expect(patient.is_active).toBe(false);
    });

    it('should deny delete for non-assigned dietitian', async () => {
      const otherDietitian = await createUser({
        username: 'other_dietitian3',
        email: 'other3@test.com',
        role: dietitianRole
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'other_dietitian3', password: 'Test123!' });

      const res = await request(app)
        .delete(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${otherLogin.body.data.accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
