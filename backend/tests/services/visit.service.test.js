/**
 * Visit Service Tests
 * Tests for visit.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { getFutureDate, getPastDate } = require('../fixtures/visits.fixture');

let db;
let visitService;

describe('Visit Service', () => {
  let adminAuth, dietitianAuth, dietitian2Auth;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    visitService = require('../../src/services/visit.service');
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
    dietitian2Auth = await testAuth.createDietitian();
  });

  // ========================================
  // Helpers
  // ========================================
  async function createPatientInDb(overrides = {}) {
    return db.Patient.create({
      first_name: overrides.first_name || 'Test',
      last_name: overrides.last_name || 'Patient',
      email: overrides.email || `patient_${Date.now()}_${Math.random()}@test.com`,
      is_active: overrides.is_active !== undefined ? overrides.is_active : true
    });
  }

  async function createVisitInDb(patientId, dietitianId, overrides = {}) {
    return db.Visit.create({
      patient_id: patientId,
      dietitian_id: dietitianId,
      visit_date: overrides.visit_date || getFutureDate(7),
      visit_type: overrides.visit_type || 'Follow-up',
      status: overrides.status || 'SCHEDULED',
      duration_minutes: overrides.duration_minutes || 60
    });
  }

  async function linkPatientToDietitian(patientId, dietitianId) {
    return db.PatientDietitian.create({ patient_id: patientId, dietitian_id: dietitianId });
  }

  // ================================================================
  // getVisits
  // ================================================================
  describe('getVisits', () => {
    let patientA, patientB, visitA1, visitA2, visitB1;

    beforeEach(async () => {
      // patientA belongs to dietitian1, patientB belongs to dietitian2
      patientA = await createPatientInDb({ first_name: 'Alice', last_name: 'Alpha' });
      patientB = await createPatientInDb({ first_name: 'Bob', last_name: 'Beta' });

      await linkPatientToDietitian(patientA.id, dietitianAuth.user.id);
      await linkPatientToDietitian(patientB.id, dietitian2Auth.user.id);

      visitA1 = await createVisitInDb(patientA.id, dietitianAuth.user.id, { visit_type: 'Initial Consultation' });
      visitA2 = await createVisitInDb(patientA.id, dietitianAuth.user.id, { visit_type: 'Follow-up' });
      visitB1 = await createVisitInDb(patientB.id, dietitian2Auth.user.id, { visit_type: 'Follow-up' });
    });

    it('should return all visits for admin', async () => {
      const result = await visitService.getVisits(adminAuth.user);

      expect(result.visits.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should return only dietitian own visits for DIETITIAN role', async () => {
      const result = await visitService.getVisits(dietitianAuth.user);

      expect(result.visits.length).toBe(2);
      const visitIds = result.visits.map(v => v.id);
      expect(visitIds).toContain(visitA1.id);
      expect(visitIds).toContain(visitA2.id);
      expect(visitIds).not.toContain(visitB1.id);
    });

    it('should return empty result when dietitian has no visits', async () => {
      const freshDietitian = await testAuth.createDietitian();
      const result = await visitService.getVisits(freshDietitian.user);

      expect(result.visits).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by patient_id', async () => {
      const result = await visitService.getVisits(adminAuth.user, { patient_id: patientA.id });

      expect(result.visits.length).toBe(2);
      result.visits.forEach(v => expect(v.patient_id).toBe(patientA.id));
    });

    it('should filter by status', async () => {
      // Create a completed visit
      await createVisitInDb(patientA.id, dietitianAuth.user.id, { status: 'COMPLETED', visit_date: getPastDate(1) });

      const result = await visitService.getVisits(adminAuth.user, { status: 'COMPLETED' });

      expect(result.visits.length).toBe(1);
      expect(result.visits[0].status).toBe('COMPLETED');
    });

    it('should filter by date range', async () => {
      const pastVisit = await createVisitInDb(patientA.id, dietitianAuth.user.id, {
        visit_date: getPastDate(30),
        status: 'COMPLETED'
      });

      const result = await visitService.getVisits(adminAuth.user, {
        start_date: getPastDate(60),
        end_date: getPastDate(1)
      });

      expect(result.visits.length).toBe(1);
      expect(result.visits[0].id).toBe(pastVisit.id);
    });

    it('should search by patient name', async () => {
      const result = await visitService.getVisits(adminAuth.user, { search: 'Alice' });

      expect(result.visits.length).toBe(2);
      result.visits.forEach(v => expect(v.patient_id).toBe(patientA.id));
    });

    it('should paginate results', async () => {
      const result = await visitService.getVisits(adminAuth.user, { page: 1, limit: 2 });

      expect(result.visits.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should include patient and dietitian associations', async () => {
      const result = await visitService.getVisits(adminAuth.user);

      const visit = result.visits.find(v => v.id === visitA1.id);
      expect(visit.patient).toBeDefined();
      expect(visit.patient.id).toBe(patientA.id);
      expect(visit.dietitian).toBeDefined();
      expect(visit.dietitian.id).toBe(dietitianAuth.user.id);
    });

    it('should return pagination metadata', async () => {
      const result = await visitService.getVisits(adminAuth.user);

      expect(result).toHaveProperty('visits');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });
  });

  // ================================================================
  // getVisitById
  // ================================================================
  describe('getVisitById', () => {
    let patient, ownVisit, otherVisit;

    beforeEach(async () => {
      patient = await createPatientInDb();

      // Link patient to dietitianAuth
      await linkPatientToDietitian(patient.id, dietitianAuth.user.id);

      ownVisit = await createVisitInDb(patient.id, dietitianAuth.user.id);

      const patient2 = await createPatientInDb();
      await linkPatientToDietitian(patient2.id, dietitian2Auth.user.id);
      otherVisit = await createVisitInDb(patient2.id, dietitian2Auth.user.id);
    });

    it('should return visit for the owning dietitian', async () => {
      const result = await visitService.getVisitById(dietitianAuth.user, ownVisit.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(ownVisit.id);
    });

    it('should include patient and dietitian associations', async () => {
      const result = await visitService.getVisitById(dietitianAuth.user, ownVisit.id);

      expect(result.patient).toBeDefined();
      expect(result.patient.id).toBe(patient.id);
      expect(result.dietitian).toBeDefined();
      expect(result.dietitian.id).toBe(dietitianAuth.user.id);
    });

    it('should allow admin to access any visit', async () => {
      const result = await visitService.getVisitById(adminAuth.user, otherVisit.id);

      expect(result.id).toBe(otherVisit.id);
    });

    it('should throw "Visit not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        visitService.getVisitById(adminAuth.user, fakeId)
      ).rejects.toThrow('Visit not found');
    });

    it('should throw access denied when dietitian accesses another dietitians visit', async () => {
      await expect(
        visitService.getVisitById(dietitianAuth.user, otherVisit.id)
      ).rejects.toThrow(/access denied/i);
    });
  });

  // ================================================================
  // createVisit
  // ================================================================
  describe('createVisit', () => {
    let patient;

    beforeEach(async () => {
      patient = await createPatientInDb();
    });

    it('should create a visit with required fields', async () => {
      const result = await visitService.createVisit(adminAuth.user, {
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: getFutureDate(7),
        visit_type: 'Follow-up',
        status: 'SCHEDULED'
      });

      expect(result).toBeDefined();
      expect(result.patient_id).toBe(patient.id);
      expect(result.dietitian_id).toBe(dietitianAuth.user.id);
      expect(result.status).toBe('SCHEDULED');
    });

    it('should default status to SCHEDULED when not provided', async () => {
      const result = await visitService.createVisit(adminAuth.user, {
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: getFutureDate(7)
      });

      expect(result.status).toBe('SCHEDULED');
    });

    it('should default visit_type to Follow-up when not provided', async () => {
      const result = await visitService.createVisit(adminAuth.user, {
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: getFutureDate(7)
      });

      expect(result.visit_type).toBe('Follow-up');
    });

    it('should force dietitian_id to user id when user is DIETITIAN', async () => {
      const result = await visitService.createVisit(dietitianAuth.user, {
        patient_id: patient.id,
        dietitian_id: dietitian2Auth.user.id, // attempted override — should be ignored
        visit_date: getFutureDate(7)
      });

      // RBAC override: dietitian_id must be the calling user's id
      expect(result.dietitian_id).toBe(dietitianAuth.user.id);
    });

    it('should auto-create PatientDietitian link on visit creation', async () => {
      await visitService.createVisit(adminAuth.user, {
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: getFutureDate(7)
      });

      const link = await db.PatientDietitian.findOne({
        where: { patient_id: patient.id, dietitian_id: dietitianAuth.user.id }
      });
      expect(link).not.toBeNull();
    });

    it('should throw error when patient does not exist', async () => {
      const fakePatientId = '00000000-0000-0000-0000-000000000000';

      await expect(
        visitService.createVisit(adminAuth.user, {
          patient_id: fakePatientId,
          dietitian_id: dietitianAuth.user.id,
          visit_date: getFutureDate(7)
        })
      ).rejects.toThrow('Patient not found or inactive');
    });

    it('should throw error when patient is inactive', async () => {
      const inactivePatient = await createPatientInDb({ is_active: false });

      await expect(
        visitService.createVisit(adminAuth.user, {
          patient_id: inactivePatient.id,
          dietitian_id: dietitianAuth.user.id,
          visit_date: getFutureDate(7)
        })
      ).rejects.toThrow('Patient not found or inactive');
    });

    it('should include patient and dietitian associations in returned visit', async () => {
      const result = await visitService.createVisit(adminAuth.user, {
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: getFutureDate(7)
      });

      expect(result.patient).toBeDefined();
      expect(result.patient.id).toBe(patient.id);
      expect(result.dietitian).toBeDefined();
      expect(result.dietitian.id).toBe(dietitianAuth.user.id);
    });

    it('should create a COMPLETED visit', async () => {
      const result = await visitService.createVisit(adminAuth.user, {
        patient_id: patient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: getPastDate(1),
        status: 'COMPLETED'
      });

      expect(result.status).toBe('COMPLETED');
    });
  });

  // ================================================================
  // updateVisit
  // ================================================================
  describe('updateVisit', () => {
    let patient, ownVisit, otherVisit;

    beforeEach(async () => {
      patient = await createPatientInDb();
      await linkPatientToDietitian(patient.id, dietitianAuth.user.id);

      ownVisit = await createVisitInDb(patient.id, dietitianAuth.user.id);

      const patient2 = await createPatientInDb();
      await linkPatientToDietitian(patient2.id, dietitian2Auth.user.id);
      otherVisit = await createVisitInDb(patient2.id, dietitian2Auth.user.id);
    });

    it('should update allowed fields', async () => {
      const result = await visitService.updateVisit(
        dietitianAuth.user,
        ownVisit.id,
        { visit_type: 'Initial Consultation', duration_minutes: 90 }
      );

      expect(result.visit_type).toBe('Initial Consultation');
      expect(result.duration_minutes).toBe(90);
    });

    it('should update status', async () => {
      const result = await visitService.updateVisit(
        dietitianAuth.user,
        ownVisit.id,
        { status: 'COMPLETED' }
      );

      expect(result.status).toBe('COMPLETED');
    });

    it('should allow admin to update any visit', async () => {
      const result = await visitService.updateVisit(
        adminAuth.user,
        otherVisit.id,
        { visit_type: 'Nutrition Counseling' }
      );

      expect(result.visit_type).toBe('Nutrition Counseling');
    });

    it('should throw "Visit not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        visitService.updateVisit(adminAuth.user, fakeId, { status: 'COMPLETED' })
      ).rejects.toThrow('Visit not found');
    });

    it('should throw access denied when dietitian updates another dietitians visit', async () => {
      await expect(
        visitService.updateVisit(dietitianAuth.user, otherVisit.id, { status: 'CANCELLED' })
      ).rejects.toThrow(/access denied/i);
    });

    it('should return visit with associations after update', async () => {
      const result = await visitService.updateVisit(
        dietitianAuth.user,
        ownVisit.id,
        { duration_minutes: 45 }
      );

      expect(result.patient).toBeDefined();
      expect(result.dietitian).toBeDefined();
    });

    it('should update next_visit_date', async () => {
      const nextDate = getFutureDate(14);
      const result = await visitService.updateVisit(
        dietitianAuth.user,
        ownVisit.id,
        { next_visit_date: nextDate }
      );

      expect(result.next_visit_date).toBeDefined();
    });
  });

  // ================================================================
  // deleteVisit
  // ================================================================
  describe('deleteVisit', () => {
    let patient, ownVisit, otherVisit;

    beforeEach(async () => {
      patient = await createPatientInDb();
      await linkPatientToDietitian(patient.id, dietitianAuth.user.id);

      ownVisit = await createVisitInDb(patient.id, dietitianAuth.user.id);

      const patient2 = await createPatientInDb();
      await linkPatientToDietitian(patient2.id, dietitian2Auth.user.id);
      otherVisit = await createVisitInDb(patient2.id, dietitian2Auth.user.id);
    });

    it('should delete own visit as dietitian', async () => {
      await visitService.deleteVisit(dietitianAuth.user, ownVisit.id);

      const found = await db.Visit.findByPk(ownVisit.id);
      expect(found).toBeNull();
    });

    it('should allow admin to delete any visit', async () => {
      await visitService.deleteVisit(adminAuth.user, otherVisit.id);

      const found = await db.Visit.findByPk(otherVisit.id);
      expect(found).toBeNull();
    });

    it('should throw "Visit not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        visitService.deleteVisit(adminAuth.user, fakeId)
      ).rejects.toThrow('Visit not found');
    });

    it('should throw access denied when dietitian deletes another dietitians visit', async () => {
      await expect(
        visitService.deleteVisit(dietitianAuth.user, otherVisit.id)
      ).rejects.toThrow(/access denied/i);
    });

    it('should permanently hard-delete the visit record', async () => {
      const countBefore = await db.Visit.count();

      await visitService.deleteVisit(adminAuth.user, ownVisit.id);

      const countAfter = await db.Visit.count();
      expect(countAfter).toBe(countBefore - 1);
    });
  });
});
