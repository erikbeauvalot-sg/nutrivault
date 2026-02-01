/**
 * Campaign API Integration Tests
 * Tests for campaign REST endpoints
 */

const request = require('supertest');
const testDb = require('../setup/testDb');

// Import server after testDb initialization
let app;
let db;
let authToken;
let testUser;
let testDietitian;
let testPatient1;
let testPatient2;

describe('Campaign API Integration Tests', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();

    // Add campaign permissions
    await db.Permission.bulkCreate([
      { code: 'campaigns.create', description: 'Create campaigns', resource: 'campaigns', action: 'create' },
      { code: 'campaigns.read', description: 'Read campaigns', resource: 'campaigns', action: 'read' },
      { code: 'campaigns.update', description: 'Update campaigns', resource: 'campaigns', action: 'update' },
      { code: 'campaigns.delete', description: 'Delete campaigns', resource: 'campaigns', action: 'delete' },
      { code: 'campaigns.send', description: 'Send campaigns', resource: 'campaigns', action: 'send' }
    ]);

    // Assign permissions to ADMIN role
    const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    const campaignPermissions = await db.Permission.findAll({
      where: { resource: 'campaigns' }
    });

    for (const perm of campaignPermissions) {
      await db.RolePermission.create({
        role_id: adminRole.id,
        permission_id: perm.id
      });
    }

    // Import app after db setup
    app = require('../../src/server');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();

    // Re-add campaign permissions after reset
    await db.Permission.bulkCreate([
      { code: 'campaigns.create', description: 'Create campaigns', resource: 'campaigns', action: 'create' },
      { code: 'campaigns.read', description: 'Read campaigns', resource: 'campaigns', action: 'read' },
      { code: 'campaigns.update', description: 'Update campaigns', resource: 'campaigns', action: 'update' },
      { code: 'campaigns.delete', description: 'Delete campaigns', resource: 'campaigns', action: 'delete' },
      { code: 'campaigns.send', description: 'Send campaigns', resource: 'campaigns', action: 'send' }
    ]);

    const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
    const campaignPermissions = await db.Permission.findAll({
      where: { resource: 'campaigns' }
    });

    for (const perm of campaignPermissions) {
      await db.RolePermission.create({
        role_id: adminRole.id,
        permission_id: perm.id
      });
    }

    // Create test user
    testUser = await db.User.create({
      username: 'campaigntester',
      email: 'campaigntester@example.com',
      password_hash: '$2b$10$testhashedpassword',
      first_name: 'Campaign',
      last_name: 'Tester',
      role_id: adminRole.id,
      is_active: true
    });

    testDietitian = await db.User.create({
      username: 'dietitian1',
      email: 'dietitian1@example.com',
      password_hash: '$2b$10$testhashedpassword',
      first_name: 'Marie',
      last_name: 'Dupont',
      role_id: dietitianRole.id,
      is_active: true
    });

    // Create test patients
    testPatient1 = await db.Patient.create({
      first_name: 'Jean',
      last_name: 'Martin',
      email: 'jean.martin@example.com',
      is_active: true,
      appointment_reminders_enabled: true,
      language_preference: 'fr'
    });

    testPatient2 = await db.Patient.create({
      first_name: 'Sophie',
      last_name: 'Durand',
      email: 'sophie.durand@example.com',
      is_active: true,
      appointment_reminders_enabled: true,
      language_preference: 'fr'
    });

    // Generate auth token (mock JWT)
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { id: testUser.id, username: testUser.username },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  // ========================================
  // GET /api/campaigns
  // ========================================
  describe('GET /api/campaigns', () => {
    it('returns empty list when no campaigns exist', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('returns list of campaigns', async () => {
      await db.EmailCampaign.create({
        name: 'Test Campaign 1',
        subject: 'Subject 1',
        status: 'draft',
        campaign_type: 'newsletter',
        created_by: testUser.id,
        is_active: true
      });

      await db.EmailCampaign.create({
        name: 'Test Campaign 2',
        subject: 'Subject 2',
        status: 'sent',
        campaign_type: 'promotional',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('filters campaigns by status', async () => {
      await db.EmailCampaign.create({
        name: 'Draft Campaign',
        subject: 'Subject',
        status: 'draft',
        created_by: testUser.id,
        is_active: true
      });

      await db.EmailCampaign.create({
        name: 'Sent Campaign',
        subject: 'Subject',
        status: 'sent',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .get('/api/campaigns?status=draft')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('draft');
    });

    it('filters campaigns by type', async () => {
      await db.EmailCampaign.create({
        name: 'Newsletter',
        subject: 'Subject',
        campaign_type: 'newsletter',
        created_by: testUser.id,
        is_active: true
      });

      await db.EmailCampaign.create({
        name: 'Promotional',
        subject: 'Subject',
        campaign_type: 'promotional',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .get('/api/campaigns?campaign_type=newsletter')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].campaign_type).toBe('newsletter');
    });

    it('searches campaigns by name', async () => {
      await db.EmailCampaign.create({
        name: 'January Newsletter',
        subject: 'Subject',
        created_by: testUser.id,
        is_active: true
      });

      await db.EmailCampaign.create({
        name: 'February Update',
        subject: 'Subject',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .get('/api/campaigns?search=January')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('January');
    });

    it('excludes inactive campaigns', async () => {
      await db.EmailCampaign.create({
        name: 'Active Campaign',
        subject: 'Subject',
        created_by: testUser.id,
        is_active: true
      });

      await db.EmailCampaign.create({
        name: 'Deleted Campaign',
        subject: 'Subject',
        created_by: testUser.id,
        is_active: false
      });

      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Active Campaign');
    });

    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/campaigns');

      expect(response.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/campaigns/:id
  // ========================================
  describe('GET /api/campaigns/:id', () => {
    it('returns campaign by id', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Test Campaign',
        subject: 'Test Subject',
        body_html: '<p>Content</p>',
        status: 'draft',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(campaign.id);
      expect(response.body.data.name).toBe('Test Campaign');
    });

    it('includes creator information', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Test Campaign',
        subject: 'Test Subject',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.creator).toBeDefined();
      expect(response.body.data.creator.first_name).toBe('Campaign');
    });

    it('includes sender information', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Test Campaign',
        subject: 'Test Subject',
        created_by: testUser.id,
        sender_id: testDietitian.id,
        is_active: true
      });

      const response = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.sender).toBeDefined();
      expect(response.body.data.sender.first_name).toBe('Marie');
    });

    it('includes stats', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Test Campaign',
        subject: 'Test Subject',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.total).toBeDefined();
    });

    it('returns 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('returns 404 for inactive campaign', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Deleted Campaign',
        subject: 'Test Subject',
        created_by: testUser.id,
        is_active: false
      });

      const response = await request(app)
        .get(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ========================================
  // POST /api/campaigns
  // ========================================
  describe('POST /api/campaigns', () => {
    it('creates a new campaign', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Campaign',
          subject: 'Welcome to our newsletter',
          body_html: '<p>Hello!</p>',
          campaign_type: 'newsletter'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Campaign');
      expect(response.body.data.status).toBe('draft');
    });

    it('creates campaign with sender_id', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Campaign with Sender',
          subject: 'Test Subject',
          sender_id: testDietitian.id
        });

      expect(response.status).toBe(201);
      expect(response.body.data.sender_id).toBe(testDietitian.id);
    });

    it('creates campaign with target audience', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Targeted Campaign',
          subject: 'Test Subject',
          target_audience: {
            conditions: [
              { field: 'is_active', operator: 'equals', value: true }
            ],
            logic: 'AND'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.target_audience.conditions).toHaveLength(1);
    });

    it('returns 400 without required name', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Test Subject'
        });

      expect(response.status).toBe(400);
    });
  });

  // ========================================
  // PUT /api/campaigns/:id
  // ========================================
  describe('PUT /api/campaigns/:id', () => {
    it('updates campaign', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Original Name',
        subject: 'Original Subject',
        status: 'draft',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .put(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          subject: 'Updated Subject'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.subject).toBe('Updated Subject');
    });

    it('updates sender_id', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Test Campaign',
        subject: 'Test Subject',
        status: 'draft',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .put(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sender_id: testDietitian.id
        });

      expect(response.status).toBe(200);
      expect(response.body.data.sender_id).toBe(testDietitian.id);
    });

    it('cannot update sent campaign', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Sent Campaign',
        subject: 'Test Subject',
        status: 'sent',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .put(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Try to Update'
        });

      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent campaign', async () => {
      const response = await request(app)
        .put('/api/campaigns/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(404);
    });
  });

  // ========================================
  // DELETE /api/campaigns/:id
  // ========================================
  describe('DELETE /api/campaigns/:id', () => {
    it('soft deletes campaign', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'To Delete',
        subject: 'Test Subject',
        status: 'draft',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .delete(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete
      const deleted = await db.EmailCampaign.findByPk(campaign.id);
      expect(deleted.is_active).toBe(false);
    });

    it('cannot delete sending campaign', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Sending Campaign',
        subject: 'Test Subject',
        status: 'sending',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .delete(`/api/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent campaign', async () => {
      const response = await request(app)
        .delete('/api/campaigns/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ========================================
  // POST /api/campaigns/:id/duplicate
  // ========================================
  describe('POST /api/campaigns/:id/duplicate', () => {
    it('duplicates campaign', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'Original Campaign',
        subject: 'Original Subject',
        body_html: '<p>Content</p>',
        campaign_type: 'newsletter',
        created_by: testUser.id,
        is_active: true
      });

      const response = await request(app)
        .post(`/api/campaigns/${campaign.id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.data.name).toContain('copie');
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.body_html).toBe(campaign.body_html);
    });
  });

  // ========================================
  // POST /api/campaigns/preview-audience
  // ========================================
  describe('POST /api/campaigns/preview-audience', () => {
    it('previews audience for criteria', async () => {
      const response = await request(app)
        .post('/api/campaigns/preview-audience')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          criteria: {
            conditions: [
              { field: 'is_active', operator: 'equals', value: true }
            ],
            logic: 'AND'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBeDefined();
      expect(response.body.data.sample).toBeDefined();
    });
  });

  // ========================================
  // Tracking Endpoints
  // ========================================
  describe('Tracking Endpoints', () => {
    let campaign;
    let recipient;

    beforeEach(async () => {
      campaign = await db.EmailCampaign.create({
        name: 'Tracking Test',
        subject: 'Test',
        status: 'sent',
        created_by: testUser.id,
        is_active: true
      });

      recipient = await db.EmailCampaignRecipient.create({
        campaign_id: campaign.id,
        patient_id: testPatient1.id,
        email: testPatient1.email,
        status: 'sent',
        sent_at: new Date()
      });
    });

    it('GET /api/campaigns/track/open/:campaignId/:patientId returns 1x1 pixel', async () => {
      const response = await request(app)
        .get(`/api/campaigns/track/open/${campaign.id}/${testPatient1.id}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/gif');
    });

    it('GET /api/campaigns/track/click/:campaignId/:patientId redirects', async () => {
      const targetUrl = 'https://example.com/page';

      const response = await request(app)
        .get(`/api/campaigns/track/click/${campaign.id}/${testPatient1.id}?url=${encodeURIComponent(targetUrl)}`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(targetUrl);
    });
  });
});
