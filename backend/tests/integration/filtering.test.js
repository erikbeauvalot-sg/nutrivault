/**
 * Integration Tests: Advanced Filtering & Search
 *
 * Tests the complete filtering and search functionality across all endpoints
 * including operators, search, pagination, sorting, RBAC, and validation.
 */

const request = require('supertest');
const app = require('../../src/server');
const db = require('../../../models');
const { createUser, createRole, createPatient, createVisit, createBilling, createPermission } = require('../helpers');

describe('Advanced Filtering & Search - Integration Tests', () => {
  let adminToken;
  let dietitianToken;
  let adminUser;
  let dietitianUser;
  let adminRole;
  let dietitianRole;

  // Recreate auth users before each test since global afterEach clears all data
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
      { name: 'users.list', resource: 'users', action: 'list' },
      { name: 'users.read', resource: 'users', action: 'read' },
      { name: 'visits.list', resource: 'visits', action: 'list' },
      { name: 'visits.read', resource: 'visits', action: 'read' },
      { name: 'billing.list', resource: 'billing', action: 'list' },
      { name: 'billing.read', resource: 'billing', action: 'read' },
      { name: 'audit.list', resource: 'audit', action: 'list' },
      { name: 'audit.read', resource: 'audit', action: 'read' }
    ];

    for (const permData of permissions) {
      const permission = await createPermission(permData);
      // Assign all permissions to admin role
      await db.RolePermission.create({
        role_id: adminRole.id,
        permission_id: permission.id
      });
      // Assign non-admin permissions to dietitian role
      if (!permData.name.includes('users') && !permData.name.includes('audit')) {
        await db.RolePermission.create({
          role_id: dietitianRole.id,
          permission_id: permission.id
        });
      }
    }

    // Create users
    adminUser = await createUser({
      username: 'admin_filter',
      email: 'admin_filter@test.com',
      role: adminRole
    });

    dietitianUser = await createUser({
      username: 'dietitian_filter',
      email: 'dietitian_filter@test.com',
      role: dietitianRole
    });

    // Login to get tokens
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_filter', password: 'Test123!' });
    adminToken = adminLoginRes.body.data.accessToken;

    const dietitianLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dietitian_filter', password: 'Test123!' });
    dietitianToken = dietitianLoginRes.body.data.accessToken;
  });

  describe('Patients Endpoint - GET /api/patients', () => {
    let patient1, patient2, patient3;

    beforeEach(async () => {
      // Create test patients
      patient1 = await createPatient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@test.com',
        phone: '123-456-7890',
        date_of_birth: new Date('1990-01-15'),
        gender: 'MALE',
        city: 'Toronto',
        country: 'Canada',
        is_active: true,
        dietitian: dietitianUser,
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });

      patient2 = await createPatient({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@test.com',
        phone: '098-765-4321',
        date_of_birth: new Date('1985-06-20'),
        gender: 'FEMALE',
        city: 'Vancouver',
        country: 'Canada',
        is_active: true,
        dietitian: adminUser,
        assigned_dietitian_id: null,
        created_by: adminUser.id
      });

      patient3 = await createPatient({
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob.johnson@test.com',
        phone: '555-555-5555',
        date_of_birth: new Date('2000-12-31'),
        gender: 'MALE',
        city: 'Toronto',
        country: 'Canada',
        is_active: false,
        dietitian: dietitianUser,
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });
    });

    describe('Exact Match (_eq)', () => {
      it('should filter by exact gender match', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ gender: 'MALE' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.patients.every(p => p.gender === 'MALE')).toBe(true);
      });

      it('should filter by boolean field', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ is_active: true })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.patients.every(p => p.is_active === true)).toBe(true);
      });

      it('should filter by city', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ city: 'Toronto' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.patients.every(p => p.city === 'Toronto')).toBe(true);
      });
    });

    describe('Comparison Operators', () => {
      it('should filter by date_of_birth_gte', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ date_of_birth_gte: '1990-01-01' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.patients.every(p => new Date(p.date_of_birth) >= new Date('1990-01-01'))).toBe(true);
      });

      it('should filter by date_of_birth_lte', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ date_of_birth_lte: '1990-12-31' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.patients.every(p => new Date(p.date_of_birth) <= new Date('1990-12-31'))).toBe(true);
      });

      it('should combine multiple comparison operators', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({
            date_of_birth_gte: '1985-01-01',
            date_of_birth_lte: '1995-12-31'
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
      });
    });

    describe('List Operators (_in)', () => {
      it('should filter by gender_in with multiple values', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ gender_in: 'MALE,FEMALE' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(3);
      });

      it('should filter by city_in', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ city_in: 'Toronto,Vancouver' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(3);
      });
    });

    describe('Null Operators', () => {
      it('should filter by assigned_dietitian_id_null=true', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ assigned_dietitian_id_null: true })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(1);
        expect(res.body.data.patients[0].assigned_dietitian_id).toBeNull();
      });

      it('should filter by assigned_dietitian_id_not_null=true', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ assigned_dietitian_id_not_null: true })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.patients.every(p => p.assigned_dietitian_id !== null)).toBe(true);
      });
    });

    describe('String Operators (_like, _ilike)', () => {
      it('should filter by city_like (case-sensitive)', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ city_like: 'Tor' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by city_ilike (case-insensitive)', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ city_ilike: 'tor' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Multi-Field Search', () => {
      it('should search across first_name, last_name, email, phone', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ search: 'john' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients.length).toBeGreaterThanOrEqual(2);
      });

      it('should search by email pattern', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ search: 'jane.smith' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(1);
        expect(res.body.data.patients[0].email).toBe('jane.smith@test.com');
      });

      it('should search by phone pattern', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ search: '555-555' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(1);
      });
    });

    describe('Pagination', () => {
      it('should limit results', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ limit: 2 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.total).toBe(3);
        expect(res.body.data.limit).toBe(2);
      });

      it('should offset results', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ limit: 2, offset: 1 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.offset).toBe(1);
      });

      it('should reject invalid limit (too high)', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ limit: 200 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Sorting', () => {
      it('should sort by first_name ASC', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ sort_by: 'first_name', sort_order: 'ASC' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        const names = res.body.data.patients.map(p => p.first_name);
        expect(names).toEqual([...names].sort());
      });

      it('should sort by date_of_birth DESC', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ sort_by: 'date_of_birth', sort_order: 'DESC' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        const dates = res.body.data.patients.map(p => new Date(p.date_of_birth).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => b - a));
      });

      it('should reject invalid sort_by field', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ sort_by: 'invalid_field' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Legacy Filters (Backward Compatibility)', () => {
      it('should support age_min filter', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ age_min: 25 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients.length).toBeGreaterThanOrEqual(2);
      });

      it('should support age_max filter', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ age_max: 30 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients.length).toBeGreaterThanOrEqual(1);
      });

      it('should support age_min and age_max together', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ age_min: 20, age_max: 40 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('RBAC - Dietitian Access', () => {
      it('should return only assigned patients for dietitian', async () => {
        const res = await request(app)
          .get('/api/patients')
          .set('Authorization', `Bearer ${dietitianToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(2);
        expect(res.body.data.patients.every(p => p.assigned_dietitian_id === dietitianUser.id)).toBe(true);
      });

      it('should filter assigned patients with additional filters', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ is_active: true })
          .set('Authorization', `Bearer ${dietitianToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(1);
      });
    });

    describe('Combined Filters', () => {
      it('should combine multiple filters correctly', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({
            city: 'Toronto',
            is_active: true,
            gender: 'MALE'
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients).toHaveLength(1);
        expect(res.body.data.patients[0].first_name).toBe('John');
      });

      it('should combine search with filters', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({
            search: 'john',
            city: 'Toronto'
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.patients.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid UUID format', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ assigned_dietitian_id: 'invalid-uuid' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid date format', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ date_of_birth_gte: 'invalid-date' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid boolean value', async () => {
        const res = await request(app)
          .get('/api/patients')
          .query({ is_active: 'maybe' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Visits Endpoint - GET /api/visits', () => {
    let visit1, visit2, visit3;
    let patient;

    beforeEach(async () => {
      patient = await createPatient({
        first_name: 'Test',
        last_name: 'Patient',
        email: 'test.patient@test.com',
        date_of_birth: new Date('1990-01-01'),
        dietitian: dietitianUser,
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });

      visit1 = await createVisit({
        patient: patient,
        dietitian: dietitianUser,
        patient_id: patient.id,
        dietitian_id: dietitianUser.id,
        visit_date: new Date('2024-01-15T10:00:00'),
        duration_minutes: 30,
        visit_type: 'INITIAL_CONSULTATION',
        status: 'COMPLETED',
        chief_complaint: 'Weight management and diabetes control',
        assessment: 'Patient shows good progress',
        recommendations: 'Continue current meal plan',
        private_notes: 'Patient is very motivated'
      });

      visit2 = await createVisit({
        patient: patient,
        dietitian: dietitianUser,
        patient_id: patient.id,
        dietitian_id: dietitianUser.id,
        visit_date: new Date('2024-02-20T14:30:00'),
        duration_minutes: 60,
        visit_type: 'FOLLOW_UP',
        status: 'COMPLETED',
        chief_complaint: 'Follow-up on diet plan',
        assessment: 'Excellent compliance',
        recommendations: 'Increase protein intake'
      });

      visit3 = await createVisit({
        patient: patient,
        dietitian: dietitianUser,
        patient_id: patient.id,
        dietitian_id: dietitianUser.id,
        visit_date: new Date('2024-03-10T09:00:00'),
        duration_minutes: 45,
        visit_type: 'FOLLOW_UP',
        status: 'SCHEDULED',
        chief_complaint: 'Routine check-up'
      });
    });

    describe('Status Filtering', () => {
      it('should filter by exact status', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ status: 'COMPLETED' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits.every(v => v.status === 'COMPLETED')).toBe(true);
      });

      it('should filter by status_in with multiple values', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ status_in: 'COMPLETED,SCHEDULED' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(3);
      });

      it('should filter by status_ne', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ status_ne: 'CANCELLED' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(3);
      });
    });

    describe('Date Filtering', () => {
      it('should filter by visit_date_gte', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ visit_date_gte: '2024-02-01' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(2);
      });

      it('should filter by visit_date_lte', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ visit_date_lte: '2024-02-28' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(2);
      });

      it('should filter by date range', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({
            visit_date_gte: '2024-01-01',
            visit_date_lte: '2024-02-28'
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(2);
      });
    });

    describe('Duration Filtering', () => {
      it('should filter by duration_minutes_gt', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ duration_minutes_gt: 40 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(2);
        expect(res.body.data.visits.every(v => v.duration_minutes > 40)).toBe(true);
      });

      it('should filter by duration_minutes_between', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ duration_minutes_between: '30,50' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(2);
      });
    });

    describe('Search Functionality', () => {
      it('should search in chief_complaint', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ search: 'diabetes' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(1);
      });

      it('should search in assessment', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ search: 'compliance' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(1);
      });

      it('should search in recommendations', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ search: 'protein' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(1);
      });

      it('should search in private_notes', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ search: 'motivated' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(1);
      });
    });

    describe('Legacy Date Filters', () => {
      it('should support from_date filter', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ from_date: '2024-02-01' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(2);
      });

      it('should support to_date filter', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({ to_date: '2024-02-28' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(2);
      });

      it('should support from_date and to_date together', async () => {
        const res = await request(app)
          .get('/api/visits')
          .query({
            from_date: '2024-01-01',
            to_date: '2024-01-31'
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.visits).toHaveLength(1);
      });
    });
  });

  describe('Billing Endpoint - GET /api/billing', () => {
    let billing1, billing2, billing3;
    let patient;

    beforeEach(async () => {
      patient = await createPatient({
        first_name: 'Billing',
        last_name: 'Patient',
        email: 'billing.patient@test.com',
        date_of_birth: new Date('1990-01-01'),
        dietitian: dietitianUser,
        assigned_dietitian_id: dietitianUser.id,
        created_by: dietitianUser.id
      });

      billing1 = await createBilling({
        patient: patient,
        patient_id: patient.id,
        invoice_number: 'INV-2024-001',
        invoice_date: new Date('2024-01-15'),
        due_date: new Date('2024-02-15'),
        amount: 100.00,
        tax_amount: 13.00,
        total_amount: 113.00,
        status: 'PAID',
        payment_method: 'CREDIT_CARD',
        payment_date: new Date('2024-01-20'),
        notes: 'Initial consultation payment'
      });

      billing2 = await createBilling({
        patient: patient,
        patient_id: patient.id,
        invoice_number: 'INV-2024-002',
        invoice_date: new Date('2024-02-15'),
        due_date: new Date('2024-03-15'),
        amount: 250.00,
        tax_amount: 32.50,
        total_amount: 282.50,
        status: 'PENDING',
        notes: 'Follow-up session'
      });

      billing3 = await createBilling({
        patient: patient,
        patient_id: patient.id,
        invoice_number: 'INV-2024-003',
        invoice_date: new Date('2024-03-01'),
        due_date: new Date('2024-04-01'),
        amount: 500.00,
        tax_amount: 65.00,
        total_amount: 565.00,
        status: 'OVERDUE'
      });
    });

    describe('Amount Filtering', () => {
      it('should filter by amount_gt', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ amount_gt: 200 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing.every(b => b.amount > 200)).toBe(true);
      });

      it('should filter by total_amount_gte', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ total_amount_gte: 280 })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(2);
      });

      it('should filter by amount_between', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ amount_between: '100,300' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(2);
      });
    });

    describe('Status Filtering', () => {
      it('should filter by status_in', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ status_in: 'PENDING,OVERDUE' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(2);
      });

      it('should filter by payment_method', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ payment_method: 'CREDIT_CARD' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(1);
      });
    });

    describe('Date Filtering', () => {
      it('should filter by invoice_date_gte', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ invoice_date_gte: '2024-02-01' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(2);
      });

      it('should filter by payment_date_null', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ payment_date_null: true })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(2);
      });

      it('should filter by payment_date_not_null', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ payment_date_not_null: true })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(1);
      });
    });

    describe('Search Functionality', () => {
      it('should search in invoice_number', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ search: 'INV-2024-002' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(1);
      });

      it('should search in notes', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({ search: 'consultation' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(1);
      });
    });

    describe('Legacy Date Filters', () => {
      it('should support from_date and to_date', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({
            from_date: '2024-01-01',
            to_date: '2024-02-28'
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(2);
      });
    });

    describe('Complex Queries', () => {
      it('should combine multiple filters', async () => {
        const res = await request(app)
          .get('/api/billing')
          .query({
            status_in: 'PENDING,OVERDUE',
            total_amount_gt: 200,
            sort_by: 'total_amount',
            sort_order: 'DESC'
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.billing).toHaveLength(2);
        // Verify sorting
        const amounts = res.body.data.billing.map(b => b.total_amount);
        expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
      });
    });
  });

  describe('Users Endpoint - GET /api/users', () => {
    let user1, user2;

    beforeEach(async () => {
      user1 = await createUser({
        username: 'test_user1',
        email: 'test_user1@test.com',
        first_name: 'Alice',
        last_name: 'Anderson',
        role: dietitianRole,
        is_active: true
      });

      user2 = await createUser({
        username: 'test_user2',
        email: 'test_user2@test.com',
        first_name: 'Bob',
        last_name: 'Brown',
        role: adminRole,
        is_active: false
      });
    });

    describe('User Filtering', () => {
      it('should filter by role_id', async () => {
        const res = await request(app)
          .get('/api/users')
          .query({ role_id: adminRole.id })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.users.some(u => u.id === adminUser.id)).toBe(true);
      });

      it('should filter by is_active', async () => {
        const res = await request(app)
          .get('/api/users')
          .query({ is_active: true })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.users.every(u => u.is_active === true)).toBe(true);
      });
    });

    describe('Search Functionality', () => {
      it('should search in username, email, first_name, last_name', async () => {
        const res = await request(app)
          .get('/api/users')
          .query({ search: 'alice' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Sorting', () => {
      it('should sort by username', async () => {
        const res = await request(app)
          .get('/api/users')
          .query({ sort_by: 'username', sort_order: 'ASC' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        const usernames = res.body.data.users.map(u => u.username);
        expect(usernames).toEqual([...usernames].sort());
      });
    });
  });

  describe('Audit Endpoint - GET /api/audit-logs', () => {
    describe('Audit Filtering', () => {
      it('should filter by action', async () => {
        const res = await request(app)
          .get('/api/audit-logs')
          .query({ action: 'LOGIN' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should filter by status', async () => {
        const res = await request(app)
          .get('/api/audit-logs')
          .query({ status: 'SUCCESS' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('Search Functionality', () => {
      it('should search in username, action, resource_type', async () => {
        const res = await request(app)
          .get('/api/audit-logs')
          .query({ search: 'admin' })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('Default Pagination', () => {
      it('should default to limit=100 for audit logs', async () => {
        const res = await request(app)
          .get('/api/audit-logs')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.limit).toBe(100);
      });
    });
  });
});
