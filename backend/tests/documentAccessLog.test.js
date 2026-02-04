/**
 * DocumentAccessLog Model Tests
 * Tests for the DocumentAccessLog model functionality
 */

const testDb = require('./setup/testDb');

describe('DocumentAccessLog Model', () => {
  let db;
  let testUser;
  let testPatient;
  let testDocument;
  let testShare;

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

    // Create test user
    const adminRole = await db.Role.findOne({ where: { name: 'ADMIN' } });
    testUser = await db.User.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User',
      role_id: adminRole.id,
      is_active: true
    });

    // Create test patient
    testPatient = await db.Patient.create({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      is_active: true
    });

    // Create test document
    testDocument = await db.Document.create({
      resource_type: 'patient',
      resource_id: testPatient.id,
      file_name: 'test-document.pdf',
      file_path: 'patient/2024-01-15/test-document.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      uploaded_by: testUser.id,
      is_active: true
    });

    // Create test share
    testShare = await db.DocumentShare.create({
      document_id: testDocument.id,
      patient_id: testPatient.id,
      shared_by: testUser.id,
      sent_via: 'link',
      share_token: 'a'.repeat(64),
      is_active: true
    });
  });

  // ========================================
  // Basic CRUD Tests
  // ========================================
  describe('CRUD Operations', () => {
    it('creates an access log with required fields', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'view',
        success: true
      });

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.document_share_id).toBe(testShare.id);
      expect(log.action).toBe('view');
      expect(log.success).toBe(true);
    });

    it('creates an access log with all fields', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        action: 'download',
        success: true
      });

      expect(log.ip_address).toBe('192.168.1.100');
      expect(log.user_agent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('retrieves access logs', async () => {
      await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'view',
        success: true
      });

      const logs = await db.DocumentAccessLog.findAll({
        where: { document_share_id: testShare.id }
      });

      expect(logs.length).toBe(1);
    });
  });

  // ========================================
  // Action Type Tests
  // ========================================
  describe('Action Types', () => {
    it('accepts view action', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'view',
        success: true
      });

      expect(log.action).toBe('view');
    });

    it('accepts download action', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'download',
        success: true
      });

      expect(log.action).toBe('download');
    });

    it('accepts password_attempt action', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'password_attempt',
        success: false
      });

      expect(log.action).toBe('password_attempt');
    });

    // SQLite does not enforce ENUM constraints — skip this test in SQLite
    it.skip('rejects invalid action type (PostgreSQL only)', async () => {
      await expect(db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'invalid_action',
        success: true
      })).rejects.toThrow();
    });
  });

  // ========================================
  // Success Flag Tests
  // ========================================
  describe('Success Flag', () => {
    it('records successful access', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'download',
        success: true
      });

      expect(log.success).toBe(true);
    });

    it('records failed access', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'password_attempt',
        success: false
      });

      expect(log.success).toBe(false);
    });

    it('defaults success to true', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'view'
      });

      expect(log.success).toBe(true);
    });
  });

  // ========================================
  // IP Address Tests
  // ========================================
  describe('IP Address', () => {
    it('stores IPv4 addresses', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        ip_address: '192.168.1.1',
        action: 'view',
        success: true
      });

      expect(log.ip_address).toBe('192.168.1.1');
    });

    it('stores IPv6 addresses', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        ip_address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        action: 'view',
        success: true
      });

      expect(log.ip_address).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('allows null ip_address', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        ip_address: null,
        action: 'view',
        success: true
      });

      expect(log.ip_address).toBeNull();
    });
  });

  // ========================================
  // Association Tests
  // ========================================
  describe('Associations', () => {
    it('belongs to DocumentShare', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'view',
        success: true
      });

      const logWithShare = await db.DocumentAccessLog.findByPk(log.id, {
        include: [{ model: db.DocumentShare, as: 'documentShare' }]
      });

      expect(logWithShare.documentShare).toBeDefined();
      expect(logWithShare.documentShare.id).toBe(testShare.id);
    });

    it('can access document through share', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'download',
        success: true
      });

      const logWithShare = await db.DocumentAccessLog.findByPk(log.id, {
        include: [{
          model: db.DocumentShare,
          as: 'documentShare',
          include: [{ model: db.Document, as: 'document' }]
        }]
      });

      expect(logWithShare.documentShare.document).toBeDefined();
      expect(logWithShare.documentShare.document.file_name).toBe('test-document.pdf');
    });
  });

  // ========================================
  // Timestamp Tests
  // ========================================
  describe('Timestamps', () => {
    it('sets created_at automatically', async () => {
      const before = new Date();

      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'view',
        success: true
      });

      const after = new Date();

      expect(log.created_at).toBeDefined();
      expect(new Date(log.created_at).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(log.created_at).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('does not have updated_at field', async () => {
      const log = await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        action: 'view',
        success: true
      });

      // DocumentAccessLog model is configured with updatedAt: false
      expect(log.updated_at).toBeUndefined();
    });
  });

  // ========================================
  // Query Tests
  // ========================================
  describe('Queries', () => {
    beforeEach(async () => {
      // Create multiple logs
      await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        ip_address: '192.168.1.1',
        action: 'view',
        success: true
      });

      await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        ip_address: '192.168.1.2',
        action: 'download',
        success: true
      });

      await db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        ip_address: '192.168.1.3',
        action: 'password_attempt',
        success: false
      });
    });

    it('filters by action type', async () => {
      const downloads = await db.DocumentAccessLog.findAll({
        where: { action: 'download' }
      });

      expect(downloads.length).toBe(1);
    });

    it('filters by success status', async () => {
      const failed = await db.DocumentAccessLog.findAll({
        where: { success: false }
      });

      expect(failed.length).toBe(1);
      expect(failed[0].action).toBe('password_attempt');
    });

    it('filters by ip_address', async () => {
      const fromIp = await db.DocumentAccessLog.findAll({
        where: { ip_address: '192.168.1.1' }
      });

      expect(fromIp.length).toBe(1);
      expect(fromIp[0].action).toBe('view');
    });

    it('orders by created_at', async () => {
      const logs = await db.DocumentAccessLog.findAll({
        order: [['created_at', 'DESC']]
      });

      expect(logs.length).toBe(3);
      // Most recent should be first
      expect(logs[0].action).toBe('password_attempt');
    });

    it('counts logs by action', async () => {
      const viewCount = await db.DocumentAccessLog.count({
        where: { action: 'view' }
      });

      const downloadCount = await db.DocumentAccessLog.count({
        where: { action: 'download' }
      });

      const passwordCount = await db.DocumentAccessLog.count({
        where: { action: 'password_attempt' }
      });

      expect(viewCount).toBe(1);
      expect(downloadCount).toBe(1);
      expect(passwordCount).toBe(1);
    });
  });

  // ========================================
  // Field Validation Tests
  // ========================================
  describe('Field Validation', () => {
    it('requires document_share_id', async () => {
      await expect(db.DocumentAccessLog.create({
        action: 'view',
        success: true
      })).rejects.toThrow();
    });

    it('requires action', async () => {
      await expect(db.DocumentAccessLog.create({
        document_share_id: testShare.id,
        success: true
      })).rejects.toThrow();
    });
  });
});
