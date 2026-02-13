/**
 * AccountingEntry Service Tests
 * Tests for accounting entry CRUD, sign enforcement, RBAC scoping, summary
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let db;
let accountingEntryService;

describe('AccountingEntry Service', () => {
  let adminAuth, dietitianAuth, assistantAuth;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    accountingEntryService = require('../../src/services/accountingEntry.service');
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

  // ========================================
  // createEntry — sign enforcement
  // ========================================
  describe('createEntry', () => {
    it('should create a CREDIT entry with positive amount', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Refund received',
        amount: 100,
        entry_type: 'CREDIT',
        entry_date: '2026-02-01',
        category: 'REFUND'
      });

      expect(entry.id).toBeDefined();
      expect(parseFloat(entry.amount)).toBe(100);
      expect(entry.entry_type).toBe('CREDIT');
      expect(entry.description).toBe('Refund received');
      expect(entry.category).toBe('REFUND');
      expect(entry.created_by).toBe(adminAuth.user.id);
    });

    it('should force CREDIT amount to positive even if negative given', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Negative credit test',
        amount: -250,
        entry_type: 'CREDIT',
        entry_date: '2026-02-01'
      });

      expect(parseFloat(entry.amount)).toBe(250);
    });

    it('should create a DEBIT entry with negative amount', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Bank fee',
        amount: 50,
        entry_type: 'DEBIT',
        entry_date: '2026-02-01',
        category: 'BANK_FEE'
      });

      expect(parseFloat(entry.amount)).toBe(-50);
      expect(entry.entry_type).toBe('DEBIT');
    });

    it('should force DEBIT amount to negative even if positive given', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Positive debit test',
        amount: 75,
        entry_type: 'DEBIT',
        entry_date: '2026-02-01'
      });

      expect(parseFloat(entry.amount)).toBe(-75);
    });

    it('should force DEBIT amount to negative even if already negative', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Already negative debit',
        amount: -30,
        entry_type: 'DEBIT',
        entry_date: '2026-02-01'
      });

      expect(parseFloat(entry.amount)).toBe(-30);
    });

    it('should allow dietitian to create entries', async () => {
      const entry = await accountingEntryService.createEntry(dietitianAuth.user, {
        description: 'Dietitian adjustment',
        amount: 200,
        entry_type: 'CREDIT',
        entry_date: '2026-02-01'
      });

      expect(entry.created_by).toBe(dietitianAuth.user.id);
    });

    it('should store optional fields (reference, notes, category)', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Full entry',
        amount: 500,
        entry_type: 'CREDIT',
        entry_date: '2026-03-15',
        category: 'ADJUSTMENT',
        reference: 'REF-001',
        notes: 'Special adjustment'
      });

      expect(entry.reference).toBe('REF-001');
      expect(entry.notes).toBe('Special adjustment');
      expect(entry.category).toBe('ADJUSTMENT');
    });
  });

  // ========================================
  // getEntries — pagination & filters
  // ========================================
  describe('getEntries', () => {
    beforeEach(async () => {
      // Create several entries
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Credit 1', amount: 100, entry_type: 'CREDIT', entry_date: '2026-01-15', category: 'ADJUSTMENT'
      });
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Debit 1', amount: 50, entry_type: 'DEBIT', entry_date: '2026-02-10', category: 'BANK_FEE'
      });
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Credit 2', amount: 200, entry_type: 'CREDIT', entry_date: '2026-02-20', reference: 'REF-SEARCH'
      });
    });

    it('should return paginated entries for admin', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user);

      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('total', 3);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages', 1);
      expect(result.entries.length).toBe(3);
    });

    it('should include creator in entries', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user);

      result.entries.forEach(entry => {
        expect(entry.creator).toBeDefined();
        expect(entry.creator.username).toBeDefined();
      });
    });

    it('should filter by entry_type', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user, { entry_type: 'CREDIT' });

      expect(result.total).toBe(2);
      result.entries.forEach(entry => {
        expect(entry.entry_type).toBe('CREDIT');
      });
    });

    it('should filter by category', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user, { category: 'BANK_FEE' });

      expect(result.total).toBe(1);
      expect(result.entries[0].category).toBe('BANK_FEE');
    });

    it('should filter by search (description)', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user, { search: 'Credit 1' });

      expect(result.total).toBe(1);
      expect(result.entries[0].description).toBe('Credit 1');
    });

    it('should filter by search (reference)', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user, { search: 'REF-SEARCH' });

      expect(result.total).toBe(1);
      expect(result.entries[0].reference).toBe('REF-SEARCH');
    });

    it('should filter by date range', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user, {
        start_date: '2026-02-01',
        end_date: '2026-02-28'
      });

      expect(result.total).toBe(2);
    });

    it('should apply pagination', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user, { page: 1, limit: 2 });

      expect(result.entries.length).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should order by entry_date DESC', async () => {
      const result = await accountingEntryService.getEntries(adminAuth.user);

      const dates = result.entries.map(e => e.entry_date);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1] >= dates[i]).toBe(true);
      }
    });
  });

  // ========================================
  // RBAC scoping
  // ========================================
  describe('RBAC scoping', () => {
    it('should let admin see all entries', async () => {
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Admin entry', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });
      await accountingEntryService.createEntry(dietitianAuth.user, {
        description: 'Dietitian entry', amount: 200, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      const result = await accountingEntryService.getEntries(adminAuth.user);
      expect(result.total).toBe(2);
    });

    it('should let dietitian see only their own entries', async () => {
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Admin entry', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });
      await accountingEntryService.createEntry(dietitianAuth.user, {
        description: 'Dietitian entry', amount: 200, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      const result = await accountingEntryService.getEntries(dietitianAuth.user);
      expect(result.total).toBe(1);
      expect(result.entries[0].description).toBe('Dietitian entry');
    });

    it('should return empty for assistant with no linked dietitians', async () => {
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Admin entry', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      const result = await accountingEntryService.getEntries(assistantAuth.user);
      expect(result.total).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });

  // ========================================
  // getEntryById
  // ========================================
  describe('getEntryById', () => {
    it('should return entry with creator details', async () => {
      const created = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Test entry', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      const entry = await accountingEntryService.getEntryById(created.id, adminAuth.user);

      expect(entry.id).toBe(created.id);
      expect(entry.creator).toBeDefined();
      expect(entry.creator.id).toBe(adminAuth.user.id);
    });

    it('should throw 404 for non-existent entry', async () => {
      await expect(
        accountingEntryService.getEntryById('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Accounting entry not found');
    });

    it('should throw 404 for soft-deleted entry', async () => {
      const created = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Deleted entry', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      await accountingEntryService.deleteEntry(created.id, adminAuth.user);

      await expect(
        accountingEntryService.getEntryById(created.id, adminAuth.user)
      ).rejects.toThrow('Accounting entry not found');
    });

    it('should deny dietitian access to other users entries', async () => {
      const created = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Admin entry', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      await expect(
        accountingEntryService.getEntryById(created.id, dietitianAuth.user)
      ).rejects.toThrow('Accounting entry not found');
    });
  });

  // ========================================
  // updateEntry
  // ========================================
  describe('updateEntry', () => {
    let testEntry;

    beforeEach(async () => {
      testEntry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Original entry',
        amount: 100,
        entry_type: 'CREDIT',
        entry_date: '2026-02-01',
        category: 'ADJUSTMENT'
      });
    });

    it('should update description and category', async () => {
      const updated = await accountingEntryService.updateEntry(testEntry.id, adminAuth.user, {
        description: 'Updated entry',
        category: 'CORRECTION'
      });

      expect(updated.description).toBe('Updated entry');
      expect(updated.category).toBe('CORRECTION');
    });

    it('should re-enforce sign when amount is updated', async () => {
      const updated = await accountingEntryService.updateEntry(testEntry.id, adminAuth.user, {
        amount: 200
      });

      // Still CREDIT, so amount should be positive
      expect(parseFloat(updated.amount)).toBe(200);
    });

    it('should enforce sign when entry_type changes from CREDIT to DEBIT', async () => {
      const updated = await accountingEntryService.updateEntry(testEntry.id, adminAuth.user, {
        amount: 100,
        entry_type: 'DEBIT'
      });

      expect(parseFloat(updated.amount)).toBe(-100);
      expect(updated.entry_type).toBe('DEBIT');
    });

    it('should throw 404 for non-existent entry', async () => {
      await expect(
        accountingEntryService.updateEntry('00000000-0000-0000-0000-000000000000', adminAuth.user, {
          description: 'nope'
        })
      ).rejects.toThrow('Accounting entry not found');
    });

    it('should deny dietitian from updating other users entries', async () => {
      await expect(
        accountingEntryService.updateEntry(testEntry.id, dietitianAuth.user, {
          description: 'hacked'
        })
      ).rejects.toThrow('Accounting entry not found');
    });
  });

  // ========================================
  // deleteEntry — soft delete
  // ========================================
  describe('deleteEntry', () => {
    it('should soft delete an entry', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'To delete', amount: 50, entry_type: 'DEBIT', entry_date: '2026-02-01'
      });

      const result = await accountingEntryService.deleteEntry(entry.id, adminAuth.user);
      expect(result.message).toBe('Accounting entry deleted successfully');

      // Verify soft delete
      const raw = await db.AccountingEntry.findByPk(entry.id);
      expect(raw.is_active).toBe(false);
    });

    it('should throw 404 for non-existent entry', async () => {
      await expect(
        accountingEntryService.deleteEntry('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toThrow('Accounting entry not found');
    });

    it('should throw 404 for already deleted entry', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Double delete', amount: 10, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      await accountingEntryService.deleteEntry(entry.id, adminAuth.user);

      await expect(
        accountingEntryService.deleteEntry(entry.id, adminAuth.user)
      ).rejects.toThrow('Accounting entry not found');
    });

    it('should not show deleted entries in getEntries', async () => {
      const entry = await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Hidden entry', amount: 100, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });

      await accountingEntryService.deleteEntry(entry.id, adminAuth.user);

      const result = await accountingEntryService.getEntries(adminAuth.user);
      expect(result.total).toBe(0);
    });
  });

  // ========================================
  // getEntrySummary
  // ========================================
  describe('getEntrySummary', () => {
    beforeEach(async () => {
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Credit A', amount: 500, entry_type: 'CREDIT', entry_date: '2026-02-01'
      });
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Credit B', amount: 300, entry_type: 'CREDIT', entry_date: '2026-02-15'
      });
      await accountingEntryService.createEntry(adminAuth.user, {
        description: 'Debit A', amount: 200, entry_type: 'DEBIT', entry_date: '2026-02-10'
      });
    });

    it('should return correct totals', async () => {
      const summary = await accountingEntryService.getEntrySummary(adminAuth.user);

      expect(summary.totalCredits).toBe(800);
      expect(summary.totalDebits).toBe(200);
      expect(summary.netBalance).toBe(600);
    });

    it('should filter by date range', async () => {
      const summary = await accountingEntryService.getEntrySummary(adminAuth.user, {
        start_date: '2026-02-10',
        end_date: '2026-02-28'
      });

      // Credit B (300) + Debit A (200)
      expect(summary.totalCredits).toBe(300);
      expect(summary.totalDebits).toBe(200);
      expect(summary.netBalance).toBe(100);
    });

    it('should return zeros when no entries', async () => {
      // Reset and re-seed without entries
      await testDb.reset();
      await testDb.seedBaseData();
      testAuth.resetCounter();
      const freshAdmin = await testAuth.createAdmin();

      const summary = await accountingEntryService.getEntrySummary(freshAdmin.user);

      expect(summary.totalCredits).toBe(0);
      expect(summary.totalDebits).toBe(0);
      expect(summary.netBalance).toBe(0);
    });

    it('should return zeros for assistant with no access', async () => {
      const summary = await accountingEntryService.getEntrySummary(assistantAuth.user);

      expect(summary.totalCredits).toBe(0);
      expect(summary.totalDebits).toBe(0);
      expect(summary.netBalance).toBe(0);
    });
  });
});
