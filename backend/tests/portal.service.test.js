/**
 * Unit Tests for Portal Service
 * Tests: activatePortal, deactivatePortal, reactivatePortal,
 *        setPasswordFromInvitation, resendInvitation, getPortalStatus
 */

const bcrypt = require('bcryptjs');
const testDb = require('./setup/testDb');
const testAuth = require('./setup/testAuth');

// Mock email service to prevent sending real emails
jest.mock('../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
  sendInvoiceEmail: jest.fn(),
  sendDocumentShareEmail: jest.fn(),
  sendRecipeShareEmail: jest.fn(),
  sendDocumentAsAttachment: jest.fn(),
  sendPaymentReminderEmail: jest.fn(),
  verifyEmailConfig: jest.fn(),
  sendEmailFromTemplate: jest.fn()
}));

let portalService;
let db;

describe('Portal Service', () => {
  beforeAll(async () => {
    await testDb.init();
    db = testDb.getDb();
    portalService = require('../src/services/portal.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();
    jest.clearAllMocks();
  });

  // Helper: create a patient without portal
  async function createPatientRecord(overrides = {}) {
    return db.Patient.create({
      first_name: overrides.first_name || 'Jean',
      last_name: overrides.last_name || 'Dupont',
      email: overrides.email || `patient_${Date.now()}@test.com`,
      phone: overrides.phone || null,
      is_active: true,
      ...overrides
    });
  }

  // ==========================================
  // activatePortal
  // ==========================================
  describe('activatePortal', () => {
    it('should create User with PATIENT role and set invitation token', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'portal-test@test.com' });

      const status = await portalService.activatePortal(patient.id, admin.user.id);

      expect(status.status).toBe('invitation_pending');
      expect(status.portal_user).toBeTruthy();
      expect(status.portal_user.email).toBe('portal-test@test.com');
      expect(status.invitation_pending).toBe(true);

      // Verify User was created with PATIENT role
      const createdUser = await db.User.findByPk(status.portal_user.id, {
        include: [{ model: db.Role, as: 'role' }]
      });
      expect(createdUser.role.name).toBe('PATIENT');
      expect(createdUser.is_active).toBe(true);

      // Verify patient was linked
      await patient.reload();
      expect(patient.user_id).toBe(createdUser.id);
      expect(patient.portal_invitation_token).toBeTruthy();
      expect(patient.portal_invitation_expires_at).toBeTruthy();
    });

    it('should send invitation email', async () => {
      const { sendEmail } = require('../src/services/email.service');
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'email-test@test.com' });

      await portalService.activatePortal(patient.id, admin.user.id);

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'email-test@test.com',
        subject: expect.stringContaining('NutriVault')
      }));
    });

    it('should throw if patient has no email', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: null });

      await expect(portalService.activatePortal(patient.id, admin.user.id))
        .rejects.toThrow('must have an email');
    });

    it('should throw if portal is already active', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'already-active@test.com' });

      // Activate once
      await portalService.activatePortal(patient.id, admin.user.id);

      // Try to activate again
      await expect(portalService.activatePortal(patient.id, admin.user.id))
        .rejects.toThrow('already active');
    });

    it('should allow activation when a dietitian already has the same email', async () => {
      const admin = await testAuth.createAdmin();
      // admin user has an email — create patient with same email: this should work
      const patient = await createPatientRecord({ email: admin.user.email });

      const result = await portalService.activatePortal(patient.id, admin.user.id);
      expect(result.status).toBe('invitation_pending');
    });

    it('should create patient User with same email as dietitian User', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: admin.user.email });

      const result = await portalService.activatePortal(patient.id, admin.user.id);
      expect(result.status).toBe('invitation_pending');

      // Verify both Users now exist with the same email
      const users = await db.User.findAll({
        where: { email: admin.user.email.trim().toLowerCase() }
      });
      expect(users.length).toBe(2);
    });

    it('should throw if patient not found', async () => {
      const admin = await testAuth.createAdmin();
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(portalService.activatePortal(fakeId, admin.user.id))
        .rejects.toThrow('Patient not found');
    });
  });

  // ==========================================
  // deactivatePortal
  // ==========================================
  describe('deactivatePortal', () => {
    it('should set user.is_active to false', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'deactivate@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      const status = await portalService.deactivatePortal(patient.id);

      expect(status.status).toBe('deactivated');
      expect(status.portal_user.is_active).toBe(false);
    });

    it('should throw if portal is not active', async () => {
      const patient = await createPatientRecord({ email: 'not-active@test.com' });

      await expect(portalService.deactivatePortal(patient.id))
        .rejects.toThrow('not active');
    });
  });

  // ==========================================
  // reactivatePortal
  // ==========================================
  describe('reactivatePortal', () => {
    it('should set user.is_active back to true', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'reactivate@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);
      await portalService.deactivatePortal(patient.id);

      const status = await portalService.reactivatePortal(patient.id);

      expect(status.status).toBe('invitation_pending');
      expect(status.portal_user.is_active).toBe(true);
    });

    it('should throw if portal was never activated', async () => {
      const patient = await createPatientRecord({ email: 'never@test.com' });

      await expect(portalService.reactivatePortal(patient.id))
        .rejects.toThrow('never activated');
    });

    it('should throw if portal is already active', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'still-active@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      await expect(portalService.reactivatePortal(patient.id))
        .rejects.toThrow('already active');
    });
  });

  // ==========================================
  // setPasswordFromInvitation
  // ==========================================
  describe('setPasswordFromInvitation', () => {
    it('should hash password, clear token and set portal_activated_at', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'setpw@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      await patient.reload();
      const token = patient.portal_invitation_token;

      const result = await portalService.setPasswordFromInvitation(token, 'NewPassword123!');

      expect(result.success).toBe(true);

      // Verify token was cleared
      await patient.reload();
      expect(patient.portal_invitation_token).toBeNull();
      expect(patient.portal_invitation_expires_at).toBeNull();
      expect(patient.portal_activated_at).toBeTruthy();

      // Verify password was hashed
      const user = await db.User.findByPk(patient.user_id);
      const isValid = await bcrypt.compare('NewPassword123!', user.password_hash);
      expect(isValid).toBe(true);
    });

    it('should throw for invalid token', async () => {
      await expect(portalService.setPasswordFromInvitation('invalid-token', 'Password123!'))
        .rejects.toThrow('Invalid or expired');
    });

    it('should throw for expired token', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'expired@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      await patient.reload();
      const token = patient.portal_invitation_token;

      // Manually set expiry to the past
      await patient.update({
        portal_invitation_expires_at: new Date(Date.now() - 1000)
      });

      await expect(portalService.setPasswordFromInvitation(token, 'Password123!'))
        .rejects.toThrow('expired');
    });

    it('should throw for password too short', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'shortpw@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      await patient.reload();
      const token = patient.portal_invitation_token;

      await expect(portalService.setPasswordFromInvitation(token, 'short'))
        .rejects.toThrow('at least 8');
    });

    it('should throw if token or password missing', async () => {
      await expect(portalService.setPasswordFromInvitation(null, 'Password123!'))
        .rejects.toThrow('required');
      await expect(portalService.setPasswordFromInvitation('token', null))
        .rejects.toThrow('required');
    });
  });

  // ==========================================
  // resendInvitation
  // ==========================================
  describe('resendInvitation', () => {
    it('should generate a new token and send email', async () => {
      const { sendEmail } = require('../src/services/email.service');
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'resend@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      await patient.reload();
      const oldToken = patient.portal_invitation_token;

      sendEmail.mockClear();
      await portalService.resendInvitation(patient.id);

      await patient.reload();
      expect(patient.portal_invitation_token).toBeTruthy();
      expect(patient.portal_invitation_token).not.toBe(oldToken);
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw if portal not active', async () => {
      const patient = await createPatientRecord({ email: 'noportal@test.com' });

      await expect(portalService.resendInvitation(patient.id))
        .rejects.toThrow('not active');
    });
  });

  // ==========================================
  // getPortalStatus
  // ==========================================
  describe('getPortalStatus', () => {
    it('should return not_activated for new patient', async () => {
      const patient = await createPatientRecord({ email: 'new@test.com' });

      const status = await portalService.getPortalStatus(patient.id);

      expect(status.status).toBe('not_activated');
      expect(status.portal_user).toBeNull();
      expect(status.invitation_pending).toBe(false);
      expect(status.activated_at).toBeNull();
    });

    it('should return invitation_pending after activation', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'pending@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      const status = await portalService.getPortalStatus(patient.id);

      expect(status.status).toBe('invitation_pending');
      expect(status.portal_user).toBeTruthy();
      expect(status.invitation_pending).toBe(true);
    });

    it('should return active after password is set', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'active@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);

      await patient.reload();
      await portalService.setPasswordFromInvitation(patient.portal_invitation_token, 'Password123!');

      const status = await portalService.getPortalStatus(patient.id);

      expect(status.status).toBe('active');
      expect(status.activated_at).toBeTruthy();
    });

    it('should return deactivated after deactivation', async () => {
      const admin = await testAuth.createAdmin();
      const patient = await createPatientRecord({ email: 'deact@test.com' });
      await portalService.activatePortal(patient.id, admin.user.id);
      await portalService.deactivatePortal(patient.id);

      const status = await portalService.getPortalStatus(patient.id);

      expect(status.status).toBe('deactivated');
      expect(status.portal_user.is_active).toBe(false);
    });

    it('should throw if patient not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(portalService.getPortalStatus(fakeId))
        .rejects.toThrow('Patient not found');
    });
  });
});
