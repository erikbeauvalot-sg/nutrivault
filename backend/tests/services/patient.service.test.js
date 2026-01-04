/**
 * Patient Service Unit Tests
 */

const patientService = require('../../src/services/patient.service');
const db = require('../../../models');
const { AppError } = require('../../src/middleware/errorHandler');
const { createRole, createUser, createPatient } = require('../helpers');

describe('Patient Service', () => {
  describe('getPatients', () => {
    let adminRole, dietitianRole, admin, dietitian1, dietitian2;
    let patient1, patient2, patient3;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian1 = await createUser({
        username: 'dietitian1',
        email: 'dietitian1@example.com',
        role: dietitianRole
      });

      dietitian2 = await createUser({
        username: 'dietitian2',
        email: 'dietitian2@example.com',
        role: dietitianRole
      });

      // Create patients assigned to different dietitians
      patient1 = await createPatient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-0001',
        dietitian: dietitian1
      });

      patient2 = await createPatient({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '555-0002',
        dietitian: dietitian1
      });

      patient3 = await createPatient({
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@example.com',
        phone: '555-0003',
        is_active: false,
        dietitian: dietitian2
      });
    });

    it('should get all patients for admin', async () => {
      // Reload admin with role
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatients({}, admin);

      expect(result.patients).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should get only assigned patients for dietitian', async () => {
      // Reload dietitian with role
      await dietitian1.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatients({}, dietitian1);

      expect(result.patients).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.patients.every(p => p.assigned_dietitian_id === dietitian1.id)).toBe(true);
    });

    it('should filter patients by active status', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatients({ is_active: true }, admin);

      expect(result.patients).toHaveLength(2);
      expect(result.patients.every(p => p.is_active === true)).toBe(true);
    });

    it('should search patients by name', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatients({ search: 'John' }, admin);

      expect(result.patients).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should search patients by email', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatients({ search: 'jane@' }, admin);

      expect(result.patients).toHaveLength(1);
      expect(result.patients[0].email).toBe('jane@example.com');
    });

    it('should paginate results', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatients({ limit: 2, offset: 0 }, admin);

      expect(result.patients).toHaveLength(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.total).toBe(3);
    });

    it('should sort patients', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatients({
        sort_by: 'last_name',
        sort_order: 'ASC'
      }, admin);

      expect(result.patients[0].last_name).toBe('Doe');
      expect(result.patients[1].last_name).toBe('Johnson');
      expect(result.patients[2].last_name).toBe('Smith');
    });
  });

  describe('getPatientById', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian, patient;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
    });

    it('should get patient by ID for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatientById(patient.id, admin);

      expect(result).toBeDefined();
      expect(result.id).toBe(patient.id);
      expect(result.first_name).toBe(patient.first_name);
      expect(result.assignedDietitian).toBeDefined();
    });

    it('should get patient by ID for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.getPatientById(patient.id, dietitian);

      expect(result).toBeDefined();
      expect(result.id).toBe(patient.id);
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.getPatientById(patient.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only view your assigned patients');
    });

    it('should throw error if patient not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.getPatientById('nonexistent-id', admin)
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('createPatient', () => {
    let dietitian, admin;

    beforeEach(async () => {
      const dietitianRole = await createRole({ name: 'DIETITIAN' });
      const adminRole = await createRole({ name: 'ADMIN' });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });
    });

    it('should create patient successfully', async () => {
      const patientData = {
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        email: 'test@example.com',
        phone: '555-0100',
        assigned_dietitian_id: dietitian.id
      };

      const result = await patientService.createPatient(patientData, admin.id);

      expect(result).toBeDefined();
      expect(result.first_name).toBe('Test');
      expect(result.last_name).toBe('Patient');
      expect(result.assigned_dietitian_id).toBe(dietitian.id);
      expect(result.is_active).toBe(true);
    });

    it('should throw error if required fields missing', async () => {
      const patientData = {
        first_name: 'Test'
        // Missing last_name and date_of_birth
      };

      await expect(
        patientService.createPatient(patientData, admin.id)
      ).rejects.toThrow('First name, last name, and date of birth are required');
    });

    it('should throw error if assigned dietitian not found', async () => {
      const patientData = {
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: '1990-01-01',
        assigned_dietitian_id: 'nonexistent-id'
      };

      await expect(
        patientService.createPatient(patientData, admin.id)
      ).rejects.toThrow('Assigned dietitian not found');
    });

    it('should create patient without assigned dietitian', async () => {
      const patientData = {
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: '1990-01-01'
      };

      const result = await patientService.createPatient(patientData, admin.id);

      expect(result).toBeDefined();
      expect(result.assigned_dietitian_id).toBeNull();
    });
  });

  describe('updatePatient', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian, patient;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        dietitian
      });
    });

    it('should update patient successfully for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        first_name: 'Updated',
        email: 'updated@example.com'
      };

      const result = await patientService.updatePatient(patient.id, updates, admin.id, admin);

      expect(result.first_name).toBe('Updated');
      expect(result.email).toBe('updated@example.com');
    });

    it('should update patient successfully for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        first_name: 'Updated',
        email: 'updated@example.com'
      };

      const result = await patientService.updatePatient(patient.id, updates, dietitian.id, dietitian);

      expect(result.first_name).toBe('Updated');
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = { first_name: 'Updated' };

      await expect(
        patientService.updatePatient(patient.id, updates, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only update your assigned patients');
    });

    it('should ignore non-allowed fields', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        first_name: 'Updated',
        is_active: false, // Should be ignored
        created_at: new Date() // Should be ignored
      };

      const result = await patientService.updatePatient(patient.id, updates, admin.id, admin);

      expect(result.first_name).toBe('Updated');
      expect(result.is_active).toBe(true); // Should remain true
    });

    it('should throw error if patient not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.updatePatient('nonexistent-id', { first_name: 'Test' }, admin.id, admin)
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('deletePatient', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian, patient;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
    });

    it('should soft delete patient for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.deletePatient(patient.id, admin.id, admin);

      expect(result.message).toBe('Patient deactivated successfully');

      // Verify patient is deactivated
      const deletedPatient = await db.Patient.findByPk(patient.id);
      expect(deletedPatient.is_active).toBe(false);
    });

    it('should soft delete patient for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.deletePatient(patient.id, dietitian.id, dietitian);

      expect(result.message).toBe('Patient deactivated successfully');
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.deletePatient(patient.id, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only delete your assigned patients');
    });

    it('should throw error if patient not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.deletePatient('nonexistent-id', admin.id, admin)
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('activatePatient', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian, patient;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({
        is_active: false,
        dietitian
      });
    });

    it('should activate patient for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.activatePatient(patient.id, admin.id, admin);

      expect(result.message).toBe('Patient activated successfully');

      // Verify patient is activated
      const activatedPatient = await db.Patient.findByPk(patient.id);
      expect(activatedPatient.is_active).toBe(true);
    });

    it('should activate patient for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.activatePatient(patient.id, dietitian.id, dietitian);

      expect(result.message).toBe('Patient activated successfully');
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.activatePatient(patient.id, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only activate your assigned patients');
    });

    it('should throw error if patient is already active', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });
      await patient.update({ is_active: true });

      await expect(
        patientService.activatePatient(patient.id, admin.id, admin)
      ).rejects.toThrow('Patient is already active');
    });

    it('should throw error if patient not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.activatePatient('nonexistent-id', admin.id, admin)
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('deactivatePatient', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian, patient;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian = await createUser({
        username: 'dietitian',
        email: 'dietitian@example.com',
        role: dietitianRole
      });

      otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });

      patient = await createPatient({ dietitian });
    });

    it('should deactivate patient for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.deactivatePatient(patient.id, admin.id, admin);

      expect(result.message).toBe('Patient deactivated successfully');

      // Verify patient is deactivated
      const deactivatedPatient = await db.Patient.findByPk(patient.id);
      expect(deactivatedPatient.is_active).toBe(false);
    });

    it('should deactivate patient for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await patientService.deactivatePatient(patient.id, dietitian.id, dietitian);

      expect(result.message).toBe('Patient deactivated successfully');
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.deactivatePatient(patient.id, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only deactivate your assigned patients');
    });

    it('should throw error if patient is already inactive', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });
      await patient.update({ is_active: false });

      await expect(
        patientService.deactivatePatient(patient.id, admin.id, admin)
      ).rejects.toThrow('Patient is already inactive');
    });

    it('should throw error if patient not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        patientService.deactivatePatient('nonexistent-id', admin.id, admin)
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('getPatientStats', () => {
    let adminRole, dietitianRole, admin, dietitian1, dietitian2;

    beforeEach(async () => {
      adminRole = await createRole({ name: 'ADMIN' });
      dietitianRole = await createRole({ name: 'DIETITIAN' });

      admin = await createUser({
        username: 'admin',
        email: 'admin@example.com',
        role: adminRole
      });

      dietitian1 = await createUser({
        username: 'dietitian1',
        email: 'dietitian1@example.com',
        role: dietitianRole
      });

      dietitian2 = await createUser({
        username: 'dietitian2',
        email: 'dietitian2@example.com',
        role: dietitianRole
      });

      // Create patients for different dietitians
      await createPatient({ dietitian: dietitian1 });
      await createPatient({ dietitian: dietitian1, is_active: false });
      await createPatient({ dietitian: dietitian2 });
    });

    it('should return correct patient statistics for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const stats = await patientService.getPatientStats(admin);

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.by_dietitian).toHaveLength(2);
    });

    it('should return only assigned patient statistics for dietitian', async () => {
      await dietitian1.reload({ include: [{ model: db.Role, as: 'role' }] });

      const stats = await patientService.getPatientStats(dietitian1);

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.inactive).toBe(1);
      expect(stats.by_dietitian).toHaveLength(0); // Dietitians don't see by_dietitian breakdown
    });
  });
});
