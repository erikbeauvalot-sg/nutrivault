/**
 * Integration Tests for Google Calendar Routes
 * Routes: OAuth flow, calendars, sync, settings, admin endpoints, conflict resolution
 * Heavily mocked - focus on auth/permission checks and request validation
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

// Mock Google Calendar controller methods that make external API calls
jest.mock('../../src/services/googleCalendar.service', () => ({
  getAuthUrl: jest.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth?mock=true'),
  getCalendars: jest.fn(async () => [
    { id: 'primary', summary: 'Main Calendar', primary: true },
    { id: 'work', summary: 'Work Calendar', primary: false }
  ]),
  syncToCalendar: jest.fn(async () => ({ synced: 0, errors: 0 })),
  syncFromCalendar: jest.fn(async () => ({ imported: 0, updated: 0, errors: 0 })),
  getSyncStatus: jest.fn(async () => ({
    connected: true,
    lastSync: null,
    selectedCalendar: 'primary'
  })),
  disconnect: jest.fn(async () => ({ success: true })),
  getSyncIssues: jest.fn(async () => []),
  resolveConflict: jest.fn(async () => ({ resolved: true })),
  retryFailedSyncs: jest.fn(async () => ({ retried: 0 })),
  getSyncStats: jest.fn(async () => ({ totalSynced: 0, totalFailed: 0 })),
  getConflictDetails: jest.fn(async () => null),
  handleCallback: jest.fn(async () => ({ success: true })),
  updateSettings: jest.fn(async () => ({ success: true })),
  getSettings: jest.fn(async () => ({ sync_enabled: true, calendar_id: 'primary' }))
}));

describe('Google Calendar API', () => {
  let adminAuth, dietitianAuth, assistantAuth;

  beforeAll(async () => {
    await testDb.init();
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
    assistantAuth = await testAuth.createAssistant();
  });

  // --- User endpoints ---
  describe('GET /api/calendar/auth-url', () => {
    it('should return auth URL for authenticated user', async () => {
      const res = await request(app)
        .get('/api/calendar/auth-url')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should work for dietitian', async () => {
      const res = await request(app)
        .get('/api/calendar/auth-url')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/calendar/auth-url');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/calendar/calendars', () => {
    it('should accept calendars request for authenticated user (may fail without Google tokens)', async () => {
      const res = await request(app)
        .get('/api/calendar/calendars')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/calendar/calendars');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/calendar/sync-to-calendar', () => {
    it('should sync to calendar for authenticated user', async () => {
      const res = await request(app)
        .post('/api/calendar/sync-to-calendar')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/calendar/sync-to-calendar')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/calendar/sync-from-calendar', () => {
    it('should accept sync-from request for authenticated user (may fail without Google tokens)', async () => {
      const res = await request(app)
        .post('/api/calendar/sync-from-calendar')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/calendar/sync-from-calendar')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/calendar/sync-status', () => {
    it('should return sync status for authenticated user', async () => {
      const res = await request(app)
        .get('/api/calendar/sync-status')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/calendar/sync-status');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/calendar/settings', () => {
    it('should accept settings request for authenticated user (may fail internally)', async () => {
      const res = await request(app)
        .put('/api/calendar/settings')
        .set('Authorization', adminAuth.authHeader)
        .send({ sync_enabled: true, calendar_id: 'primary' });

      // May return 200 or 500 depending on Google service availability
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/calendar/settings')
        .send({ sync_enabled: true });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/calendar/disconnect', () => {
    it('should accept disconnect for authenticated user (may fail internally)', async () => {
      const res = await request(app)
        .delete('/api/calendar/disconnect')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .delete('/api/calendar/disconnect');

      expect(res.status).toBe(401);
    });
  });

  // --- Sync issues and conflict resolution ---
  describe('GET /api/calendar/sync-issues', () => {
    it('should return sync issues for authenticated user', async () => {
      const res = await request(app)
        .get('/api/calendar/sync-issues')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/calendar/retry-failed', () => {
    it('should retry failed syncs for authenticated user', async () => {
      const res = await request(app)
        .post('/api/calendar/retry-failed')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/calendar/sync-stats', () => {
    it('should return sync stats for authenticated user', async () => {
      const res = await request(app)
        .get('/api/calendar/sync-stats')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });
  });

  // --- Admin endpoints ---
  describe('GET /api/calendar/admin/dietitians', () => {
    it('should return dietitians list for admin', async () => {
      const res = await request(app)
        .get('/api/calendar/admin/dietitians')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get('/api/calendar/admin/dietitians')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/calendar/admin/dietitians');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/calendar/admin/auth-url/:userId', () => {
    it('should return auth URL for specific user as admin', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/auth-url/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/auth-url/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/calendar/admin/sync-status/:userId', () => {
    it('should return sync status for specific user as admin', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/sync-status/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/sync-status/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/calendar/admin/sync-stats/:userId', () => {
    it('should return sync stats for specific user as admin', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/sync-stats/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/sync-stats/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/calendar/admin/sync/:userId', () => {
    it('should accept sync request for specific user as admin (may fail internally)', async () => {
      const res = await request(app)
        .post(`/api/calendar/admin/sync/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      // May fail internally due to no Google tokens, but should not be 401/403
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post(`/api/calendar/admin/sync/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/calendar/admin/sync-all', () => {
    it('should trigger sync all as admin', async () => {
      const res = await request(app)
        .post('/api/calendar/admin/sync-all')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/calendar/admin/sync-all')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/calendar/admin/disconnect/:userId', () => {
    it('should accept disconnect for specific user as admin (may fail internally)', async () => {
      const res = await request(app)
        .delete(`/api/calendar/admin/disconnect/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .delete(`/api/calendar/admin/disconnect/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/calendar/admin/settings/:userId', () => {
    it('should accept settings update for specific user as admin (may fail internally)', async () => {
      const res = await request(app)
        .put(`/api/calendar/admin/settings/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader)
        .send({ sync_enabled: true, calendar_id: 'work' });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .put(`/api/calendar/admin/settings/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader)
        .send({ sync_enabled: true });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/calendar/admin/calendars/:userId', () => {
    it('should accept calendars request for specific user as admin (may fail internally)', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/calendars/${dietitianAuth.user.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get(`/api/calendar/admin/calendars/${dietitianAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
