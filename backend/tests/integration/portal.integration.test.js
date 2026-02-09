/**
 * Integration Tests for Portal Routes (/api/portal/*)
 * Tests: set-password (public), me, password, measures, visits, documents, recipes, theme
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

describe('Portal Routes', () => {
  let adminAuth, dietitianAuth, patientAuth;

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
    patientAuth = await testAuth.createPatientUser();
  });

  // ==========================================
  // POST /api/portal/set-password (public)
  // ==========================================
  describe('POST /api/portal/set-password', () => {
    let tokenPatient;

    beforeEach(async () => {
      // Create a patient with a pending invitation
      tokenPatient = await db.Patient.create({
        first_name: 'Invitation',
        last_name: 'Patient',
        email: `invite_${Date.now()}@test.com`,
        is_active: true
      });

      const patientRole = await db.Role.findOne({ where: { name: 'PATIENT' } });
      const passwordHash = await bcrypt.hash('temp-password', 10);
      const portalUser = await db.User.create({
        username: tokenPatient.email,
        email: tokenPatient.email,
        password_hash: passwordHash,
        role_id: patientRole.id,
        first_name: tokenPatient.first_name,
        last_name: tokenPatient.last_name,
        is_active: true
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);

      await tokenPatient.update({
        user_id: portalUser.id,
        portal_invitation_token: invitationToken,
        portal_invitation_expires_at: expiresAt
      });

      await tokenPatient.reload();
    });

    it('should set password with valid token', async () => {
      const res = await request(app)
        .post('/api/portal/set-password')
        .send({
          token: tokenPatient.portal_invitation_token,
          password: 'NewSecurePassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify password was set
      await tokenPatient.reload();
      const user = await db.User.findByPk(tokenPatient.user_id);
      const isValid = await bcrypt.compare('NewSecurePassword123!', user.password_hash);
      expect(isValid).toBe(true);

      // Verify token was cleared
      expect(tokenPatient.portal_invitation_token).toBeNull();
      expect(tokenPatient.portal_activated_at).toBeTruthy();
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/portal/set-password')
        .send({
          token: 'invalid-token-value',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      await tokenPatient.update({
        portal_invitation_expires_at: new Date(Date.now() - 1000)
      });

      const res = await request(app)
        .post('/api/portal/set-password')
        .send({
          token: tokenPatient.portal_invitation_token,
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expired/i);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/portal/set-password')
        .send({
          token: tokenPatient.portal_invitation_token,
          password: 'short'
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/portal/set-password')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // GET /api/portal/me
  // ==========================================
  describe('GET /api/portal/me', () => {
    it('should return patient profile for PATIENT user', async () => {
      const res = await request(app)
        .get('/api/portal/me')
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(patientAuth.patient.id);
      expect(res.body.data.first_name).toBe(patientAuth.patient.first_name);
    });

    it('should reject 401 without auth', async () => {
      const res = await request(app)
        .get('/api/portal/me');

      expect(res.status).toBe(401);
    });

    it('should reject 403 for ADMIN role', async () => {
      const res = await request(app)
        .get('/api/portal/me')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject 403 for DIETITIAN role', async () => {
      const res = await request(app)
        .get('/api/portal/me')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // PUT /api/portal/me
  // ==========================================
  describe('PUT /api/portal/me', () => {
    it('should update phone', async () => {
      const res = await request(app)
        .put('/api/portal/me')
        .set('Authorization', patientAuth.authHeader)
        .send({ phone: '+33612345678' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('+33612345678');
    });

    it('should update language_preference', async () => {
      const res = await request(app)
        .put('/api/portal/me')
        .set('Authorization', patientAuth.authHeader)
        .send({ language_preference: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.data.language_preference).toBe('en');
    });
  });

  // ==========================================
  // PUT /api/portal/password
  // ==========================================
  describe('PUT /api/portal/password', () => {
    it('should change password with valid current password', async () => {
      const res = await request(app)
        .put('/api/portal/password')
        .set('Authorization', patientAuth.authHeader)
        .send({
          currentPassword: patientAuth.password,
          newPassword: 'NewPassword456!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify new password works
      const user = await db.User.findByPk(patientAuth.user.id);
      const isValid = await bcrypt.compare('NewPassword456!', user.password_hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong current password', async () => {
      const res = await request(app)
        .put('/api/portal/password')
        .set('Authorization', patientAuth.authHeader)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword456!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/incorrect/i);
    });

    it('should reject short new password', async () => {
      const res = await request(app)
        .put('/api/portal/password')
        .set('Authorization', patientAuth.authHeader)
        .send({
          currentPassword: patientAuth.password,
          newPassword: 'short'
        });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // GET /api/portal/measures
  // ==========================================
  describe('GET /api/portal/measures', () => {
    let measureDef;

    beforeEach(async () => {
      // Create a measure definition
      measureDef = await db.MeasureDefinition.create({
        name: 'Weight',
        display_name: 'Weight',
        code: 'weight',
        unit: 'kg',
        category: 'anthropometric',
        data_type: 'number',
        is_active: true
      });
    });

    it('should return measures for the patient', async () => {
      // Create measures for this patient
      await db.PatientMeasure.create({
        patient_id: patientAuth.patient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 75.5,
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      const res = await request(app)
        .get('/api/portal/measures')
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.measures).toHaveLength(1);
      expect(res.body.data.measures[0].numeric_value).toBe(75.5);
    });

    it('should accept date range filter parameters', async () => {
      const now = new Date();

      await db.PatientMeasure.create({
        patient_id: patientAuth.patient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 75,
        measured_at: now,
        recorded_by: adminAuth.user.id
      });

      const res = await request(app)
        .get('/api/portal/measures')
        .query({
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        })
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.measures.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by measure_definition_id', async () => {
      const otherDef = await db.MeasureDefinition.create({
        name: 'Height',
        display_name: 'Height',
        code: 'height',
        unit: 'cm',
        category: 'anthropometric',
        data_type: 'number',
        is_active: true
      });

      await db.PatientMeasure.create({
        patient_id: patientAuth.patient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 75,
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      await db.PatientMeasure.create({
        patient_id: patientAuth.patient.id,
        measure_definition_id: otherDef.id,
        numeric_value: 180,
        measured_at: new Date(),
        recorded_by: adminAuth.user.id
      });

      const res = await request(app)
        .get('/api/portal/measures')
        .query({ measure_definition_id: measureDef.id })
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.measures).toHaveLength(1);
      expect(res.body.data.measures[0].numeric_value).toBe(75);
    });

    it('should return empty array if no measures', async () => {
      const res = await request(app)
        .get('/api/portal/measures')
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.measures).toHaveLength(0);
    });
  });

  // ==========================================
  // GET /api/portal/visits
  // ==========================================
  describe('GET /api/portal/visits', () => {
    it('should return visits for the patient', async () => {
      await db.Visit.create({
        patient_id: patientAuth.patient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: new Date(),
        visit_type: 'initial',
        status: 'COMPLETED',
        visit_summary: 'Initial consultation'
      });

      const res = await request(app)
        .get('/api/portal/visits')
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].visit_summary).toBe('Initial consultation');
    });

    it('should not return visits of another patient', async () => {
      // Create another patient's visit
      const otherPatient = await db.Patient.create({
        first_name: 'Other',
        last_name: 'Patient',
        email: 'other@test.com',
        is_active: true
      });

      await db.Visit.create({
        patient_id: otherPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: new Date(),
        visit_type: 'followup',
        status: 'COMPLETED',
        visit_summary: 'Other patient visit'
      });

      const res = await request(app)
        .get('/api/portal/visits')
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // ==========================================
  // GET /api/portal/documents
  // ==========================================
  describe('GET /api/portal/documents', () => {
    it('should return only shared documents', async () => {
      // Create a document
      const doc = await db.Document.create({
        file_name: 'diet-plan.pdf',
        file_path: 'documents/diet-plan.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        patient_id: patientAuth.patient.id,
        uploaded_by: dietitianAuth.user.id
      });

      // Share with patient
      await db.DocumentShare.create({
        document_id: doc.id,
        patient_id: patientAuth.patient.id,
        shared_by: dietitianAuth.user.id
      });

      // Create another doc that is NOT shared
      await db.Document.create({
        file_name: 'private-doc.pdf',
        file_path: 'documents/private.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: 512,
        patient_id: patientAuth.patient.id,
        uploaded_by: dietitianAuth.user.id
      });

      const res = await request(app)
        .get('/api/portal/documents')
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].document.file_name).toBe('diet-plan.pdf');
    });
  });

  // ==========================================
  // GET /api/portal/recipes
  // ==========================================
  describe('GET /api/portal/recipes', () => {
    it('should return shared recipes', async () => {
      const category = await db.RecipeCategory.create({
        name: 'Healthy',
        created_by: dietitianAuth.user.id
      });

      const recipe = await db.Recipe.create({
        title: 'Salade Verte',
        description: 'Fresh green salad',
        prep_time_minutes: 10,
        cook_time_minutes: 0,
        servings: 2,
        difficulty: 'easy',
        category_id: category.id,
        created_by: dietitianAuth.user.id
      });

      // Share with patient
      await db.RecipePatientAccess.create({
        recipe_id: recipe.id,
        patient_id: patientAuth.patient.id,
        shared_by: dietitianAuth.user.id
      });

      const res = await request(app)
        .get('/api/portal/recipes')
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].recipe.title).toBe('Salade Verte');
    });

    it('should return recipe detail with access', async () => {
      const recipe = await db.Recipe.create({
        title: 'Soupe',
        description: 'Warm soup',
        prep_time_minutes: 15,
        cook_time_minutes: 30,
        servings: 4,
        difficulty: 'medium',
        created_by: dietitianAuth.user.id
      });

      await db.RecipePatientAccess.create({
        recipe_id: recipe.id,
        patient_id: patientAuth.patient.id,
        shared_by: dietitianAuth.user.id,
        notes: 'Perfect for dinner'
      });

      const res = await request(app)
        .get(`/api/portal/recipes/${recipe.id}`)
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Soupe');
      expect(res.body.data.shared_notes).toBe('Perfect for dinner');
    });

    it('should return 404 for recipe without access', async () => {
      const recipe = await db.Recipe.create({
        title: 'Secret Recipe',
        description: 'Not shared',
        prep_time_minutes: 20,
        cook_time_minutes: 40,
        servings: 2,
        difficulty: 'hard',
        created_by: dietitianAuth.user.id
      });

      const res = await request(app)
        .get(`/api/portal/recipes/${recipe.id}`)
        .set('Authorization', patientAuth.authHeader);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // PUT /api/portal/theme
  // ==========================================
  describe('PUT /api/portal/theme', () => {
    it('should update theme', async () => {
      const theme = await db.Theme.create({
        name: 'Nature',
        colors: { primary: '#2d5016', secondary: '#4a7c25' },
        created_by: adminAuth.user.id
      });

      const res = await request(app)
        .put('/api/portal/theme')
        .set('Authorization', patientAuth.authHeader)
        .send({ theme_id: theme.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.theme_id).toBe(theme.id);
    });

    it('should reject non-existent theme', async () => {
      const res = await request(app)
        .put('/api/portal/theme')
        .set('Authorization', patientAuth.authHeader)
        .send({ theme_id: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(400);
    });
  });
});
