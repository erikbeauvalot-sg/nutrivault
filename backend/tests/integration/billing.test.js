/**
 * Integration Tests: Billing API
 *
 * Tests billing management endpoints with RBAC:
 * - CRUD operations
 * - Admin vs Dietitian access control
 * - Payment processing
 * - Invoice calculations
 * - Search and filtering
 */

const request = require('supertest');
const app = require('../../src/server');
const { createUser, createRole, createPatient, createVisit, createBilling, createPermission } = require('../helpers');
const db = require('../../../models');

describe('Billing API - Integration Tests', () => {
  let adminToken, dietitianToken, otherDietitianToken;
  let adminUser, dietitianUser, otherDietitianUser;
  let adminRole, dietitianRole;
  let patient, otherPatient, visit;

  beforeEach(async () => {
    // Create roles
    adminRole = await createRole({ name: 'ADMIN' });
    dietitianRole = await createRole({ name: 'DIETITIAN' });

    // Create permissions
    const permissions = [
      { name: 'billing.list', resource: 'billing', action: 'list' },
      { name: 'billing.read', resource: 'billing', action: 'read' },
      { name: 'billing.create', resource: 'billing', action: 'create' },
      { name: 'billing.update', resource: 'billing', action: 'update' },
      { name: 'billing.delete', resource: 'billing', action: 'delete' }
    ];

    for (const permData of permissions) {
      const perm = await createPermission(permData);
      await db.RolePermission.create({ role_id: adminRole.id, permission_id: perm.id });
      await db.RolePermission.create({ role_id: dietitianRole.id, permission_id: perm.id });
    }

    // Create users
    adminUser = await createUser({
      username: 'admin_billing',
      email: 'admin_billing@test.com',
      role: adminRole
    });

    dietitianUser = await createUser({
      username: 'dietitian_billing',
      email: 'dietitian_billing@test.com',
      role: dietitianRole
    });

    otherDietitianUser = await createUser({
      username: 'other_dietitian_billing',
      email: 'other_dietitian_billing@test.com',
      role: dietitianRole
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_billing', password: 'Test123!' });
    adminToken = adminLogin.body.data.accessToken;

    const dietitianLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dietitian_billing', password: 'Test123!' });
    dietitianToken = dietitianLogin.body.data.accessToken;

    const otherDietitianLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'other_dietitian_billing', password: 'Test123!' });
    otherDietitianToken = otherDietitianLogin.body.data.accessToken;

    // Create test patients and visit
    patient = await createPatient({
      first_name: 'John',
      last_name: 'Billing',
      email: 'john.billing@test.com',
      assigned_dietitian_id: dietitianUser.id,
      created_by: dietitianUser.id
    });

    otherPatient = await createPatient({
      first_name: 'Jane',
      last_name: 'Invoice',
      email: 'jane.invoice@test.com',
      assigned_dietitian_id: otherDietitianUser.id,
      created_by: otherDietitianUser.id
    });

    visit = await createVisit({
      patient,
      dietitian: dietitianUser,
      visit_date: new Date(),
      visit_type: 'Initial Consultation'
    });
  });

  describe('GET /api/billing', () => {
    beforeEach(async () => {
      await createBilling({
        patient,
        visit,
        invoice_number: 'INV-001',
        status: 'PENDING',
        amount: 100.00,
        tax_amount: 10.00
      });

      await createBilling({
        patient,
        invoice_number: 'INV-002',
        status: 'PAID',
        amount: 150.00,
        tax_amount: 15.00
      });

      await createBilling({
        patient: otherPatient,
        invoice_number: 'INV-003',
        status: 'PENDING',
        amount: 200.00,
        tax_amount: 20.00
      });
    });

    it('should return all billing records for admin', async () => {
      const res = await request(app)
        .get('/api/billing')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.billing).toHaveLength(3);
      expect(res.body.data.total).toBe(3);
    });

    it('should return only assigned patient billing for dietitian', async () => {
      const res = await request(app)
        .get('/api/billing')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.billing).toHaveLength(2);
      expect(res.body.data.billing.every(b => b.patient_id === patient.id)).toBe(true);
    });

    it('should filter by patient_id', async () => {
      const res = await request(app)
        .get('/api/billing')
        .query({ patient_id: patient.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.billing).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/billing')
        .query({ status: 'PAID' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.billing).toHaveLength(1);
      expect(res.body.data.billing[0].status).toBe('PAID');
    });

    it('should search by invoice_number', async () => {
      const res = await request(app)
        .get('/api/billing')
        .query({ search: 'INV-001' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.billing).toHaveLength(1);
      expect(res.body.data.billing[0].invoice_number).toBe('INV-001');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/billing')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.billing).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(3);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/billing');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/billing/:id', () => {
    let billing;

    beforeEach(async () => {
      billing = await createBilling({
        patient,
        visit,
        invoice_number: 'INV-TEST',
        amount: 120.00,
        tax_amount: 12.00,
        notes: 'Test invoice'
      });
    });

    it('should return billing details for admin', async () => {
      const res = await request(app)
        .get(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(billing.id);
      expect(res.body.data.invoice_number).toBe('INV-TEST');
      expect(res.body.data.total_amount).toBe(132.00);
    });

    it('should return billing for assigned dietitian', async () => {
      const res = await request(app)
        .get(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(billing.id);
    });

    it('should include patient details', async () => {
      const res = await request(app)
        .get(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.patient).toBeDefined();
      expect(res.body.data.patient.first_name).toBe('John');
    });

    it('should include visit details if linked', async () => {
      const res = await request(app)
        .get(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.visit).toBeDefined();
      expect(res.body.data.visit.id).toBe(visit.id);
    });

    it('should deny access to unassigned dietitian', async () => {
      const res = await request(app)
        .get(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${otherDietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent billing', async () => {
      const res = await request(app)
        .get('/api/billing/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/billing', () => {
    it('should create billing successfully', async () => {
      const billingData = {
        patient_id: patient.id,
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 150.00,
        tax_amount: 15.00,
        notes: 'Consultation fee'
      };

      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send(billingData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient_id).toBe(patient.id);
      expect(res.body.data.amount).toBe(150.00);
      expect(res.body.data.total_amount).toBe(165.00); // amount + tax
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.invoice_number).toBeDefined();
    });

    it('should create billing linked to visit', async () => {
      const billingData = {
        patient_id: patient.id,
        visit_id: visit.id,
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 120.00,
        tax_amount: 12.00
      };

      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send(billingData);

      expect(res.status).toBe(201);
      expect(res.body.data.visit_id).toBe(visit.id);
    });

    it('should reject without required fields', async () => {
      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          patient_id: patient.id
          // Missing invoice_date, due_date, amount
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject for non-existent patient', async () => {
      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          patient_id: '00000000-0000-0000-0000-000000000000',
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 100.00,
          tax_amount: 10.00
        });

      expect(res.status).toBe(404);
    });

    it('should reject for non-existent visit', async () => {
      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          patient_id: patient.id,
          visit_id: '00000000-0000-0000-0000-000000000000',
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 100.00,
          tax_amount: 10.00
        });

      expect(res.status).toBe(404);
    });

    it('should reject for unassigned patient', async () => {
      const res = await request(app)
        .post('/api/billing')
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          patient_id: otherPatient.id,
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 100.00,
          tax_amount: 10.00
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/billing/:id', () => {
    let billing;

    beforeEach(async () => {
      billing = await createBilling({
        patient,
        invoice_number: 'INV-UPDATE',
        status: 'PENDING',
        amount: 100.00,
        tax_amount: 10.00
      });
    });

    it('should update billing successfully', async () => {
      const res = await request(app)
        .put(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          notes: 'Updated notes',
          amount: 120.00
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notes).toBe('Updated notes');
      expect(res.body.data.amount).toBe(120.00);
      expect(res.body.data.total_amount).toBe(130.00); // 120 + 10 tax
    });

    it('should update status', async () => {
      const res = await request(app)
        .put(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          status: 'OVERDUE'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('OVERDUE');
    });

    it('should allow admin to update any billing', async () => {
      const otherBilling = await createBilling({
        patient: otherPatient,
        amount: 200.00,
        tax_amount: 20.00
      });

      const res = await request(app)
        .put(`/api/billing/${otherBilling.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Admin update'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Admin update');
    });

    it('should deny unassigned dietitian', async () => {
      const res = await request(app)
        .put(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${otherDietitianToken}`)
        .send({
          notes: 'Unauthorized update'
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent billing', async () => {
      const res = await request(app)
        .put('/api/billing/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Test'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/billing/:id/pay', () => {
    let billing;

    beforeEach(async () => {
      billing = await createBilling({
        patient,
        invoice_number: 'INV-PAY',
        status: 'PENDING',
        amount: 150.00,
        tax_amount: 15.00
      });
    });

    it('should mark invoice as paid', async () => {
      const res = await request(app)
        .post(`/api/billing/${billing.id}/pay`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          payment_method: 'CREDIT_CARD',
          payment_date: new Date().toISOString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.payment_method).toBe('CREDIT_CARD');
      expect(res.body.data.payment_date).toBeDefined();
    });

    it('should reject without payment_method', async () => {
      const res = await request(app)
        .post(`/api/billing/${billing.id}/pay`)
        .set('Authorization', `Bearer ${dietitianToken}`)
        .send({
          payment_date: new Date().toISOString()
        });

      expect(res.status).toBe(400);
    });

    it('should deny unassigned dietitian', async () => {
      const res = await request(app)
        .post(`/api/billing/${billing.id}/pay`)
        .set('Authorization', `Bearer ${otherDietitianToken}`)
        .send({
          payment_method: 'CASH',
          payment_date: new Date().toISOString()
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/billing/:id', () => {
    let billing;

    beforeEach(async () => {
      billing = await createBilling({
        patient,
        invoice_number: 'INV-DELETE',
        status: 'PENDING',
        amount: 100.00,
        tax_amount: 10.00
      });
    });

    it('should delete billing successfully', async () => {
      const res = await request(app)
        .delete(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify billing is soft deleted
      const deletedBilling = await db.Billing.findByPk(billing.id, { paranoid: false });
      expect(deletedBilling.deleted_at).not.toBeNull();
    });

    it('should prevent deleting paid invoice', async () => {
      billing.status = 'PAID';
      await billing.save();

      const res = await request(app)
        .delete(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('paid');
    });

    it('should allow admin to delete any billing', async () => {
      const otherBilling = await createBilling({
        patient: otherPatient,
        amount: 200.00,
        tax_amount: 20.00
      });

      const res = await request(app)
        .delete(`/api/billing/${otherBilling.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny unassigned dietitian', async () => {
      const res = await request(app)
        .delete(`/api/billing/${billing.id}`)
        .set('Authorization', `Bearer ${otherDietitianToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent billing', async () => {
      const res = await request(app)
        .delete('/api/billing/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/billing/stats', () => {
    beforeEach(async () => {
      await createBilling({
        patient,
        status: 'PAID',
        amount: 100.00,
        tax_amount: 10.00
      });

      await createBilling({
        patient,
        status: 'PENDING',
        amount: 150.00,
        tax_amount: 15.00
      });

      await createBilling({
        patient: otherPatient,
        status: 'PAID',
        amount: 200.00,
        tax_amount: 20.00
      });
    });

    it('should return revenue stats for admin', async () => {
      const res = await request(app)
        .get('/api/billing/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_revenue).toBeDefined();
      expect(res.body.data.pending_amount).toBeDefined();
      expect(res.body.data.by_status).toBeDefined();
    });

    it('should return only assigned patient revenue for dietitian', async () => {
      const res = await request(app)
        .get('/api/billing/stats')
        .set('Authorization', `Bearer ${dietitianToken}`);

      expect(res.status).toBe(200);
      // Should only include stats for dietitian's patients
      const totalRevenue = res.body.data.total_revenue || 0;
      expect(totalRevenue).toBeLessThanOrEqual(275.00); // 110 + 165 max
    });
  });
});
