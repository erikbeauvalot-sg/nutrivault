/**
 * Visit Service Unit Tests
 */

const visitService = require('../../src/services/visit.service');
const db = require('../../models');
const { AppError } = require('../../src/middleware/errorHandler');
const { createRole, createUser, createPatient, createVisit } = require('../helpers');

describe('Visit Service', () => {
  describe('getVisits', () => {
    let adminRole, dietitianRole, admin, dietitian1, dietitian2;
    let patient1, patient2, visit1, visit2, visit3;

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

      patient1 = await createPatient({ dietitian: dietitian1 });
      patient2 = await createPatient({ dietitian: dietitian2 });

      visit1 = await createVisit({ patient: patient1, dietitian: dietitian1, status: 'SCHEDULED' });
      visit2 = await createVisit({ patient: patient1, dietitian: dietitian1, status: 'COMPLETED' });
      visit3 = await createVisit({ patient: patient2, dietitian: dietitian2, status: 'SCHEDULED' });
    });

    it('should get all visits for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.getVisits({}, admin);

      expect(result.visits).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should get only own visits for dietitian', async () => {
      await dietitian1.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.getVisits({}, dietitian1);

      expect(result.visits).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.visits.every(v => v.dietitian_id === dietitian1.id)).toBe(true);
    });

    it('should filter visits by status', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.getVisits({ status: 'COMPLETED' }, admin);

      expect(result.visits).toHaveLength(1);
      expect(result.visits[0].status).toBe('COMPLETED');
    });

    it('should filter visits by patient_id', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.getVisits({ patient_id: patient1.id }, admin);

      expect(result.visits).toHaveLength(2);
      expect(result.visits.every(v => v.patient_id === patient1.id)).toBe(true);
    });

    it('should paginate results', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.getVisits({ limit: 2, offset: 0 }, admin);

      expect(result.visits).toHaveLength(2);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.total).toBe(3);
    });

    it('should deny dietitian access to other dietitian visits', async () => {
      await dietitian1.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        visitService.getVisits({ dietitian_id: dietitian2.id }, dietitian1)
      ).rejects.toThrow('Access denied. You can only view your own visits');
    });
  });

  describe('getVisitById', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian;
    let patient, visit;

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
      visit = await createVisit({ patient, dietitian });
    });

    it('should get visit by ID for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.getVisitById(visit.id, admin);

      expect(result).toBeDefined();
      expect(result.id).toBe(visit.id);
      expect(result.patient).toBeDefined();
      expect(result.dietitian).toBeDefined();
    });

    it('should get visit by ID for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.getVisitById(visit.id, dietitian);

      expect(result).toBeDefined();
      expect(result.id).toBe(visit.id);
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        visitService.getVisitById(visit.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only view visits for your assigned patients');
    });

    it('should throw error if visit not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        visitService.getVisitById('nonexistent-id', admin)
      ).rejects.toThrow('Visit not found');
    });
  });

  describe('createVisit', () => {
    let adminRole, dietitianRole, admin, dietitian, patient;

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

      patient = await createPatient({ dietitian });
    });

    it('should create visit successfully for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const visitData = {
        patient_id: patient.id,
        dietitian_id: dietitian.id,
        visit_date: new Date(),
        duration_minutes: 60,
        visit_type: 'Initial Consultation',
        status: 'SCHEDULED'
      };

      const result = await visitService.createVisit(visitData, admin.id, admin);

      expect(result).toBeDefined();
      expect(result.patient_id).toBe(patient.id);
      expect(result.dietitian_id).toBe(dietitian.id);
      expect(result.duration_minutes).toBe(60);
      expect(result.status).toBe('SCHEDULED');
    });

    it('should create visit for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const visitData = {
        patient_id: patient.id,
        visit_date: new Date(),
        duration_minutes: 30
      };

      const result = await visitService.createVisit(visitData, dietitian.id, dietitian);

      expect(result).toBeDefined();
      expect(result.dietitian_id).toBe(dietitian.id); // Should auto-assign
    });

    it('should throw error if required fields missing', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const visitData = {
        patient_id: patient.id
        // Missing visit_date and duration_minutes
      };

      await expect(
        visitService.createVisit(visitData, admin.id, admin)
      ).rejects.toThrow('Patient ID, visit date, and duration are required');
    });

    it('should throw error if patient not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const visitData = {
        patient_id: 'nonexistent-id',
        visit_date: new Date(),
        duration_minutes: 60
      };

      await expect(
        visitService.createVisit(visitData, admin.id, admin)
      ).rejects.toThrow('Patient not found');
    });

    it('should throw error if dietitian not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const visitData = {
        patient_id: patient.id,
        dietitian_id: 'nonexistent-id',
        visit_date: new Date(),
        duration_minutes: 60
      };

      await expect(
        visitService.createVisit(visitData, admin.id, admin)
      ).rejects.toThrow('Dietitian not found');
    });

    it('should deny non-assigned dietitian from creating visit', async () => {
      const otherDietitian = await createUser({
        username: 'other',
        email: 'other@example.com',
        role: dietitianRole
      });
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const visitData = {
        patient_id: patient.id,
        visit_date: new Date(),
        duration_minutes: 60
      };

      await expect(
        visitService.createVisit(visitData, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only manage visits for your assigned patients');
    });
  });

  describe('updateVisit', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian;
    let patient, visit;

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
      visit = await createVisit({
        patient,
        dietitian,
        status: 'SCHEDULED',
        visit_type: 'Initial Consultation'
      });
    });

    it('should update visit successfully for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        status: 'COMPLETED',
        assessment: 'Patient showing improvement'
      };

      const result = await visitService.updateVisit(visit.id, updates, admin.id, admin);

      expect(result.status).toBe('COMPLETED');
      expect(result.assessment).toBe('Patient showing improvement');
    });

    it('should update visit successfully for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        status: 'COMPLETED'
      };

      const result = await visitService.updateVisit(visit.id, updates, dietitian.id, dietitian);

      expect(result.status).toBe('COMPLETED');
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = { status: 'COMPLETED' };

      await expect(
        visitService.updateVisit(visit.id, updates, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only update visits for your assigned patients');
    });

    it('should ignore non-allowed fields', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const updates = {
        status: 'COMPLETED',
        patient_id: 'different-patient', // Should be ignored
        created_at: new Date() // Should be ignored
      };

      const result = await visitService.updateVisit(visit.id, updates, admin.id, admin);

      expect(result.status).toBe('COMPLETED');
      expect(result.patient_id).toBe(patient.id); // Should remain unchanged
    });

    it('should throw error if visit not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        visitService.updateVisit('nonexistent-id', { status: 'COMPLETED' }, admin.id, admin)
      ).rejects.toThrow('Visit not found');
    });
  });

  describe('deleteVisit', () => {
    let adminRole, dietitianRole, admin, dietitian, otherDietitian;
    let patient, visit;

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
      visit = await createVisit({ patient, dietitian });
    });

    it('should delete visit for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.deleteVisit(visit.id, admin.id, admin);

      expect(result.message).toBe('Visit deleted successfully');

      // Verify visit is deleted
      const deletedVisit = await db.Visit.findByPk(visit.id);
      expect(deletedVisit).toBeNull();
    });

    it('should delete visit for assigned dietitian', async () => {
      await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      const result = await visitService.deleteVisit(visit.id, dietitian.id, dietitian);

      expect(result.message).toBe('Visit deleted successfully');
    });

    it('should deny access for non-assigned dietitian', async () => {
      await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        visitService.deleteVisit(visit.id, otherDietitian.id, otherDietitian)
      ).rejects.toThrow('Access denied. You can only delete visits for your assigned patients');
    });

    it('should throw error if visit not found', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      await expect(
        visitService.deleteVisit('nonexistent-id', admin.id, admin)
      ).rejects.toThrow('Visit not found');
    });
  });

  describe('getVisitStats', () => {
    let adminRole, dietitianRole, admin, dietitian1, dietitian2;
    let patient1, patient2;

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

      patient1 = await createPatient({ dietitian: dietitian1 });
      patient2 = await createPatient({ dietitian: dietitian2 });

      // Create visits with different statuses and types
      await createVisit({ patient: patient1, dietitian: dietitian1, status: 'SCHEDULED', visit_type: 'Initial Consultation' });
      await createVisit({ patient: patient1, dietitian: dietitian1, status: 'COMPLETED', visit_type: 'Follow-up' });
      await createVisit({ patient: patient2, dietitian: dietitian2, status: 'SCHEDULED', visit_type: 'Initial Consultation' });
    });

    it('should return correct visit statistics for admin', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const stats = await visitService.getVisitStats({}, admin);

      expect(stats.total).toBe(3);
      expect(stats.by_status).toBeDefined();
      expect(stats.by_type).toBeDefined();
      expect(stats.by_dietitian).toHaveLength(2);
    });

    it('should return only own visit statistics for dietitian', async () => {
      await dietitian1.reload({ include: [{ model: db.Role, as: 'role' }] });

      const stats = await visitService.getVisitStats({}, dietitian1);

      expect(stats.total).toBe(2);
      expect(stats.by_status).toBeDefined();
      expect(stats.by_type).toBeDefined();
      expect(stats.by_dietitian).toHaveLength(0); // Dietitians don't see by_dietitian breakdown
    });

    it('should filter statistics by date range', async () => {
      await admin.reload({ include: [{ model: db.Role, as: 'role' }] });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = await visitService.getVisitStats({
        from_date: yesterday,
        to_date: tomorrow
      }, admin);

      expect(stats.total).toBe(3);
    });
  });
});
