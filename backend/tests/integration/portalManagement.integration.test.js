/**
 * Integration Tests for Portal Management Routes (/api/patients/:id/portal/*)
 * Tests: status, activate, deactivate, reactivate, resend, security
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

// Mock email service
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
  sendInvoiceEmail: jest.fn(),
  sendDocumentShareEmail: jest.fn(),
  sendRecipeShareEmail: jest.fn(),
  sendDocumentAsAttachment: jest.fn(),
  sendPaymentReminderEmail: jest.fn(),
  verifyEmailConfig: jest.fn(),
  sendEmailFromTemplate: jest.fn()
}));

let app;
let db;

describe('Portal Management Routes', () => {
  let adminAuth, dietitianAuth, patientAuth;
  let targetPatient;

  beforeAll(async () => {
    await testDb.init();
    db = testDb.getDb();
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

    // Create a target patient (no portal yet)
    targetPatient = await db.Patient.create({
      first_name: 'Target',
      last_name: 'Patient',
      email: `target_${Date.now()}@test.com`,
      is_active: true
    });

    // Link dietitian to patient via M2M
    await db.PatientDietitian.create({
      patient_id: targetPatient.id,
      dietitian_id: dietitianAuth.user.id
    });
  });

  // ==========================================
  // GET /api/patients/:id/portal/status
  // ==========================================
  describe('GET /api/patients/:id/portal/status', () => {
    it('should return not_activated for new patient (admin)', async () => {
      const res = await request(app)
        .get(`/api/patients/${targetPatient.id}/portal/status`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('not_activated');
      expect(res.body.data.portal_user).toBeNull();
    });

    it('should return portal status (dietitian)', async () => {
      const res = await request(app)
        .get(`/api/patients/${targetPatient.id}/portal/status`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('not_activated');
    });

    it('should return invitation_pending after activation', async () => {
      // Activate first
      await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);

      const res = await request(app)
        .get(`/api/patients/${targetPatient.id}/portal/status`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('invitation_pending');
      expect(res.body.data.portal_user).toBeTruthy();
      expect(res.body.data.invitation_pending).toBe(true);
    });
  });

  // ==========================================
  // POST /api/patients/:id/portal/activate
  // ==========================================
  describe('POST /api/patients/:id/portal/activate', () => {
    it('should activate portal (admin)', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('invitation_pending');
      expect(res.body.message).toMatch(/activated/i);

      // Verify User was created with PATIENT role
      await targetPatient.reload();
      expect(targetPatient.user_id).toBeTruthy();
      const createdUser = await db.User.findByPk(targetPatient.user_id, {
        include: [{ model: db.Role, as: 'role' }]
      });
      expect(createdUser.role.name).toBe('PATIENT');
    });

    it('should activate portal (dietitian)', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail if patient has no email', async () => {
      const noEmailPatient = await db.Patient.create({
        first_name: 'NoEmail',
        last_name: 'Patient',
        is_active: true
      });

      const res = await request(app)
        .post(`/api/patients/${noEmailPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it('should fail if portal already active', async () => {
      // Activate once
      await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);

      // Try again
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already/i);
    });

    it('should verify User is created with PATIENT role', async () => {
      await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);

      await targetPatient.reload();
      const user = await db.User.findByPk(targetPatient.user_id, {
        include: [{ model: db.Role, as: 'role' }]
      });

      expect(user).toBeTruthy();
      expect(user.role.name).toBe('PATIENT');
      expect(user.email).toBe(targetPatient.email);
      expect(user.is_active).toBe(true);
    });
  });

  // ==========================================
  // POST /api/patients/:id/portal/deactivate
  // ==========================================
  describe('POST /api/patients/:id/portal/deactivate', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);
    });

    it('should deactivate portal (admin)', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/deactivate`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('deactivated');
    });

    it('should deactivate portal (dietitian)', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/deactivate`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('deactivated');
    });
  });

  // ==========================================
  // POST /api/patients/:id/portal/reactivate
  // ==========================================
  describe('POST /api/patients/:id/portal/reactivate', () => {
    beforeEach(async () => {
      // Activate then deactivate
      await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);
      await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/deactivate`)
        .set('Authorization', adminAuth.authHeader);
    });

    it('should reactivate portal (admin)', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/reactivate`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // After reactivation from deactivated state (no portal_activated_at yet), status is invitation_pending
      expect(res.body.data.portal_user.is_active).toBe(true);
    });

    it('should reactivate portal (dietitian)', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/reactivate`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.portal_user.is_active).toBe(true);
    });
  });

  // ==========================================
  // POST /api/patients/:id/portal/resend
  // ==========================================
  describe('POST /api/patients/:id/portal/resend', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', adminAuth.authHeader);
    });

    it('should resend invitation (admin)', async () => {
      const { sendEmail } = require('../../src/services/email.service');
      sendEmail.mockClear();

      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/resend`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should resend invitation (dietitian)', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/resend`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // Security Tests
  // ==========================================
  describe('Security', () => {
    it('should reject PATIENT role from managing portal', async () => {
      const patientAuth = await testAuth.createPatientUser();

      const res = await request(app)
        .get(`/api/patients/${targetPatient.id}/portal/status`)
        .set('Authorization', patientAuth.authHeader);

      // PATIENT does not have patients.read permission
      expect(res.status).toBe(403);
    });

    it('should reject PATIENT from activating portal', async () => {
      const patientAuth = await testAuth.createPatientUser();

      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`)
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject 401 without auth for status', async () => {
      const res = await request(app)
        .get(`/api/patients/${targetPatient.id}/portal/status`);

      expect(res.status).toBe(401);
    });

    it('should reject 401 without auth for activate', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/activate`);

      expect(res.status).toBe(401);
    });

    it('should reject 401 without auth for deactivate', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/deactivate`);

      expect(res.status).toBe(401);
    });

    it('should reject 401 without auth for resend', async () => {
      const res = await request(app)
        .post(`/api/patients/${targetPatient.id}/portal/resend`);

      expect(res.status).toBe(401);
    });
  });
});
