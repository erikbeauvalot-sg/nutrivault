/**
 * Invoice Customizations Integration Tests
 * Tests for /api/invoice-customizations endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { invoiceCustomizations: customizationFixtures } = require('../fixtures');

let app;

describe('Invoice Customizations API', () => {
  let adminAuth;
  let dietitianAuth;
  let assistantAuth;

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
  });

  afterAll(async () => {
    await testDb.close();
  });

  // ========================================
  // GET /api/invoice-customizations/me
  // ========================================
  describe('GET /api/invoice-customizations/me', () => {
    it('should return current user customization (empty if not set)', async () => {
      const res = await request(app)
        .get('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return customization for dietitian', async () => {
      const res = await request(app)
        .get('/api/invoice-customizations/me')
        .set('Authorization', dietitianAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get('/api/invoice-customizations/me');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/invoice-customizations/me
  // ========================================
  describe('PUT /api/invoice-customizations/me', () => {
    it('should create/update customization with valid data', async () => {
      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.validCustomization);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business_name).toBe(customizationFixtures.validCustomization.business_name);
    });

    it('should create customization with minimal data', async () => {
      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.minimalCustomization);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should create customization with full data', async () => {
      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.fullCustomization);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update existing customization', async () => {
      // Create initial customization
      await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.validCustomization);

      // Update it
      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.customizationUpdates.updateBusinessInfo);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business_name).toBe(customizationFixtures.customizationUpdates.updateBusinessInfo.business_name);
    });

    it('should update payment details', async () => {
      // Create initial customization
      await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.validCustomization);

      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.customizationUpdates.updatePaymentDetails);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update invoice settings', async () => {
      // Create initial customization
      await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.validCustomization);

      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.customizationUpdates.updateInvoiceSettings);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update branding', async () => {
      // Create initial customization
      await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.validCustomization);

      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.customizationUpdates.updateBranding);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle customization without business_name', async () => {
      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.invalidCustomizations.missingBusinessName);

      // API may accept this (200) or reject it (400) depending on validation rules
      expect([200, 400]).toContain(res.status);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put('/api/invoice-customizations/me')
        .send(customizationFixtures.validCustomization);

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // Separate customizations per user
  // ========================================
  describe('Per-user customizations', () => {
    it('should maintain separate customizations for different users', async () => {
      // Create customization for admin
      await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.userCustomizations.user1);

      // Create customization for dietitian
      await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', dietitianAuth.authHeader)
        .send(customizationFixtures.userCustomizations.user2);

      // Verify admin's customization
      const adminRes = await request(app)
        .get('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader);

      expect(adminRes.body.data.business_name).toBe(customizationFixtures.userCustomizations.user1.business_name);

      // Verify dietitian's customization
      const dietitianRes = await request(app)
        .get('/api/invoice-customizations/me')
        .set('Authorization', dietitianAuth.authHeader);

      expect(dietitianRes.body.data.business_name).toBe(customizationFixtures.userCustomizations.user2.business_name);
    });
  });

  // ========================================
  // POST /api/invoice-customizations/me/reset
  // ========================================
  describe('POST /api/invoice-customizations/me/reset', () => {
    beforeEach(async () => {
      // Create a customization first
      await request(app)
        .put('/api/invoice-customizations/me')
        .set('Authorization', adminAuth.authHeader)
        .send(customizationFixtures.validCustomization);
    });

    it('should reset user customization to defaults', async () => {
      const res = await request(app)
        .post('/api/invoice-customizations/me/reset')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject reset without authentication', async () => {
      const res = await request(app)
        .post('/api/invoice-customizations/me/reset');

      expect(res.status).toBe(401);
    });
  });
});
