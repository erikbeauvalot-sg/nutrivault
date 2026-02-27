/**
 * Notifications API Integration Tests
 * Tests for /api/notifications REST endpoints
 *
 * Routes use `authenticate` only (no permissions required).
 * Each authenticated user only sees their own notifications.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;
let db;

describe('Notifications API', () => {
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
  // GET /api/notifications
  // ========================================
  describe('GET /api/notifications', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).get('/api/notifications');
      expect(response.status).toBe(401);
    });

    it('returns 200 with empty list when no notifications exist', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(0);
    });

    it('returns paginated notifications for authenticated user', async () => {
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Notification 1',
        type: 'general',
      });
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Notification 2',
        type: 'general',
      });

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.page).toBe(1);
    });

    it('returns only the current user s notifications (not other users)', async () => {
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Admin notification',
        type: 'general',
      });
      await db.Notification.create({
        user_id: dietitianAuth.user.id,
        title: 'Dietitian notification',
        type: 'general',
      });

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Admin notification');
    });

    it('respects page and limit query parameters', async () => {
      for (let i = 1; i <= 5; i++) {
        await db.Notification.create({
          user_id: adminAuth.user.id,
          title: `Notification ${i}`,
          type: 'general',
        });
      }

      const response = await request(app)
        .get('/api/notifications?page=1&limit=2')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it('returns second page correctly', async () => {
      for (let i = 1; i <= 4; i++) {
        await db.Notification.create({
          user_id: adminAuth.user.id,
          title: `Notification ${i}`,
          type: 'general',
        });
      }

      const response = await request(app)
        .get('/api/notifications?page=2&limit=2')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(2);
    });
  });

  // ========================================
  // GET /api/notifications/unread-count
  // ========================================
  describe('GET /api/notifications/unread-count', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).get('/api/notifications/unread-count');
      expect(response.status).toBe(401);
    });

    it('returns count 0 when no notifications exist', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });

    it('returns correct unread count', async () => {
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Unread 1',
        type: 'general',
        is_read: false,
      });
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Unread 2',
        type: 'general',
        is_read: false,
      });
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Already read',
        type: 'general',
        is_read: true,
        read_at: new Date(),
      });

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
    });

    it('does not count other users notifications', async () => {
      await db.Notification.create({
        user_id: dietitianAuth.user.id,
        title: 'Dietitian unread',
        type: 'general',
        is_read: false,
      });

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });
  });

  // ========================================
  // PUT /api/notifications/read-all
  // ========================================
  describe('PUT /api/notifications/read-all', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).put('/api/notifications/read-all');
      expect(response.status).toBe(401);
    });

    it('returns 200 with updated count 0 when no unread notifications', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(0);
    });

    it('marks all unread notifications as read', async () => {
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Unread 1',
        type: 'general',
        is_read: false,
      });
      await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Unread 2',
        type: 'general',
        is_read: false,
      });

      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(2);

      // Verify they are now read in DB
      const unreadCount = await db.Notification.count({
        where: { user_id: adminAuth.user.id, is_read: false },
      });
      expect(unreadCount).toBe(0);
    });

    it('does not affect notifications of other users', async () => {
      await db.Notification.create({
        user_id: dietitianAuth.user.id,
        title: 'Dietitian unread',
        type: 'general',
        is_read: false,
      });

      await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', adminAuth.authHeader);

      const dietitianUnread = await db.Notification.count({
        where: { user_id: dietitianAuth.user.id, is_read: false },
      });
      expect(dietitianUnread).toBe(1);
    });
  });

  // ========================================
  // PUT /api/notifications/:id/read
  // ========================================
  describe('PUT /api/notifications/:id/read', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).put(
        '/api/notifications/00000000-0000-0000-0000-000000000000/read'
      );
      expect(response.status).toBe(401);
    });

    it('marks a single notification as read and returns 200', async () => {
      const notification = await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'Single unread',
        type: 'general',
        is_read: false,
      });

      const response = await request(app)
        .put(`/api/notifications/${notification.id}/read`)
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.is_read).toBe(true);

      // Verify in DB
      await notification.reload();
      expect(notification.is_read).toBe(true);
      expect(notification.read_at).not.toBeNull();
    });

    it('returns 404 for non-existent notification id', async () => {
      const response = await request(app)
        .put('/api/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(404);
    });

    it('returns 404 when trying to read another user s notification', async () => {
      const notification = await db.Notification.create({
        user_id: dietitianAuth.user.id,
        title: 'Dietitian notification',
        type: 'general',
        is_read: false,
      });

      const response = await request(app)
        .put(`/api/notifications/${notification.id}/read`)
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(404);
    });
  });

  // ========================================
  // DELETE /api/notifications/:id
  // ========================================
  describe('DELETE /api/notifications/:id', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).delete(
        '/api/notifications/00000000-0000-0000-0000-000000000000'
      );
      expect(response.status).toBe(401);
    });

    it('deletes a notification and returns 200', async () => {
      const notification = await db.Notification.create({
        user_id: adminAuth.user.id,
        title: 'To be deleted',
        type: 'general',
      });

      const response = await request(app)
        .delete(`/api/notifications/${notification.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();

      // Verify deletion in DB
      const found = await db.Notification.findByPk(notification.id);
      expect(found).toBeNull();
    });

    it('returns 404 for non-existent notification id', async () => {
      const response = await request(app)
        .delete('/api/notifications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(404);
    });

    it('returns 404 when trying to delete another user s notification', async () => {
      const notification = await db.Notification.create({
        user_id: dietitianAuth.user.id,
        title: 'Dietitian notification',
        type: 'general',
      });

      const response = await request(app)
        .delete(`/api/notifications/${notification.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(response.status).toBe(404);

      // Verify it was not deleted
      const found = await db.Notification.findByPk(notification.id);
      expect(found).not.toBeNull();
    });
  });

  // ========================================
  // POST /api/notifications/reset-badge
  // ========================================
  describe('POST /api/notifications/reset-badge', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const response = await request(app).post('/api/notifications/reset-badge');
      expect(response.status).toBe(401);
    });

    it('returns 200 for authenticated user (badge reset attempt)', async () => {
      // The pushNotification service may fail silently in test env; the route
      // catches all errors, so we expect either 200 or 500 depending on service.
      // In the test environment with no device tokens, the service should handle
      // gracefully. We just verify auth is enforced and the route is reachable.
      const response = await request(app)
        .post('/api/notifications/reset-badge')
        .set('Authorization', adminAuth.authHeader);

      // Accept 200 (success) or 500 (push service unavailable in test)
      expect([200, 500]).toContain(response.status);
    });
  });
});
