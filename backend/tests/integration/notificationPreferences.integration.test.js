/**
 * Notification Preferences API Integration Tests
 * Tests for /api/notification-preferences REST endpoints
 *
 * Routes use `authenticate` only (no permissions required).
 * GET auto-creates default preferences when none exist for the user.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;
let db;

describe('Notification Preferences API', () => {
  let adminAuth;
  let dietitianAuth;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
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
  });

  // ========================================
  // GET /api/notification-preferences
  // ========================================
  describe('GET /api/notification-preferences', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).get('/api/notification-preferences');
      expect(response.status).toBe(401);
    });

    it('returns 200 with default preferences when none exist', async () => {
      const response = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.appointment_reminders).toBe(true);
      expect(response.body.data.new_documents).toBe(true);
      expect(response.body.data.measure_alerts).toBe(true);
      expect(response.body.data.journal_comments).toBe(true);
      expect(response.body.data.new_messages).toBe(true);
    });

    it('auto-creates preferences record when none exist', async () => {
      // Verify no prefs exist before the call
      const beforeCount = await db.NotificationPreference.count({
        where: { user_id: adminAuth.user.id },
      });
      expect(beforeCount).toBe(0);

      await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader);

      // Verify it was created
      const afterCount = await db.NotificationPreference.count({
        where: { user_id: adminAuth.user.id },
      });
      expect(afterCount).toBe(1);
    });

    it('returns existing preferences when they exist', async () => {
      await db.NotificationPreference.create({
        user_id: adminAuth.user.id,
        appointment_reminders: false,
        new_documents: false,
        measure_alerts: true,
        journal_comments: true,
        new_messages: false,
        reminder_times_hours: JSON.stringify([24, 48]),
      });

      const response = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.appointment_reminders).toBe(false);
      expect(response.body.data.new_documents).toBe(false);
      expect(response.body.data.new_messages).toBe(false);
      expect(response.body.data.measure_alerts).toBe(true);
    });

    it('returns only the preference fields (not id or user_id)', async () => {
      const response = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      const data = response.body.data;
      expect(data).toHaveProperty('appointment_reminders');
      expect(data).toHaveProperty('new_documents');
      expect(data).toHaveProperty('measure_alerts');
      expect(data).toHaveProperty('journal_comments');
      expect(data).toHaveProperty('new_messages');
      expect(data).toHaveProperty('reminder_times_hours');
      // id and user_id should NOT be in the returned data object
      expect(data.id).toBeUndefined();
      expect(data.user_id).toBeUndefined();
    });

    it('returns null for reminder_times_hours when not set', async () => {
      const response = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.reminder_times_hours).toBeNull();
    });

    it('returns preferences scoped to the current user only', async () => {
      // Create different prefs for each user
      await db.NotificationPreference.create({
        user_id: adminAuth.user.id,
        new_messages: false,
      });
      await db.NotificationPreference.create({
        user_id: dietitianAuth.user.id,
        new_messages: true,
      });

      const adminResponse = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader);

      const dietitianResponse = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', dietitianAuth.authHeader);

      expect(adminResponse.body.data.new_messages).toBe(false);
      expect(dietitianResponse.body.data.new_messages).toBe(true);
    });
  });

  // ========================================
  // PUT /api/notification-preferences
  // ========================================
  describe('PUT /api/notification-preferences', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .put('/api/notification-preferences')
        .send({ new_messages: false });

      expect(response.status).toBe(401);
    });

    it('returns 200 and updates boolean preferences', async () => {
      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({
          appointment_reminders: false,
          new_messages: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.appointment_reminders).toBe(false);
      expect(response.body.data.new_messages).toBe(false);
    });

    it('creates preferences record if none exist and updates it', async () => {
      const beforeCount = await db.NotificationPreference.count({
        where: { user_id: adminAuth.user.id },
      });
      expect(beforeCount).toBe(0);

      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ new_documents: false });

      expect(response.status).toBe(200);

      const afterCount = await db.NotificationPreference.count({
        where: { user_id: adminAuth.user.id },
      });
      expect(afterCount).toBe(1);
    });

    it('updates reminder_times_hours with a valid array of positive numbers', async () => {
      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ reminder_times_hours: [24, 48, 72] });

      expect(response.status).toBe(200);
      expect(response.body.data.reminder_times_hours).toEqual([24, 48, 72]);
    });

    it('sets reminder_times_hours to null when null is sent', async () => {
      // First set a value
      await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ reminder_times_hours: [24] });

      // Then clear it
      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ reminder_times_hours: null });

      expect(response.status).toBe(200);
      expect(response.body.data.reminder_times_hours).toBeNull();
    });

    it('ignores non-boolean values for boolean fields', async () => {
      // Set known state first
      await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ new_messages: true });

      // Send a string instead of boolean — should be ignored
      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ new_messages: 'yes' });

      expect(response.status).toBe(200);
      // Value should remain unchanged from prior update
      expect(response.body.data.new_messages).toBe(true);
    });

    it('ignores invalid reminder_times_hours (non-numeric array)', async () => {
      // Set a valid value first
      await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ reminder_times_hours: [24] });

      // Try to set an invalid value
      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ reminder_times_hours: ['morning', 'evening'] });

      expect(response.status).toBe(200);
      // Value should remain unchanged (route ignores invalid arrays)
      expect(response.body.data.reminder_times_hours).toEqual([24]);
    });

    it('ignores reminder_times_hours with zero or negative values', async () => {
      // Set a valid value first
      await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ reminder_times_hours: [24] });

      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ reminder_times_hours: [0, -1] });

      expect(response.status).toBe(200);
      // Should be ignored; previous value retained
      expect(response.body.data.reminder_times_hours).toEqual([24]);
    });

    it('returns 200 with no change when body has no recognized fields', async () => {
      const response = await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({ unknown_field: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('persists updates to database', async () => {
      await request(app)
        .put('/api/notification-preferences')
        .set('Authorization', adminAuth.authHeader)
        .send({
          measure_alerts: false,
          journal_comments: false,
        });

      const prefs = await db.NotificationPreference.findOne({
        where: { user_id: adminAuth.user.id },
      });
      expect(prefs.measure_alerts).toBe(false);
      expect(prefs.journal_comments).toBe(false);
    });
  });
});
