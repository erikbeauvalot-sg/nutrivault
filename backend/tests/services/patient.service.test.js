/**
 * Patient Service Tests
 * Tests for patient.service.js business logic
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let db;
let patientService;

describe('Patient Service', () => {
  let adminAuth, dietitianAuth, dietitian2Auth;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    patientService = require('../../src/services/patient.service');
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
  let emailCounter = 0;

  function uniqueEmail(prefix = 'patient') {
    emailCounter++;
    return `${prefix}_${emailCounter}_${Date.now()}@test.com`;
  }

  async function createPatientInDb(overrides = {}) {
    return db.Patient.create({
      first_name: overrides.first_name || 'Test',
      last_name: overrides.last_name || 'Patient',
      email: overrides.email !== undefined ? overrides.email : uniqueEmail(),
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      ...overrides
    });
  }

  async function linkPatientToDietitian(patientId, dietitianId) {
    return db.PatientDietitian.create({ patient_id: patientId, dietitian_id: dietitianId });
  }

  // ================================================================
  // getPatients
  // ================================================================
  describe('getPatients', () => {
    let patientA, patientB, patientC;

    beforeEach(async () => {
      patientA = await createPatientInDb({ first_name: 'Alice', last_name: 'Alpha' });
      patientB = await createPatientInDb({ first_name: 'Bob', last_name: 'Beta' });
      patientC = await createPatientInDb({ first_name: 'Charlie', last_name: 'Gamma' });

      // patientA and patientB linked to dietitian1; patientC linked to dietitian2
      await linkPatientToDietitian(patientA.id, dietitianAuth.user.id);
      await linkPatientToDietitian(patientB.id, dietitianAuth.user.id);
      await linkPatientToDietitian(patientC.id, dietitian2Auth.user.id);
    });

    it('should return all active patients for admin', async () => {
      const result = await patientService.getPatients(adminAuth.user);

      expect(result.total).toBe(3);
      const ids = result.patients.map(p => p.id);
      expect(ids).toContain(patientA.id);
      expect(ids).toContain(patientB.id);
      expect(ids).toContain(patientC.id);
    });

    it('should return all active patients for dietitian (no list RBAC filter)', async () => {
      // getPatients does NOT scope the list — all active patients are visible to all roles.
      // The is_linked flag distinguishes ownership.
      const result = await patientService.getPatients(dietitianAuth.user);

      expect(result.total).toBe(3);
    });

    it('should set is_linked=true for linked patients (dietitian)', async () => {
      const result = await patientService.getPatients(dietitianAuth.user);

      const alice = result.patients.find(p => p.id === patientA.id);
      const charlie = result.patients.find(p => p.id === patientC.id);

      expect(alice.dataValues.is_linked).toBe(true);
      expect(charlie.dataValues.is_linked).toBe(false);
    });

    it('should set is_linked=true for ALL patients for admin', async () => {
      const result = await patientService.getPatients(adminAuth.user);

      result.patients.forEach(p => {
        expect(p.dataValues.is_linked).toBe(true);
      });
    });

    it('should filter by search (name match)', async () => {
      const result = await patientService.getPatients(adminAuth.user, { search: 'Alice' });

      expect(result.total).toBe(1);
      expect(result.patients[0].first_name).toBe('Alice');
    });

    it('should filter by search (email match)', async () => {
      const specificEmail = 'uniquetest123@test.com';
      await createPatientInDb({ first_name: 'Unique', last_name: 'User', email: specificEmail });

      const result = await patientService.getPatients(adminAuth.user, { search: 'uniquetest123' });

      expect(result.total).toBe(1);
      expect(result.patients[0].email).toBe(specificEmail);
    });

    it('should exclude inactive patients by default', async () => {
      await createPatientInDb({ first_name: 'Inactive', last_name: 'Patient', is_active: false });

      const result = await patientService.getPatients(adminAuth.user);

      const names = result.patients.map(p => p.first_name);
      expect(names).not.toContain('Inactive');
    });

    it('should filter patients linked to a specific dietitian using assigned_dietitian_id filter', async () => {
      const result = await patientService.getPatients(adminAuth.user, {
        assigned_dietitian_id: dietitianAuth.user.id
      });

      expect(result.total).toBe(2);
      const ids = result.patients.map(p => p.id);
      expect(ids).toContain(patientA.id);
      expect(ids).toContain(patientB.id);
      expect(ids).not.toContain(patientC.id);
    });

    it('should paginate results', async () => {
      const result = await patientService.getPatients(adminAuth.user, { page: 1, limit: 2 });

      expect(result.patients.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('should return pagination metadata', async () => {
      const result = await patientService.getPatients(adminAuth.user);

      expect(result).toHaveProperty('patients');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
    });

    it('should return empty result when no patients match', async () => {
      const result = await patientService.getPatients(adminAuth.user, {
        search: 'NORESULT_XYZ_NOTEXIST'
      });

      expect(result.total).toBe(0);
      expect(result.patients).toHaveLength(0);
    });
  });

  // ================================================================
  // getPatientById
  // ================================================================
  describe('getPatientById', () => {
    let linkedPatient, unlinkedPatient;

    beforeEach(async () => {
      linkedPatient = await createPatientInDb({ first_name: 'Linked', last_name: 'Person' });
      unlinkedPatient = await createPatientInDb({ first_name: 'Unlinked', last_name: 'Person' });

      await linkPatientToDietitian(linkedPatient.id, dietitianAuth.user.id);
      // unlinkedPatient linked only to dietitian2
      await linkPatientToDietitian(unlinkedPatient.id, dietitian2Auth.user.id);
    });

    it('should return patient for owning dietitian', async () => {
      const result = await patientService.getPatientById(linkedPatient.id, dietitianAuth.user);

      expect(result).toBeDefined();
      expect(result.id).toBe(linkedPatient.id);
    });

    it('should allow admin to access any patient', async () => {
      const result = await patientService.getPatientById(unlinkedPatient.id, adminAuth.user);

      expect(result.id).toBe(unlinkedPatient.id);
    });

    it('should throw "Patient not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        patientService.getPatientById(fakeId, adminAuth.user)
      ).rejects.toThrow('Patient not found');
    });

    it('should throw access denied when dietitian accesses unlinked patient', async () => {
      await expect(
        patientService.getPatientById(unlinkedPatient.id, dietitianAuth.user)
      ).rejects.toThrow(/access denied/i);
    });

    it('should include assigned_dietitian association', async () => {
      // Assign a dietitian as primary for this patient
      await linkedPatient.update({ assigned_dietitian_id: dietitianAuth.user.id });

      const result = await patientService.getPatientById(linkedPatient.id, dietitianAuth.user);

      expect(result.assigned_dietitian).toBeDefined();
    });
  });

  // ================================================================
  // createPatient
  // ================================================================
  describe('createPatient', () => {
    it('should create a patient with required fields', async () => {
      const result = await patientService.createPatient(
        { first_name: 'New', last_name: 'Patient', email: uniqueEmail() },
        adminAuth.user
      );

      expect(result).toBeDefined();
      expect(result.first_name).toBe('New');
      expect(result.last_name).toBe('Patient');
      expect(result.is_active).toBe(true);
    });

    it('should create patient without email (email is optional)', async () => {
      const result = await patientService.createPatient(
        { first_name: 'No', last_name: 'Email' },
        adminAuth.user
      );

      // Email is not provided, so it is null or undefined
      expect(result.email == null).toBe(true);
    });

    it('should auto-link patient to dietitian when created by DIETITIAN', async () => {
      const email = uniqueEmail();
      const result = await patientService.createPatient(
        { first_name: 'Linked', last_name: 'Patient', email },
        dietitianAuth.user
      );

      const link = await db.PatientDietitian.findOne({
        where: { patient_id: result.id, dietitian_id: dietitianAuth.user.id }
      });
      expect(link).not.toBeNull();
    });

    it('should NOT auto-link patient to admin when created by ADMIN', async () => {
      const result = await patientService.createPatient(
        { first_name: 'Admin', last_name: 'Created', email: uniqueEmail() },
        adminAuth.user
      );

      const link = await db.PatientDietitian.findOne({
        where: { patient_id: result.id, dietitian_id: adminAuth.user.id }
      });
      expect(link).toBeNull();
    });

    it('should also create M2M link for assigned_dietitian_id when provided', async () => {
      const result = await patientService.createPatient(
        {
          first_name: 'Assigned',
          last_name: 'Patient',
          email: uniqueEmail(),
          assigned_dietitian_id: dietitianAuth.user.id
        },
        adminAuth.user
      );

      const link = await db.PatientDietitian.findOne({
        where: { patient_id: result.id, dietitian_id: dietitianAuth.user.id }
      });
      expect(link).not.toBeNull();
    });

    it('should throw an error on duplicate email', async () => {
      const email = uniqueEmail();
      await patientService.createPatient(
        { first_name: 'First', last_name: 'Patient', email },
        adminAuth.user
      );

      // SQLite may surface either the service's custom message or a raw Sequelize error
      // depending on how the unique index is triggered. Both indicate a duplicate.
      await expect(
        patientService.createPatient(
          { first_name: 'Duplicate', last_name: 'Patient', email },
          adminAuth.user
        )
      ).rejects.toThrow();
    });

    it('should normalize email to lowercase', async () => {
      const result = await patientService.createPatient(
        { first_name: 'Case', last_name: 'Test', email: 'UPPERCASE@TEST.COM' },
        adminAuth.user
      );

      expect(result.email).toBe('uppercase@test.com');
    });
  });

  // ================================================================
  // updatePatient
  // ================================================================
  describe('updatePatient', () => {
    let linkedPatient, unlinkedPatient;

    beforeEach(async () => {
      linkedPatient = await createPatientInDb({ first_name: 'Original', last_name: 'Name' });
      unlinkedPatient = await createPatientInDb({ first_name: 'Other', last_name: 'Patient' });

      await linkPatientToDietitian(linkedPatient.id, dietitianAuth.user.id);
      await linkPatientToDietitian(unlinkedPatient.id, dietitian2Auth.user.id);
    });

    it('should update patient fields as dietitian', async () => {
      const result = await patientService.updatePatient(
        linkedPatient.id,
        { first_name: 'Updated', last_name: 'Name' },
        dietitianAuth.user
      );

      expect(result.first_name).toBe('Updated');
      expect(result.last_name).toBe('Name');
    });

    it('should allow admin to update any patient', async () => {
      const result = await patientService.updatePatient(
        unlinkedPatient.id,
        { phone: '0600000000' },
        adminAuth.user
      );

      expect(result.phone).toBe('0600000000');
    });

    it('should throw "Patient not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        patientService.updatePatient(fakeId, { first_name: 'X' }, adminAuth.user)
      ).rejects.toThrow('Patient not found');
    });

    it('should throw access denied when dietitian updates unlinked patient', async () => {
      await expect(
        patientService.updatePatient(
          unlinkedPatient.id,
          { first_name: 'Hacked' },
          dietitianAuth.user
        )
      ).rejects.toThrow(/access denied/i);
    });

    it('should update email and normalize to lowercase', async () => {
      const result = await patientService.updatePatient(
        linkedPatient.id,
        { email: 'NEW@EMAIL.COM' },
        dietitianAuth.user
      );

      expect(result.email).toBe('new@email.com');
    });

    it('should throw on duplicate email update', async () => {
      const takenEmail = uniqueEmail('taken');
      await createPatientInDb({ email: takenEmail });

      // SQLite may surface either the service's custom message or a raw Sequelize error
      // depending on how the unique index is triggered. Both indicate a duplicate.
      await expect(
        patientService.updatePatient(
          linkedPatient.id,
          { email: takenEmail },
          dietitianAuth.user
        )
      ).rejects.toThrow();
    });
  });

  // ================================================================
  // deletePatient (soft delete)
  // ================================================================
  describe('deletePatient', () => {
    let linkedPatient, unlinkedPatient;

    beforeEach(async () => {
      linkedPatient = await createPatientInDb();
      unlinkedPatient = await createPatientInDb();

      await linkPatientToDietitian(linkedPatient.id, dietitianAuth.user.id);
      await linkPatientToDietitian(unlinkedPatient.id, dietitian2Auth.user.id);
    });

    it('should soft-delete (is_active=false) own patient as dietitian', async () => {
      const result = await patientService.deletePatient(linkedPatient.id, dietitianAuth.user);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/deleted/i);

      // Patient still exists in DB but is inactive
      const found = await db.Patient.findByPk(linkedPatient.id);
      expect(found).not.toBeNull();
      expect(found.is_active).toBe(false);
    });

    it('should allow admin to delete any patient', async () => {
      const result = await patientService.deletePatient(unlinkedPatient.id, adminAuth.user);

      expect(result.success).toBe(true);

      const found = await db.Patient.findByPk(unlinkedPatient.id);
      expect(found.is_active).toBe(false);
    });

    it('should throw "Patient not found" for invalid id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(
        patientService.deletePatient(fakeId, adminAuth.user)
      ).rejects.toThrow('Patient not found');
    });

    it('should throw access denied when dietitian deletes unlinked patient', async () => {
      await expect(
        patientService.deletePatient(unlinkedPatient.id, dietitianAuth.user)
      ).rejects.toThrow(/access denied/i);
    });

    it('should succeed without error when patient is already inactive', async () => {
      await linkedPatient.update({ is_active: false });

      const result = await patientService.deletePatient(linkedPatient.id, adminAuth.user);

      expect(result.success).toBe(true);
    });

    it('should NOT hard-delete the patient record', async () => {
      await patientService.deletePatient(linkedPatient.id, dietitianAuth.user);

      const found = await db.Patient.findByPk(linkedPatient.id);
      expect(found).not.toBeNull();
    });
  });

  // ================================================================
  // checkEmailAvailability
  // ================================================================
  describe('checkEmailAvailability', () => {
    beforeEach(async () => {
      await createPatientInDb({ email: 'taken@example.com' });
    });

    it('should return true when email is not taken', async () => {
      const result = await patientService.checkEmailAvailability('free@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email is already used by active patient', async () => {
      const result = await patientService.checkEmailAvailability('taken@example.com');

      expect(result).toBe(false);
    });

    it('should return true when empty email is provided', async () => {
      const result = await patientService.checkEmailAvailability('');

      expect(result).toBe(true);
    });

    it('should return true for null email', async () => {
      const result = await patientService.checkEmailAvailability(null);

      expect(result).toBe(true);
    });

    it('should return true when email belongs to the excluded patient id', async () => {
      const patient = await db.Patient.findOne({ where: { email: 'taken@example.com' } });

      const result = await patientService.checkEmailAvailability('taken@example.com', patient.id);

      expect(result).toBe(true);
    });

    it('should be case-insensitive (email is normalized to lowercase)', async () => {
      // Patient model normalizes email on set; the service normalizes too.
      // 'TAKEN@example.com' should match 'taken@example.com' stored in DB.
      const result = await patientService.checkEmailAvailability('TAKEN@EXAMPLE.COM');

      expect(result).toBe(false);
    });
  });
});
