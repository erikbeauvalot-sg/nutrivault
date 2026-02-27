/**
 * Email Config Integration Tests
 * Tests for /api/email-config
 *
 * Routes (all require authenticate only — no role/permission check):
 *   GET    /me          - Get current user's email config
 *   PUT    /me          - Create or update current user's email config
 *   POST   /me/verify   - Verify SMTP connection (throws 400 if no config)
 *   POST   /me/test     - Send a test email (throws 400 if no config / no recipient)
 *   DELETE /me          - Delete current user's email config (throws 500 if none)
 *
 * All authenticated users (admin, dietitian, assistant) can access all routes.
 * Unauthenticated requests are rejected with 401.
 *
 * Note: POST /me/verify and POST /me/test require real SMTP credentials and will
 * return 400 in the test environment since no SMTP server is available.
 * We verify the 401/403 boundary and the successful GET/PUT/DELETE flows.
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

// The email config service uses AES encryption for SMTP passwords.
// Set the required key before any module is loaded that imports the service.
process.env.SMTP_ENCRYPTION_KEY = 'test-smtp-encryption-key-32bytes!!';

let app;

describe('Email Config API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;

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

  // Helper: create an email config for a user via the API
  async function createEmailConfig(authHeader, overrides = {}) {
    const payload = {
      smtp_host: overrides.smtp_host || 'smtp.example.com',
      smtp_port: overrides.smtp_port || 587,
      smtp_secure: overrides.smtp_secure || false,
      smtp_user: overrides.smtp_user || 'user@example.com',
      smtp_password: overrides.smtp_password || 'secret123',
      from_name: overrides.from_name || 'Test User',
      from_email: overrides.from_email || 'noreply@example.com',
      is_active: overrides.is_active !== undefined ? overrides.is_active : true
    };
    const res = await request(app)
      .put('/api/email-config/me')
      .set('Authorization', authHeader)
      .send(payload);
    return res;
  }

  // ========================================
  // GET /api/email-config/me
  // ========================================
  describe('GET /api/email-config/me', () => {
    it('should return 200 with null data when no config exists (admin)', async () => {
      const res = await request(app)
        .get('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // No config set yet — data is null
      expect(res.body.data).toBeNull();
    });

    it('should return 200 for authenticated dietitian (no config)', async () => {
      const res = await request(app)
        .get('/api/email-config/me')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });

    it('should return 200 for authenticated assistant (no config)', async () => {
      const res = await request(app)
        .get('/api/email-config/me')
        .set('Authorization', assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return config data after it has been created', async () => {
      await createEmailConfig(adminAuth.authHeader, { from_name: 'Admin User' });

      const res = await request(app)
        .get('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.smtp_host).toBe('smtp.example.com');
      expect(res.body.data.from_name).toBe('Admin User');
      // Password should be stripped; has_password flag should be present
      expect(res.body.data.smtp_password).toBeUndefined();
      expect(res.body.data.has_password).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/email-config/me');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/email-config/me
  // ========================================
  describe('PUT /api/email-config/me', () => {
    it('should create email config for admin (200)', async () => {
      const res = await createEmailConfig(adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.smtp_host).toBe('smtp.example.com');
      expect(res.body.data.smtp_port).toBe(587);
      expect(res.body.data.smtp_user).toBe('user@example.com');
      // Password must not be returned
      expect(res.body.data.smtp_password).toBeUndefined();
      expect(res.body.data.has_password).toBe(true);
    });

    it('should create email config for dietitian (200)', async () => {
      const res = await createEmailConfig(dietitianAuth.authHeader, {
        smtp_host: 'mail.dietitian.com'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.smtp_host).toBe('mail.dietitian.com');
    });

    it('should create email config for assistant (200)', async () => {
      const res = await createEmailConfig(assistantAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update existing email config (upsert)', async () => {
      // Create first
      await createEmailConfig(adminAuth.authHeader, { from_name: 'Original Name' });

      // Update
      const res = await request(app)
        .put('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader)
        .send({ from_name: 'Updated Name', smtp_host: 'updated.example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.from_name).toBe('Updated Name');
      expect(res.body.data.smtp_host).toBe('updated.example.com');
    });

    it('should mark is_verified = false when SMTP credentials change', async () => {
      await createEmailConfig(adminAuth.authHeader);

      const res = await request(app)
        .put('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader)
        .send({ smtp_host: 'new.smtp.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.is_verified).toBe(false);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/email-config/me')
        .send({ smtp_host: 'smtp.example.com' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST /api/email-config/me/verify
  // ========================================
  describe('POST /api/email-config/me/verify', () => {
    it('should return 400 when no email config exists', async () => {
      const res = await request(app)
        .post('/api/email-config/me/verify')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when SMTP config is incomplete (no password set in env)', async () => {
      // Create a config without a password set — verify will fail
      await request(app)
        .put('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader)
        .send({ smtp_host: 'smtp.example.com', smtp_user: 'user@example.com' });

      const res = await request(app)
        .post('/api/email-config/me/verify')
        .set('Authorization', adminAuth.authHeader);

      // Either 400 (no password / incomplete) or 400 (SMTP connection failed) — both are valid
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for dietitian when no config exists', async () => {
      const res = await request(app)
        .post('/api/email-config/me/verify')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/email-config/me/verify');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST /api/email-config/me/test
  // ========================================
  describe('POST /api/email-config/me/test', () => {
    it('should return 400 when recipient is missing', async () => {
      await createEmailConfig(adminAuth.authHeader);

      const res = await request(app)
        .post('/api/email-config/me/test')
        .set('Authorization', adminAuth.authHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when no email config exists', async () => {
      const res = await request(app)
        .post('/api/email-config/me/test')
        .set('Authorization', adminAuth.authHeader)
        .send({ recipient: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/email-config/me/test')
        .send({ recipient: 'test@example.com' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/email-config/me
  // ========================================
  describe('DELETE /api/email-config/me', () => {
    it('should delete email config for admin (200)', async () => {
      // Create config first
      await createEmailConfig(adminAuth.authHeader);

      const deleteRes = await request(app)
        .delete('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify it's gone
      const getRes = await request(app)
        .get('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data).toBeNull();
    });

    it('should delete email config for dietitian (200)', async () => {
      await createEmailConfig(dietitianAuth.authHeader);

      const res = await request(app)
        .delete('/api/email-config/me')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not affect another user\'s config when deleting own', async () => {
      // Create configs for two users
      await createEmailConfig(adminAuth.authHeader, { smtp_host: 'admin.smtp.com' });
      await createEmailConfig(dietitianAuth.authHeader, { smtp_host: 'dietitian.smtp.com' });

      // Admin deletes own config
      await request(app)
        .delete('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader);

      // Dietitian's config should still be there
      const dietitianRes = await request(app)
        .get('/api/email-config/me')
        .set('Authorization', dietitianAuth.authHeader);

      expect(dietitianRes.status).toBe(200);
      expect(dietitianRes.body.data).not.toBeNull();
      expect(dietitianRes.body.data.smtp_host).toBe('dietitian.smtp.com');
    });

    it('should return 500 when no email config exists to delete', async () => {
      // The service throws "No email configuration found" which the route catches as 500
      const res = await request(app)
        .delete('/api/email-config/me')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .delete('/api/email-config/me');

      expect(res.status).toBe(401);
    });
  });
});
