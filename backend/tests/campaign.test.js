/**
 * Campaign Module Tests
 * Unit tests for EmailCampaign, EmailCampaignRecipient models and services
 */

const testDb = require('./setup/testDb');

describe('Campaign Module', () => {
  let db;
  let testUser;
  let testDietitian;
  let testPatient1;
  let testPatient2;
  let testPatient3;
  let testCampaign;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();

    // Create test users
    const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });

    testUser = await db.User.create({
      username: 'campaignadmin',
      email: 'campaignadmin@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Campaign',
      last_name: 'Admin',
      role_id: adminRole.id,
      is_active: true
    });

    testDietitian = await db.User.create({
      username: 'dietitian1',
      email: 'dietitian1@example.com',
      password_hash: 'hashedpassword',
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
      language_preference: 'fr',
      assigned_dietitian_id: testDietitian.id
    });

    testPatient2 = await db.Patient.create({
      first_name: 'Sophie',
      last_name: 'Durand',
      email: 'sophie.durand@example.com',
      is_active: true,
      appointment_reminders_enabled: true,
      language_preference: 'fr'
    });

    testPatient3 = await db.Patient.create({
      first_name: 'Pierre',
      last_name: 'Leroy',
      email: 'pierre.leroy@example.com',
      is_active: false, // Inactive patient
      appointment_reminders_enabled: false
    });

    // Create test campaign
    testCampaign = await db.EmailCampaign.create({
      name: 'Newsletter Janvier',
      subject: 'Vos conseils nutrition du mois',
      body_html: '<p>Bonjour {{patient_first_name}},</p><p>Voici vos conseils...</p>',
      body_text: 'Bonjour {{patient_first_name}}, Voici vos conseils...',
      status: 'draft',
      campaign_type: 'newsletter',
      target_audience: {
        conditions: [
          { field: 'is_active', operator: 'equals', value: true },
          { field: 'appointment_reminders_enabled', operator: 'equals', value: true }
        ],
        logic: 'AND'
      },
      created_by: testUser.id,
      is_active: true
    });
  });

  // ========================================
  // EmailCampaign Model Tests
  // ========================================
  describe('EmailCampaign Model', () => {
    describe('Creation', () => {
      it('creates a campaign with valid data', async () => {
        const campaign = await db.EmailCampaign.create({
          name: 'Test Campaign',
          subject: 'Test Subject',
          body_html: '<p>Test content</p>',
          status: 'draft',
          campaign_type: 'newsletter',
          created_by: testUser.id,
          is_active: true
        });

        expect(campaign).toBeDefined();
        expect(campaign.id).toBeDefined();
        expect(campaign.name).toBe('Test Campaign');
        expect(campaign.status).toBe('draft');
      });

      it('fails without required name', async () => {
        await expect(db.EmailCampaign.create({
          subject: 'Test Subject',
          status: 'draft',
          campaign_type: 'newsletter',
          created_by: testUser.id
        })).rejects.toThrow();
      });

      it('fails without required subject', async () => {
        await expect(db.EmailCampaign.create({
          name: 'Test Campaign',
          status: 'draft',
          campaign_type: 'newsletter',
          created_by: testUser.id
        })).rejects.toThrow();
      });

      it('creates campaign with sender_id', async () => {
        const campaign = await db.EmailCampaign.create({
          name: 'Campaign with Sender',
          subject: 'Test Subject',
          status: 'draft',
          campaign_type: 'newsletter',
          created_by: testUser.id,
          sender_id: testDietitian.id,
          is_active: true
        });

        expect(campaign.sender_id).toBe(testDietitian.id);
      });

      it('defaults status to draft', async () => {
        const campaign = await db.EmailCampaign.create({
          name: 'Default Status Campaign',
          subject: 'Test Subject',
          campaign_type: 'newsletter',
          created_by: testUser.id,
          is_active: true
        });

        expect(campaign.status).toBe('draft');
      });

      it('defaults campaign_type to newsletter', async () => {
        const campaign = await db.EmailCampaign.create({
          name: 'Default Type Campaign',
          subject: 'Test Subject',
          created_by: testUser.id,
          is_active: true
        });

        expect(campaign.campaign_type).toBe('newsletter');
      });
    });

    describe('Status Validation', () => {
      it('accepts valid status values', async () => {
        const statuses = ['draft', 'scheduled', 'sending', 'sent', 'cancelled'];

        for (const status of statuses) {
          const campaign = await db.EmailCampaign.create({
            name: `Campaign ${status}`,
            subject: 'Test Subject',
            status,
            campaign_type: 'newsletter',
            created_by: testUser.id,
            is_active: true
          });
          expect(campaign.status).toBe(status);
          await campaign.destroy();
        }
      });

      // SQLite does not enforce ENUM constraints — skip this test in SQLite
      it.skip('rejects invalid status value (PostgreSQL only)', async () => {
        await expect(db.EmailCampaign.create({
          name: 'Invalid Status Campaign',
          subject: 'Test Subject',
          status: 'invalid_status',
          campaign_type: 'newsletter',
          created_by: testUser.id
        })).rejects.toThrow();
      });
    });

    describe('Campaign Type Validation', () => {
      it('accepts valid campaign types', async () => {
        const types = ['newsletter', 'promotional', 'educational', 'reminder'];

        for (const type of types) {
          const campaign = await db.EmailCampaign.create({
            name: `Campaign ${type}`,
            subject: 'Test Subject',
            campaign_type: type,
            created_by: testUser.id,
            is_active: true
          });
          expect(campaign.campaign_type).toBe(type);
          await campaign.destroy();
        }
      });

      // SQLite does not enforce ENUM constraints — skip this test in SQLite
      it.skip('rejects invalid campaign type (PostgreSQL only)', async () => {
        await expect(db.EmailCampaign.create({
          name: 'Invalid Type Campaign',
          subject: 'Test Subject',
          campaign_type: 'invalid_type',
          created_by: testUser.id
        })).rejects.toThrow();
      });
    });

    describe('Instance Methods', () => {
      it('canEdit returns true for draft status', async () => {
        testCampaign.status = 'draft';
        expect(testCampaign.canEdit()).toBe(true);
      });

      it('canEdit returns true for scheduled status', async () => {
        testCampaign.status = 'scheduled';
        expect(testCampaign.canEdit()).toBe(true);
      });

      it('canEdit returns false for sending status', async () => {
        testCampaign.status = 'sending';
        expect(testCampaign.canEdit()).toBe(false);
      });

      it('canEdit returns false for sent status', async () => {
        testCampaign.status = 'sent';
        expect(testCampaign.canEdit()).toBe(false);
      });

      it('canSend returns true for draft with content', async () => {
        testCampaign.status = 'draft';
        testCampaign.body_html = '<p>Content</p>';
        testCampaign.subject = 'Subject';
        expect(testCampaign.canSend()).toBeTruthy();
      });

      it('canSend returns false without body_html', async () => {
        testCampaign.status = 'draft';
        testCampaign.body_html = null;
        testCampaign.subject = 'Subject';
        expect(testCampaign.canSend()).toBeFalsy();
      });

      it('canCancel returns true for scheduled', async () => {
        testCampaign.status = 'scheduled';
        expect(testCampaign.canCancel()).toBe(true);
      });

      it('canCancel returns true for sending', async () => {
        testCampaign.status = 'sending';
        expect(testCampaign.canCancel()).toBe(true);
      });

      it('canCancel returns false for draft', async () => {
        testCampaign.status = 'draft';
        expect(testCampaign.canCancel()).toBe(false);
      });
    });

    describe('Associations', () => {
      it('belongs to creator (User)', async () => {
        const campaign = await db.EmailCampaign.findByPk(testCampaign.id, {
          include: [{ model: db.User, as: 'creator' }]
        });

        expect(campaign.creator).toBeDefined();
        expect(campaign.creator.id).toBe(testUser.id);
        expect(campaign.creator.first_name).toBe('Campaign');
      });

      it('belongs to sender (User)', async () => {
        await testCampaign.update({ sender_id: testDietitian.id });

        const campaign = await db.EmailCampaign.findByPk(testCampaign.id, {
          include: [{ model: db.User, as: 'sender' }]
        });

        expect(campaign.sender).toBeDefined();
        expect(campaign.sender.id).toBe(testDietitian.id);
        expect(campaign.sender.first_name).toBe('Marie');
      });

      it('has many recipients', async () => {
        // Create recipients
        await db.EmailCampaignRecipient.bulkCreate([
          { campaign_id: testCampaign.id, patient_id: testPatient1.id, email: testPatient1.email, status: 'pending' },
          { campaign_id: testCampaign.id, patient_id: testPatient2.id, email: testPatient2.email, status: 'pending' }
        ]);

        const campaign = await db.EmailCampaign.findByPk(testCampaign.id, {
          include: [{ model: db.EmailCampaignRecipient, as: 'recipients' }]
        });

        expect(campaign.recipients).toBeDefined();
        expect(campaign.recipients).toHaveLength(2);
      });
    });
  });

  // ========================================
  // EmailCampaignRecipient Model Tests
  // ========================================
  describe('EmailCampaignRecipient Model', () => {
    describe('Creation', () => {
      it('creates a recipient with valid data', async () => {
        const recipient = await db.EmailCampaignRecipient.create({
          campaign_id: testCampaign.id,
          patient_id: testPatient1.id,
          email: testPatient1.email,
          status: 'pending'
        });

        expect(recipient).toBeDefined();
        expect(recipient.id).toBeDefined();
        expect(recipient.campaign_id).toBe(testCampaign.id);
        expect(recipient.status).toBe('pending');
      });

      it('defaults status to pending', async () => {
        const recipient = await db.EmailCampaignRecipient.create({
          campaign_id: testCampaign.id,
          patient_id: testPatient1.id,
          email: testPatient1.email
        });

        expect(recipient.status).toBe('pending');
      });
    });

    describe('Status Transitions', () => {
      let recipient;

      beforeEach(async () => {
        recipient = await db.EmailCampaignRecipient.create({
          campaign_id: testCampaign.id,
          patient_id: testPatient1.id,
          email: testPatient1.email,
          status: 'pending'
        });
      });

      it('updates status to sent with sent_at timestamp', async () => {
        await recipient.update({
          status: 'sent',
          sent_at: new Date()
        });

        expect(recipient.status).toBe('sent');
        expect(recipient.sent_at).toBeDefined();
      });

      it('updates status to failed with error_message', async () => {
        await recipient.update({
          status: 'failed',
          error_message: 'SMTP connection failed'
        });

        expect(recipient.status).toBe('failed');
        expect(recipient.error_message).toBe('SMTP connection failed');
      });

      it('tracks opened_at timestamp', async () => {
        const openedAt = new Date();
        await recipient.update({ opened_at: openedAt });

        expect(recipient.opened_at).toEqual(openedAt);
      });

      it('tracks clicked_at timestamp', async () => {
        const clickedAt = new Date();
        await recipient.update({ clicked_at: clickedAt });

        expect(recipient.clicked_at).toEqual(clickedAt);
      });
    });

    describe('Associations', () => {
      it('belongs to campaign', async () => {
        const recipient = await db.EmailCampaignRecipient.create({
          campaign_id: testCampaign.id,
          patient_id: testPatient1.id,
          email: testPatient1.email,
          status: 'pending'
        });

        const loaded = await db.EmailCampaignRecipient.findByPk(recipient.id, {
          include: [{ model: db.EmailCampaign, as: 'campaign' }]
        });

        expect(loaded.campaign).toBeDefined();
        expect(loaded.campaign.id).toBe(testCampaign.id);
        expect(loaded.campaign.name).toBe('Newsletter Janvier');
      });

      it('belongs to patient', async () => {
        const recipient = await db.EmailCampaignRecipient.create({
          campaign_id: testCampaign.id,
          patient_id: testPatient1.id,
          email: testPatient1.email,
          status: 'pending'
        });

        const loaded = await db.EmailCampaignRecipient.findByPk(recipient.id, {
          include: [{ model: db.Patient, as: 'patient' }]
        });

        expect(loaded.patient).toBeDefined();
        expect(loaded.patient.id).toBe(testPatient1.id);
        expect(loaded.patient.first_name).toBe('Jean');
      });
    });
  });

  // ========================================
  // Target Audience JSON Tests
  // ========================================
  describe('Target Audience', () => {
    it('stores and retrieves target_audience as JSON', async () => {
      const targetAudience = {
        conditions: [
          { field: 'is_active', operator: 'equals', value: true },
          { field: 'language_preference', operator: 'in', value: ['fr', 'en'] }
        ],
        logic: 'AND'
      };

      const campaign = await db.EmailCampaign.create({
        name: 'Audience Test',
        subject: 'Test',
        target_audience: targetAudience,
        created_by: testUser.id,
        is_active: true
      });

      const loaded = await db.EmailCampaign.findByPk(campaign.id);
      expect(loaded.target_audience).toEqual(targetAudience);
      expect(loaded.target_audience.conditions).toHaveLength(2);
      expect(loaded.target_audience.logic).toBe('AND');
    });

    it('defaults target_audience to empty object', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'No Audience',
        subject: 'Test',
        created_by: testUser.id,
        is_active: true
      });

      const loaded = await db.EmailCampaign.findByPk(campaign.id);
      expect(loaded.target_audience).toEqual({});
    });
  });

  // ========================================
  // Soft Delete Tests
  // ========================================
  describe('Soft Delete', () => {
    it('soft deletes campaign by setting is_active to false', async () => {
      await testCampaign.update({ is_active: false });

      const deleted = await db.EmailCampaign.findByPk(testCampaign.id);
      expect(deleted.is_active).toBe(false);
    });

    it('excludes inactive campaigns with is_active filter', async () => {
      await testCampaign.update({ is_active: false });

      const activeCampaigns = await db.EmailCampaign.findAll({
        where: { is_active: true }
      });

      expect(activeCampaigns.find(c => c.id === testCampaign.id)).toBeUndefined();
    });
  });

  // ========================================
  // Scheduling Tests
  // ========================================
  describe('Scheduling', () => {
    it('stores scheduled_at timestamp', async () => {
      const scheduledAt = new Date('2025-02-15T10:00:00Z');

      await testCampaign.update({
        status: 'scheduled',
        scheduled_at: scheduledAt
      });

      expect(testCampaign.status).toBe('scheduled');
      expect(testCampaign.scheduled_at).toEqual(scheduledAt);
    });

    it('stores sent_at timestamp when sending', async () => {
      const sentAt = new Date();

      await testCampaign.update({
        status: 'sending',
        sent_at: sentAt
      });

      expect(testCampaign.status).toBe('sending');
      expect(testCampaign.sent_at).toBeDefined();
    });
  });

  // ========================================
  // Recipient Count Tests
  // ========================================
  describe('Recipient Count', () => {
    it('updates recipient_count', async () => {
      await testCampaign.update({ recipient_count: 150 });

      expect(testCampaign.recipient_count).toBe(150);
    });

    it('defaults recipient_count to 0', async () => {
      const campaign = await db.EmailCampaign.create({
        name: 'New Campaign',
        subject: 'Test',
        created_by: testUser.id,
        is_active: true
      });

      expect(campaign.recipient_count).toBe(0);
    });
  });
});
