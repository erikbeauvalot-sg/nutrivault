/**
 * Appointment Reminders Integration Tests
 * Tests for /api/appointment-reminders endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { visits: visitFixtures, patients: patientFixtures } = require('../fixtures');

// Mock the email service to prevent actual email sending
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({
    messageId: 'test-message-id',
    success: true
  })
}));

let app;

describe('Appointment Reminders API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let testPatient;
  let testVisit;

  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    // Create test users
    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();

    // Create test patient with email and reminders enabled
    const db = testDb.getDb();
    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      email: 'patient@test.com',
      appointment_reminders_enabled: true,
      assigned_dietitian_id: dietitianAuth.user.id
    });

    // Create a future scheduled visit
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    testVisit = await db.Visit.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id,
      visit_date: futureDate,
      visit_type: 'follow_up',
      status: 'SCHEDULED',
      duration_minutes: 60
    });

    // Create an appointment reminder email template
    await db.EmailTemplate.create({
      slug: 'appointment-reminder',
      name: 'Appointment Reminder',
      category: 'appointment_reminder',
      subject: 'Rappel de rendez-vous - {{patient.first_name}}',
      body_html: '<p>Bonjour {{patient.first_name}}, rappel pour votre rendez-vous.</p>',
      body_text: 'Bonjour {{patient.first_name}}, rappel pour votre rendez-vous.',
      is_active: true
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // POST /api/appointment-reminders/send/:visitId
  // ========================================
  describe('POST /api/appointment-reminders/send/:visitId', () => {
    it('should send reminder for valid scheduled visit', async () => {
      const res = await request(app)
        .post(`/api/appointment-reminders/send/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reminder sent');
    });

    it('should allow admin to send reminders', async () => {
      const res = await request(app)
        .post(`/api/appointment-reminders/send/${testVisit.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post(`/api/appointment-reminders/send/${testVisit.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 400 for non-existent visit', async () => {
      const res = await request(app)
        .post('/api/appointment-reminders/send/non-existent-id')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for past visit', async () => {
      const db = testDb.getDb();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const pastVisit = await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: pastDate,
        visit_type: 'follow_up',
        status: 'SCHEDULED',
        duration_minutes: 60
      });

      const res = await request(app)
        .post(`/api/appointment-reminders/send/${pastVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('past');
    });

    it('should return 400 for completed visit', async () => {
      const db = testDb.getDb();
      await testVisit.update({ status: 'COMPLETED' });

      const res = await request(app)
        .post(`/api/appointment-reminders/send/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not scheduled');
    });

    it('should return 400 for patient without email', async () => {
      const db = testDb.getDb();
      await testPatient.update({ email: null });

      const res = await request(app)
        .post(`/api/appointment-reminders/send/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });

    it('should return 400 for patient who opted out of reminders', async () => {
      const db = testDb.getDb();
      await testPatient.update({ appointment_reminders_enabled: false });

      const res = await request(app)
        .post(`/api/appointment-reminders/send/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('opted out');
    });
  });

  // ========================================
  // POST /api/appointment-reminders/invite/:visitId
  // ========================================
  describe('POST /api/appointment-reminders/invite/:visitId', () => {
    it('should send calendar invitation for valid scheduled visit', async () => {
      const res = await request(app)
        .post(`/api/appointment-reminders/invite/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('invitation sent');
      expect(res.body.data.type).toBe('invitation');
    });

    it('should allow admin to send invitations', async () => {
      const res = await request(app)
        .post(`/api/appointment-reminders/invite/${testVisit.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post(`/api/appointment-reminders/invite/${testVisit.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 400 for non-existent visit', async () => {
      const res = await request(app)
        .post('/api/appointment-reminders/invite/non-existent-id')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for past visit', async () => {
      const db = testDb.getDb();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const pastVisit = await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: pastDate,
        visit_type: 'follow_up',
        status: 'SCHEDULED',
        duration_minutes: 60
      });

      const res = await request(app)
        .post(`/api/appointment-reminders/invite/${pastVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('past');
    });

    it('should return 400 for completed visit', async () => {
      await testVisit.update({ status: 'COMPLETED' });

      const res = await request(app)
        .post(`/api/appointment-reminders/invite/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not scheduled');
    });

    it('should return 400 for patient without email', async () => {
      await testPatient.update({ email: null });

      const res = await request(app)
        .post(`/api/appointment-reminders/invite/${testVisit.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('email');
    });
  });

  // ========================================
  // GET /api/appointment-reminders/stats
  // ========================================
  describe('GET /api/appointment-reminders/stats', () => {
    it('should return reminder statistics', async () => {
      const res = await request(app)
        .get('/api/appointment-reminders/stats')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalReminders');
      expect(res.body.data).toHaveProperty('visitsWithReminders');
      expect(res.body.data).toHaveProperty('upcomingNeedingReminders');
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/appointment-reminders/stats');

      expect(res.status).toBe(401);
    });
  });
});
