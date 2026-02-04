/**
 * Integration Tests for Scheduler Routes
 * Routes: GET /jobs, POST /jobs/:name/trigger, PUT /jobs/:name, PATCH /jobs/:name/toggle
 * All routes require ADMIN role
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

// Mock the scheduler service to avoid actual cron job execution
jest.mock('../../src/services/scheduler.service', () => ({
  getDetailedJobStatus: jest.fn(async () => [
    {
      name: 'appointmentReminders',
      description: 'Send appointment reminders',
      cronSchedule: '0 8 * * *',
      enabled: true,
      lastRun: null,
      nextRun: new Date().toISOString()
    },
    {
      name: 'scheduledCampaigns',
      description: 'Process scheduled campaigns',
      cronSchedule: '*/15 * * * *',
      enabled: true,
      lastRun: null,
      nextRun: new Date().toISOString()
    }
  ]),
  triggerAppointmentRemindersNow: jest.fn(async () => ({ sent: 0, errors: 0 })),
  triggerScheduledCampaignsNow: jest.fn(async () => ({ processed: 0, sent: 0 })),
  updateJobSchedule: jest.fn(async (name, cronSchedule) => {
    if (name !== 'appointmentReminders' && name !== 'scheduledCampaigns') {
      throw new Error(`Unknown job: ${name}`);
    }
    return [{ name, cronSchedule, enabled: true }];
  }),
  toggleJob: jest.fn(async (name, enabled) => {
    if (name !== 'appointmentReminders' && name !== 'scheduledCampaigns') {
      throw new Error(`Unknown job: ${name}`);
    }
    return [{ name, enabled }];
  })
}));

describe('Scheduler API', () => {
  let adminAuth, dietitianAuth;

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
  });

  describe('GET /api/scheduler/jobs', () => {
    it('should return scheduled jobs for admin', async () => {
      const res = await request(app)
        .get('/api/scheduler/jobs')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .get('/api/scheduler/jobs')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/scheduler/jobs');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/scheduler/jobs/:name/trigger', () => {
    it('should trigger appointmentReminders job as admin', async () => {
      const res = await request(app)
        .post('/api/scheduler/jobs/appointmentReminders/trigger')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.job).toBe('appointmentReminders');
    });

    it('should trigger scheduledCampaigns job as admin', async () => {
      const res = await request(app)
        .post('/api/scheduler/jobs/scheduledCampaigns/trigger')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.job).toBe('scheduledCampaigns');
    });

    it('should return 404 for unknown job', async () => {
      const res = await request(app)
        .post('/api/scheduler/jobs/unknownJob/trigger')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/scheduler/jobs/appointmentReminders/trigger')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/scheduler/jobs/:name', () => {
    it('should update job schedule as admin', async () => {
      const res = await request(app)
        .put('/api/scheduler/jobs/appointmentReminders')
        .set('Authorization', adminAuth.authHeader)
        .send({ cronSchedule: '0 9 * * *' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when cronSchedule is missing', async () => {
      const res = await request(app)
        .put('/api/scheduler/jobs/appointmentReminders')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .put('/api/scheduler/jobs/appointmentReminders')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ cronSchedule: '0 9 * * *' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/scheduler/jobs/:name/toggle', () => {
    it('should toggle job as admin', async () => {
      const res = await request(app)
        .patch('/api/scheduler/jobs/appointmentReminders/toggle')
        .set('Authorization', adminAuth.authHeader)
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when enabled is not boolean', async () => {
      const res = await request(app)
        .patch('/api/scheduler/jobs/appointmentReminders/toggle')
        .set('Authorization', adminAuth.authHeader)
        .send({ enabled: 'yes' });

      expect(res.status).toBe(400);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .patch('/api/scheduler/jobs/appointmentReminders/toggle')
        .set('Authorization', dietitianAuth.authHeader)
        .send({ enabled: false });

      expect(res.status).toBe(403);
    });
  });
});
