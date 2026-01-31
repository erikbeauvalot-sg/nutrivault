/**
 * DocumentShare Model Tests
 * Tests for the DocumentShare model instance methods and share link functionality
 */

const testDb = require('./setup/testDb');

describe('DocumentShare Model', () => {
  let db;
  let testUser;
  let testPatient;
  let testDocument;

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
  });

  // ========================================
  // Instance Method Tests
  // ========================================
  describe('isExpired()', () => {
    it('returns false when expires_at is null', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'a'.repeat(64),
        expires_at: null,
        is_active: true
      });

      expect(share.isExpired()).toBe(false);
    });

    it('returns false when expires_at is in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'b'.repeat(64),
        expires_at: futureDate,
        is_active: true
      });

      expect(share.isExpired()).toBe(false);
    });

    it('returns true when expires_at is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'c'.repeat(64),
        expires_at: pastDate,
        is_active: true
      });

      expect(share.isExpired()).toBe(true);
    });
  });

  describe('hasReachedDownloadLimit()', () => {
    it('returns false when max_downloads is null', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'd'.repeat(64),
        max_downloads: null,
        download_count: 100,
        is_active: true
      });

      expect(share.hasReachedDownloadLimit()).toBe(false);
    });

    it('returns false when download_count is below max_downloads', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'e'.repeat(64),
        max_downloads: 10,
        download_count: 5,
        is_active: true
      });

      expect(share.hasReachedDownloadLimit()).toBe(false);
    });

    it('returns true when download_count equals max_downloads', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'f'.repeat(64),
        max_downloads: 10,
        download_count: 10,
        is_active: true
      });

      expect(share.hasReachedDownloadLimit()).toBe(true);
    });

    it('returns true when download_count exceeds max_downloads', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'g'.repeat(64),
        max_downloads: 10,
        download_count: 15,
        is_active: true
      });

      expect(share.hasReachedDownloadLimit()).toBe(true);
    });
  });

  describe('isAccessible()', () => {
    it('returns true when active, not expired, and within download limit', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'h'.repeat(64),
        is_active: true,
        expires_at: futureDate,
        max_downloads: 10,
        download_count: 5
      });

      expect(share.isAccessible()).toBe(true);
    });

    it('returns true when active with no expiration and no download limit', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'i'.repeat(64),
        is_active: true,
        expires_at: null,
        max_downloads: null
      });

      expect(share.isAccessible()).toBe(true);
    });

    it('returns false when is_active is false', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'j'.repeat(64),
        is_active: false,
        expires_at: null,
        max_downloads: null
      });

      expect(share.isAccessible()).toBe(false);
    });

    it('returns false when expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'k'.repeat(64),
        is_active: true,
        expires_at: pastDate,
        max_downloads: null
      });

      expect(share.isAccessible()).toBe(false);
    });

    it('returns false when download limit reached', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'l'.repeat(64),
        is_active: true,
        expires_at: null,
        max_downloads: 5,
        download_count: 5
      });

      expect(share.isAccessible()).toBe(false);
    });

    it('returns false when both expired and download limit reached', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'm'.repeat(64),
        is_active: true,
        expires_at: pastDate,
        max_downloads: 5,
        download_count: 5
      });

      expect(share.isAccessible()).toBe(false);
    });
  });

  // ========================================
  // Association Tests
  // ========================================
  describe('Associations', () => {
    it('belongs to Document', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'n'.repeat(64),
        is_active: true
      });

      const shareWithDoc = await db.DocumentShare.findByPk(share.id, {
        include: [{ model: db.Document, as: 'document' }]
      });

      expect(shareWithDoc.document).toBeDefined();
      expect(shareWithDoc.document.id).toBe(testDocument.id);
      expect(shareWithDoc.document.file_name).toBe('test-document.pdf');
    });

    it('belongs to Patient', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'o'.repeat(64),
        is_active: true
      });

      const shareWithPatient = await db.DocumentShare.findByPk(share.id, {
        include: [{ model: db.Patient, as: 'patient' }]
      });

      expect(shareWithPatient.patient).toBeDefined();
      expect(shareWithPatient.patient.id).toBe(testPatient.id);
      expect(shareWithPatient.patient.first_name).toBe('John');
    });

    it('belongs to User (sharedByUser)', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'p'.repeat(64),
        is_active: true
      });

      const shareWithUser = await db.DocumentShare.findByPk(share.id, {
        include: [{ model: db.User, as: 'sharedByUser' }]
      });

      expect(shareWithUser.sharedByUser).toBeDefined();
      expect(shareWithUser.sharedByUser.id).toBe(testUser.id);
      expect(shareWithUser.sharedByUser.username).toBe('testuser');
    });

    it('has many DocumentAccessLog', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'q'.repeat(64),
        is_active: true
      });

      // Create access logs
      await db.DocumentAccessLog.create({
        document_share_id: share.id,
        ip_address: '192.168.1.1',
        action: 'view',
        success: true
      });

      await db.DocumentAccessLog.create({
        document_share_id: share.id,
        ip_address: '192.168.1.2',
        action: 'download',
        success: true
      });

      const shareWithLogs = await db.DocumentShare.findByPk(share.id, {
        include: [{ model: db.DocumentAccessLog, as: 'accessLogs' }]
      });

      expect(shareWithLogs.accessLogs).toBeDefined();
      expect(shareWithLogs.accessLogs.length).toBe(2);
    });
  });

  // ========================================
  // Field Validation Tests
  // ========================================
  describe('Field validation', () => {
    it('requires document_id', async () => {
      await expect(db.DocumentShare.create({
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'r'.repeat(64)
      })).rejects.toThrow();
    });

    it('requires patient_id', async () => {
      await expect(db.DocumentShare.create({
        document_id: testDocument.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 's'.repeat(64)
      })).rejects.toThrow();
    });

    it('requires shared_by', async () => {
      await expect(db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        sent_via: 'link',
        share_token: 't'.repeat(64)
      })).rejects.toThrow();
    });

    it('enforces unique share_token', async () => {
      const token = 'u'.repeat(64);

      await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      });

      await expect(db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: token,
        is_active: true
      })).rejects.toThrow();
    });

    it('defaults download_count to 0', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'v'.repeat(64),
        is_active: true
      });

      expect(share.download_count).toBe(0);
    });

    it('defaults is_active to true', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        sent_via: 'link',
        share_token: 'w'.repeat(64)
      });

      expect(share.is_active).toBe(true);
    });

    it('defaults sent_via to email', async () => {
      const share = await db.DocumentShare.create({
        document_id: testDocument.id,
        patient_id: testPatient.id,
        shared_by: testUser.id,
        share_token: 'x'.repeat(64)
      });

      expect(share.sent_via).toBe('email');
    });
  });
});
