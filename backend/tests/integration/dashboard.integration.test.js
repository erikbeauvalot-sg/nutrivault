/**
 * Integration Tests for Dashboard Routes
 * Routes: GET /overview, /revenue-chart, /health-score, /activity, /activity-summary,
 *         /whats-new, /changelogs, and tasks CRUD
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Dashboard API', () => {
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

  describe('GET /api/dashboard/overview', () => {
    it('should return overview for admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return overview for dietitian', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/revenue-chart', () => {
    it('should return revenue chart for admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/revenue-chart')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept period parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/revenue-chart?period=quarterly')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/dashboard/revenue-chart');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/health-score', () => {
    it('should return health score for admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/health-score')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/dashboard/health-score');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/activity', () => {
    it('should return activity feed for admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept limit parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/activity?limit=5')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/dashboard/activity');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/activity-summary', () => {
    it('should return activity summary', async () => {
      const res = await request(app)
        .get('/api/dashboard/activity-summary')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/whats-new', () => {
    it('should return whats-new for admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/whats-new')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentVersion).toBeDefined();
    });

    it('should accept language parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/whats-new?language=en')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/dashboard/changelogs', () => {
    it('should return changelogs', async () => {
      const res = await request(app)
        .get('/api/dashboard/changelogs')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // Tasks CRUD
  describe('Tasks', () => {
    describe('POST /api/dashboard/tasks', () => {
      it('should create task as admin', async () => {
        const res = await request(app)
          .post('/api/dashboard/tasks')
          .set('Authorization', adminAuth.authHeader)
          .send({
            title: 'Call patient John',
            description: 'Follow up on diet plan',
            priority: 'high',
            due_date: '2025-06-01'
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('Call patient John');
      });

      it('should return 400 when title is missing', async () => {
        const res = await request(app)
          .post('/api/dashboard/tasks')
          .set('Authorization', adminAuth.authHeader)
          .send({ description: 'Missing title' });

        expect(res.status).toBe(400);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .post('/api/dashboard/tasks')
          .send({ title: 'No auth' });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/dashboard/tasks', () => {
      beforeEach(async () => {
        const db = testDb.getDb();
        await db.Task.bulkCreate([
          { title: 'Task 1', status: 'pending', priority: 'normal', created_by: adminAuth.user.id },
          { title: 'Task 2', status: 'completed', priority: 'high', created_by: adminAuth.user.id }
        ]);
      });

      it('should return tasks for admin', async () => {
        const res = await request(app)
          .get('/api/dashboard/tasks')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .get('/api/dashboard/tasks');

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/dashboard/tasks/stats', () => {
      it('should return task stats', async () => {
        const res = await request(app)
          .get('/api/dashboard/tasks/stats')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('GET /api/dashboard/tasks/due-soon', () => {
      it('should return tasks due soon', async () => {
        const res = await request(app)
          .get('/api/dashboard/tasks/due-soon')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('PUT /api/dashboard/tasks/:id', () => {
      let task;

      beforeEach(async () => {
        const db = testDb.getDb();
        task = await db.Task.create({
          title: 'Updatable task',
          status: 'pending',
          priority: 'normal',
          created_by: adminAuth.user.id
        });
      });

      it('should update task as admin', async () => {
        const res = await request(app)
          .put(`/api/dashboard/tasks/${task.id}`)
          .set('Authorization', adminAuth.authHeader)
          .send({ title: 'Updated task', priority: 'high' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent task', async () => {
        const res = await request(app)
          .put('/api/dashboard/tasks/99999')
          .set('Authorization', adminAuth.authHeader)
          .send({ title: 'Ghost task' });

        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/dashboard/tasks/:id/complete', () => {
      let task;

      beforeEach(async () => {
        const db = testDb.getDb();
        task = await db.Task.create({
          title: 'Completable task',
          status: 'pending',
          priority: 'normal',
          created_by: adminAuth.user.id
        });
      });

      it('should complete task as admin', async () => {
        const res = await request(app)
          .put(`/api/dashboard/tasks/${task.id}/complete`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('DELETE /api/dashboard/tasks/:id', () => {
      let task;

      beforeEach(async () => {
        const db = testDb.getDb();
        task = await db.Task.create({
          title: 'Deletable task',
          status: 'pending',
          priority: 'normal',
          created_by: adminAuth.user.id
        });
      });

      it('should delete task as admin', async () => {
        const res = await request(app)
          .delete(`/api/dashboard/tasks/${task.id}`)
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 for non-existent task', async () => {
        const res = await request(app)
          .delete('/api/dashboard/tasks/99999')
          .set('Authorization', adminAuth.authHeader);

        expect(res.status).toBe(404);
      });
    });
  });
});
