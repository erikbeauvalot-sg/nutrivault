/**
 * Sessions Integration Tests
 * Tests for /api/sessions
 *
 * Routes (all require authenticate first):
 *   GET    /stats              - requirePermission('sessions.read')
 *   GET    /                   - requirePermission('sessions.read')
 *   DELETE /user/:userId       - requirePermission('sessions.revoke')
 *   DELETE /:id                - requirePermission('sessions.revoke')
 *
 * RBAC:
 *   ADMIN     - has sessions.read + sessions.revoke
 *   DIETITIAN - does NOT have sessions.read or sessions.revoke → 403
 *   ASSISTANT - does NOT have sessions.read or sessions.revoke → 403
 *
 * Sessions in this context are RefreshTokens. Since we use JWT-based auth in
 * tests (no real login endpoint), we seed RefreshTokens directly in the DB
 * when we need records to act on.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let app;

describe('Sessions API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;
  let db;

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

    db = testDb.getDb();

    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
    assistantAuth = await testAuth.createAssistant();
  });

  // Helper: create a RefreshToken in the DB for a given user.
  // The model uses token_hash (bcrypt hash) and does NOT store the raw token.
  // We use a SHA-256 hex digest as a cheap unique stand-in for the hash since
  // we are not exercising the token-verification flow here.
  async function createRefreshToken(userId, overrides = {}) {
    const crypto = require('crypto');
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = overrides.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Build the create payload without spreading overrides directly, so we can
    // control which fields land in the DB correctly.
    return db.RefreshToken.create({
      user_id: userId,
      token_hash: overrides.token_hash || tokenHash,
      expires_at: expiresAt,
      is_revoked: overrides.is_revoked || false,
      revoked_at: overrides.revoked_at || null,
      user_agent: overrides.user_agent || 'Test/1.0',
      ip_address: overrides.ip_address || '127.0.0.1'
    });
  }

  // ========================================
  // GET /api/sessions/stats
  // ========================================
  describe('GET /api/sessions/stats', () => {
    it('should return stats for admin (200)', async () => {
      const res = await request(app)
        .get('/api/sessions/stats')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.activeSessions).toBe('number');
      expect(typeof res.body.data.activeUsers).toBe('number');
      expect(typeof res.body.data.loginsLast24h).toBe('number');
      expect(typeof res.body.data.revokedToday).toBe('number');
    });

    it('should return correct active session count', async () => {
      // Create 2 active tokens for admin, 1 expired
      await createRefreshToken(adminAuth.user.id);
      await createRefreshToken(adminAuth.user.id);
      await createRefreshToken(adminAuth.user.id, {
        expires_at: new Date(Date.now() - 1000) // expired
      });

      const res = await request(app)
        .get('/api/sessions/stats')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.activeSessions).toBeGreaterThanOrEqual(2);
    });

    it('should return 403 for dietitian (no sessions.read permission)', async () => {
      const res = await request(app)
        .get('/api/sessions/stats')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant (no sessions.read permission)', async () => {
      const res = await request(app)
        .get('/api/sessions/stats')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/sessions/stats');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/sessions
  // ========================================
  describe('GET /api/sessions', () => {
    it('should return sessions list for admin (200)', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(typeof res.body.data.pagination.total).toBe('number');
      expect(typeof res.body.data.pagination.page).toBe('number');
      expect(typeof res.body.data.pagination.limit).toBe('number');
      expect(typeof res.body.data.pagination.totalPages).toBe('number');
    });

    it('should return session records when they exist', async () => {
      await createRefreshToken(adminAuth.user.id, { user_agent: 'TestBrowser/2.0' });

      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.sessions.length).toBeGreaterThanOrEqual(1);

      const session = res.body.data.sessions[0];
      expect(session.id).toBeDefined();
      expect(session.user).toBeDefined();
      expect(session.user.id).toBeDefined();
      expect(session.user.username).toBeDefined();
      expect(session.is_revoked).toBeDefined();
      expect(session.is_active).toBeDefined();
      expect(session.device_name).toBeDefined();
    });

    it('should filter by status=active', async () => {
      await createRefreshToken(adminAuth.user.id);
      await createRefreshToken(adminAuth.user.id, {
        is_revoked: true,
        revoked_at: new Date()
      });

      const res = await request(app)
        .get('/api/sessions?status=active')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      const sessions = res.body.data.sessions;
      // All returned sessions should be active (not revoked, not expired)
      sessions.forEach(s => {
        expect(s.is_active).toBe(true);
      });
    });

    it('should filter by status=revoked', async () => {
      await createRefreshToken(adminAuth.user.id);
      await createRefreshToken(adminAuth.user.id, {
        is_revoked: true,
        revoked_at: new Date()
      });

      const res = await request(app)
        .get('/api/sessions?status=revoked')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      const sessions = res.body.data.sessions;
      // All returned sessions should NOT be active
      sessions.forEach(s => {
        expect(s.is_active).toBe(false);
      });
    });

    it('should support pagination (page + limit)', async () => {
      // Create 3 tokens
      await createRefreshToken(adminAuth.user.id);
      await createRefreshToken(adminAuth.user.id);
      await createRefreshToken(adminAuth.user.id);

      const res = await request(app)
        .get('/api/sessions?page=1&limit=2')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.sessions.length).toBeLessThanOrEqual(2);
    });

    it('should return 403 for dietitian (no sessions.read permission)', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant (no sessions.read permission)', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/sessions');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/sessions/:id
  // ========================================
  describe('DELETE /api/sessions/:id', () => {
    it('should revoke a session for admin (200)', async () => {
      const token = await createRefreshToken(adminAuth.user.id);

      const res = await request(app)
        .delete(`/api/sessions/${token.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/revoked/i);

      // Confirm it was revoked in the DB
      await token.reload();
      expect(token.is_revoked).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';

      const res = await request(app)
        .delete(`/api/sessions/${fakeId}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when session is already revoked', async () => {
      const token = await createRefreshToken(adminAuth.user.id, {
        is_revoked: true,
        revoked_at: new Date()
      });

      const res = await request(app)
        .delete(`/api/sessions/${token.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian (no sessions.revoke permission)', async () => {
      const token = await createRefreshToken(adminAuth.user.id);

      const res = await request(app)
        .delete(`/api/sessions/${token.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant (no sessions.revoke permission)', async () => {
      const token = await createRefreshToken(adminAuth.user.id);

      const res = await request(app)
        .delete(`/api/sessions/${token.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const token = await createRefreshToken(adminAuth.user.id);

      const res = await request(app)
        .delete(`/api/sessions/${token.id}`);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/sessions/user/:userId
  // ========================================
  describe('DELETE /api/sessions/user/:userId', () => {
    it('should revoke all active sessions for a user (admin, 200)', async () => {
      const targetUser = dietitianAuth.user;

      // Create 2 active tokens for the target user
      await createRefreshToken(targetUser.id);
      await createRefreshToken(targetUser.id);

      const res = await request(app)
        .delete(`/api/sessions/user/${targetUser.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/revoked/i);

      // Confirm all active tokens for this user are now revoked
      const remainingActive = await db.RefreshToken.count({
        where: { user_id: targetUser.id, is_revoked: false }
      });
      expect(remainingActive).toBe(0);
    });

    it('should revoke 0 sessions when user has none active', async () => {
      const targetUser = assistantAuth.user;

      // No tokens created for this user
      const res = await request(app)
        .delete(`/api/sessions/user/${targetUser.id}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('0');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000099';

      const res = await request(app)
        .delete(`/api/sessions/user/${fakeUserId}`)
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for dietitian (no sessions.revoke permission)', async () => {
      const res = await request(app)
        .delete(`/api/sessions/user/${adminAuth.user.id}`)
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 403 for assistant (no sessions.revoke permission)', async () => {
      const res = await request(app)
        .delete(`/api/sessions/user/${adminAuth.user.id}`)
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .delete(`/api/sessions/user/${adminAuth.user.id}`);

      expect(res.status).toBe(401);
    });
  });
});
