/**
 * Expense Service Tests
 * Tests for expense.service.js — RBAC scoping, CRUD, filters, and summary logic.
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let db;
let expenseService;
let adminAuth, dietitianAuth;

// ---------------------------------------------------------------------------
// Helper: create a minimal valid expense in the database
// ---------------------------------------------------------------------------
async function createTestExpense(userId, overrides = {}) {
  return db.Expense.create({
    description: 'Test Office Rent',
    amount: 1500.00,
    category: 'RENT',
    expense_date: '2024-01-15',
    created_by: userId,
    is_active: true,
    ...overrides
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('Expense Service', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    expenseService = require('../../src/services/expense.service');
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

  // =========================================================================
  // getExpenses
  // =========================================================================
  describe('getExpenses', () => {
    it('should return all expenses to an admin (no scope filter)', async () => {
      const anotherDietitian = await testAuth.createDietitian();
      await createTestExpense(adminAuth.user.id);
      await createTestExpense(dietitianAuth.user.id);
      await createTestExpense(anotherDietitian.user.id);

      const result = await expenseService.getExpenses(adminAuth.user);

      expect(result).toHaveProperty('expenses');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages');
      expect(result.total).toBe(3);
    });

    it('should return only own expenses to a dietitian (RBAC scoping by created_by)', async () => {
      const anotherDietitian = await testAuth.createDietitian();
      await createTestExpense(dietitianAuth.user.id, { description: 'My expense' });
      await createTestExpense(anotherDietitian.user.id, { description: 'Other expense' });

      const result = await expenseService.getExpenses(dietitianAuth.user);

      expect(result.total).toBe(1);
      expect(result.expenses[0].created_by).toBe(dietitianAuth.user.id);
    });

    it('should return empty list for a dietitian with no expenses', async () => {
      // dietitianAuth has no expenses at all
      const result = await expenseService.getExpenses(dietitianAuth.user);

      expect(result.expenses).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should filter by category', async () => {
      await createTestExpense(adminAuth.user.id, { category: 'RENT', description: 'Rent expense' });
      await createTestExpense(adminAuth.user.id, { category: 'SOFTWARE', description: 'Software expense' });
      await createTestExpense(adminAuth.user.id, { category: 'RENT', description: 'Another rent' });

      const result = await expenseService.getExpenses(adminAuth.user, { category: 'RENT' });

      expect(result.total).toBe(2);
      result.expenses.forEach(e => expect(e.category).toBe('RENT'));
    });

    it('should filter by start_date', async () => {
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-01-10' });
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-03-20' });
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-06-01' });

      const result = await expenseService.getExpenses(adminAuth.user, { start_date: '2024-03-01' });

      expect(result.total).toBe(2);
      result.expenses.forEach(e => expect(e.expense_date >= '2024-03-01').toBe(true));
    });

    it('should filter by end_date', async () => {
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-01-10' });
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-03-20' });
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-06-01' });

      const result = await expenseService.getExpenses(adminAuth.user, { end_date: '2024-02-28' });

      expect(result.total).toBe(1);
      expect(result.expenses[0].expense_date).toBe('2024-01-10');
    });

    it('should filter by date range (start_date + end_date)', async () => {
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-01-10' });
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-03-15' });
      await createTestExpense(adminAuth.user.id, { expense_date: '2024-06-01' });

      const result = await expenseService.getExpenses(adminAuth.user, {
        start_date: '2024-02-01',
        end_date: '2024-04-30'
      });

      expect(result.total).toBe(1);
      expect(result.expenses[0].expense_date).toBe('2024-03-15');
    });

    it('should filter by search term in description', async () => {
      await createTestExpense(adminAuth.user.id, { description: 'Monthly office rent payment' });
      await createTestExpense(adminAuth.user.id, { description: 'Adobe software subscription' });
      await createTestExpense(adminAuth.user.id, { description: 'Quarterly office cleaning' });

      const result = await expenseService.getExpenses(adminAuth.user, { search: 'office' });

      expect(result.total).toBe(2);
      result.expenses.forEach(e =>
        expect(e.description.toLowerCase()).toContain('office')
      );
    });

    it('should filter by search term in vendor', async () => {
      await createTestExpense(adminAuth.user.id, {
        description: 'Subscription fee',
        vendor: 'Adobe Systems'
      });
      await createTestExpense(adminAuth.user.id, {
        description: 'Another fee',
        vendor: 'Google LLC'
      });

      const result = await expenseService.getExpenses(adminAuth.user, { search: 'Adobe' });

      expect(result.total).toBe(1);
      expect(result.expenses[0].vendor).toBe('Adobe Systems');
    });

    it('should apply pagination correctly', async () => {
      for (let i = 1; i <= 5; i++) {
        await createTestExpense(adminAuth.user.id, {
          description: `Expense ${i}`,
          expense_date: `2024-0${i}-01`
        });
      }

      const page1 = await expenseService.getExpenses(adminAuth.user, { page: 1, limit: 2 });
      const page2 = await expenseService.getExpenses(adminAuth.user, { page: 2, limit: 2 });

      expect(page1.expenses.length).toBe(2);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);

      expect(page2.expenses.length).toBe(2);
      expect(page2.page).toBe(2);

      // Pages should contain different records
      const page1Ids = page1.expenses.map(e => e.id);
      const page2Ids = page2.expenses.map(e => e.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('should include creator user information in each expense', async () => {
      await createTestExpense(adminAuth.user.id);

      const result = await expenseService.getExpenses(adminAuth.user);

      expect(result.expenses[0].creator).toBeDefined();
      expect(result.expenses[0].creator.id).toBe(adminAuth.user.id);
      expect(result.expenses[0].creator.username).toBeDefined();
    });

    it('should not include soft-deleted (is_active=false) expenses', async () => {
      await createTestExpense(adminAuth.user.id, { is_active: true, description: 'Active expense' });
      await createTestExpense(adminAuth.user.id, { is_active: false, description: 'Deleted expense' });

      const result = await expenseService.getExpenses(adminAuth.user);

      expect(result.total).toBe(1);
      expect(result.expenses[0].description).toBe('Active expense');
    });
  });

  // =========================================================================
  // getExpenseById
  // =========================================================================
  describe('getExpenseById', () => {
    let adminExpense;
    let dietitianExpense;

    beforeEach(async () => {
      adminExpense = await createTestExpense(adminAuth.user.id, { description: 'Admin expense' });
      dietitianExpense = await createTestExpense(dietitianAuth.user.id, { description: 'Dietitian expense' });
    });

    it('should return any expense to an admin', async () => {
      const result = await expenseService.getExpenseById(dietitianExpense.id, adminAuth.user);

      expect(result.id).toBe(dietitianExpense.id);
      expect(result.description).toBe('Dietitian expense');
    });

    it('should return own expense to a dietitian', async () => {
      const result = await expenseService.getExpenseById(dietitianExpense.id, dietitianAuth.user);

      expect(result.id).toBe(dietitianExpense.id);
      expect(result.created_by).toBe(dietitianAuth.user.id);
    });

    it('should deny access when dietitian tries to access another dietitian expense', async () => {
      const otherDietitian = await testAuth.createDietitian();
      const otherExpense = await createTestExpense(otherDietitian.user.id);

      // The service scopes by created_by, so the row appears not found (404) for the
      // requesting dietitian — it is not visible to them at all.
      await expect(
        expenseService.getExpenseById(otherExpense.id, dietitianAuth.user)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when expense does not exist', async () => {
      await expect(
        expenseService.getExpenseById('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when expense is soft-deleted', async () => {
      const softDeleted = await createTestExpense(adminAuth.user.id, { is_active: false });

      await expect(
        expenseService.getExpenseById(softDeleted.id, adminAuth.user)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should include creator info', async () => {
      const result = await expenseService.getExpenseById(adminExpense.id, adminAuth.user);

      expect(result.creator).toBeDefined();
      expect(result.creator.id).toBe(adminAuth.user.id);
    });
  });

  // =========================================================================
  // createExpense
  // =========================================================================
  describe('createExpense', () => {
    it('should create an expense with all required fields', async () => {
      const data = {
        description: 'Server hosting invoice',
        amount: 299.99,
        category: 'SOFTWARE',
        expense_date: '2024-02-01'
      };

      const result = await expenseService.createExpense(adminAuth.user, data);

      expect(result.id).toBeDefined();
      expect(result.description).toBe('Server hosting invoice');
      expect(parseFloat(result.amount)).toBeCloseTo(299.99, 1);
      expect(result.category).toBe('SOFTWARE');
      expect(result.expense_date).toBe('2024-02-01');
    });

    it('should set created_by to the calling user id', async () => {
      const data = {
        description: 'Office supplies',
        amount: 45.00,
        category: 'SUPPLIES',
        expense_date: '2024-02-10'
      };

      const result = await expenseService.createExpense(dietitianAuth.user, data);

      expect(result.created_by).toBe(dietitianAuth.user.id);
    });

    it('should persist optional fields (vendor, notes, receipt_url)', async () => {
      const data = {
        description: 'Insurance premium',
        amount: 800.00,
        category: 'INSURANCE',
        expense_date: '2024-03-01',
        vendor: 'AXA Assurances',
        notes: 'Annual renewal',
        receipt_url: 'https://example.com/receipt.pdf'
      };

      const result = await expenseService.createExpense(adminAuth.user, data);

      expect(result.vendor).toBe('AXA Assurances');
      expect(result.notes).toBe('Annual renewal');
      expect(result.receipt_url).toBe('https://example.com/receipt.pdf');
    });

    it('should default is_active to true on creation', async () => {
      const data = {
        description: 'Training course',
        amount: 150.00,
        category: 'TRAINING',
        expense_date: '2024-04-01'
      };

      const result = await expenseService.createExpense(adminAuth.user, data);

      expect(result.is_active).toBe(true);
    });

    it('should return the created expense object', async () => {
      const data = {
        description: 'Utility bill',
        amount: 120.00,
        category: 'UTILITIES',
        expense_date: '2024-01-20'
      };

      const result = await expenseService.createExpense(adminAuth.user, data);

      expect(result).toBeDefined();
      // Sequelize model instances have a PascalCase constructor name
      expect(result.constructor.name).toBe('Expense');
    });

    it('should support all valid category values', async () => {
      const categories = [
        'RENT', 'EQUIPMENT', 'SOFTWARE', 'INSURANCE', 'TRAINING',
        'MARKETING', 'UTILITIES', 'STAFF', 'PROFESSIONAL_FEES',
        'SUPPLIES', 'TRAVEL', 'OTHER'
      ];

      for (const category of categories) {
        const result = await expenseService.createExpense(adminAuth.user, {
          description: `Test ${category}`,
          amount: 100.00,
          category,
          expense_date: '2024-05-01'
        });
        expect(result.category).toBe(category);
      }
    });
  });

  // =========================================================================
  // updateExpense
  // =========================================================================
  describe('updateExpense', () => {
    let adminExpense;
    let dietitianExpense;

    beforeEach(async () => {
      adminExpense = await createTestExpense(adminAuth.user.id, {
        description: 'Original description',
        amount: 500.00
      });
      dietitianExpense = await createTestExpense(dietitianAuth.user.id, {
        description: 'Dietitian original',
        amount: 200.00
      });
    });

    it('should update description and amount', async () => {
      const result = await expenseService.updateExpense(
        adminExpense.id,
        adminAuth.user,
        { description: 'Updated description', amount: 750.00 }
      );

      expect(result.description).toBe('Updated description');
      expect(parseFloat(result.amount)).toBeCloseTo(750.00, 1);
    });

    it('should allow admin to update any expense', async () => {
      const result = await expenseService.updateExpense(
        dietitianExpense.id,
        adminAuth.user,
        { description: 'Admin updated this' }
      );

      expect(result.description).toBe('Admin updated this');
    });

    it('should allow a dietitian to update their own expense', async () => {
      const result = await expenseService.updateExpense(
        dietitianExpense.id,
        dietitianAuth.user,
        { notes: 'My updated note' }
      );

      expect(result.notes).toBe('My updated note');
    });

    it('should deny access when dietitian tries to update another dietitian expense', async () => {
      const otherDietitian = await testAuth.createDietitian();
      const otherExpense = await createTestExpense(otherDietitian.user.id);

      // The service scopes by created_by, so the row appears not found (404) for the
      // requesting dietitian — it is not in their scope.
      await expect(
        expenseService.updateExpense(otherExpense.id, dietitianAuth.user, { description: 'Hack' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 for a non-existent expense', async () => {
      await expect(
        expenseService.updateExpense(
          '00000000-0000-0000-0000-000000000000',
          adminAuth.user,
          { description: 'Ghost' }
        )
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when targeting a soft-deleted expense', async () => {
      const deleted = await createTestExpense(adminAuth.user.id, { is_active: false });

      await expect(
        expenseService.updateExpense(deleted.id, adminAuth.user, { description: 'Update' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // =========================================================================
  // deleteExpense (soft delete)
  // =========================================================================
  describe('deleteExpense', () => {
    let expense;

    beforeEach(async () => {
      expense = await createTestExpense(adminAuth.user.id);
    });

    it('should soft-delete by setting is_active to false', async () => {
      await expenseService.deleteExpense(expense.id, adminAuth.user);

      await expense.reload();
      expect(expense.is_active).toBe(false);
    });

    it('should return a success message', async () => {
      const result = await expenseService.deleteExpense(expense.id, adminAuth.user);

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });

    it('should throw 404 for a non-existent expense', async () => {
      await expect(
        expenseService.deleteExpense('00000000-0000-0000-0000-000000000000', adminAuth.user)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when expense is already soft-deleted', async () => {
      await expense.update({ is_active: false });

      await expect(
        expenseService.deleteExpense(expense.id, adminAuth.user)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should exclude soft-deleted expense from subsequent getExpenses calls', async () => {
      const before = await expenseService.getExpenses(adminAuth.user);
      expect(before.total).toBe(1);

      await expenseService.deleteExpense(expense.id, adminAuth.user);

      const after = await expenseService.getExpenses(adminAuth.user);
      expect(after.total).toBe(0);
    });

    it('should allow admin to delete any expense', async () => {
      const dietitianExpense = await createTestExpense(dietitianAuth.user.id);
      const result = await expenseService.deleteExpense(dietitianExpense.id, adminAuth.user);

      expect(result).toHaveProperty('message');
      await dietitianExpense.reload();
      expect(dietitianExpense.is_active).toBe(false);
    });
  });

  // =========================================================================
  // getExpenseSummary
  // =========================================================================
  describe('getExpenseSummary', () => {
    beforeEach(async () => {
      // Create a set of expenses with different categories and months
      await createTestExpense(adminAuth.user.id, {
        category: 'RENT',
        amount: 1000.00,
        expense_date: '2024-01-15'
      });
      await createTestExpense(adminAuth.user.id, {
        category: 'RENT',
        amount: 500.00,
        expense_date: '2024-02-15'
      });
      await createTestExpense(adminAuth.user.id, {
        category: 'SOFTWARE',
        amount: 200.00,
        expense_date: '2024-01-20'
      });
      await createTestExpense(adminAuth.user.id, {
        category: 'UTILITIES',
        amount: 150.00,
        expense_date: '2024-02-10'
      });
    });

    it('should return byCategory array with aggregated totals', async () => {
      const result = await expenseService.getExpenseSummary(adminAuth.user);

      expect(result).toHaveProperty('byCategory');
      expect(Array.isArray(result.byCategory)).toBe(true);
      expect(result.byCategory.length).toBeGreaterThanOrEqual(1);

      const rentEntry = result.byCategory.find(c => c.category === 'RENT');
      expect(rentEntry).toBeDefined();
      expect(rentEntry.total).toBeCloseTo(1500.00, 1);
      expect(rentEntry.count).toBe(2);
    });

    it('should return byMonth array with aggregated totals', async () => {
      const result = await expenseService.getExpenseSummary(adminAuth.user);

      expect(result).toHaveProperty('byMonth');
      expect(Array.isArray(result.byMonth)).toBe(true);
      expect(result.byMonth.length).toBeGreaterThanOrEqual(1);

      const janEntry = result.byMonth.find(m => m.month === '2024-01');
      expect(janEntry).toBeDefined();
      expect(janEntry.total).toBeCloseTo(1200.00, 1); // 1000 + 200
      expect(janEntry.count).toBe(2);
    });

    it('should return a global total across all expenses', async () => {
      const result = await expenseService.getExpenseSummary(adminAuth.user);

      expect(result).toHaveProperty('total');
      // 1000 + 500 + 200 + 150 = 1850
      expect(result.total).toBeCloseTo(1850.00, 1);
    });

    it('should include all expenses for admin (no RBAC filter)', async () => {
      await createTestExpense(dietitianAuth.user.id, {
        category: 'TRAVEL',
        amount: 300.00,
        expense_date: '2024-03-05'
      });

      const result = await expenseService.getExpenseSummary(adminAuth.user);

      // Total should include the dietitian's expense too: 1850 + 300 = 2150
      expect(result.total).toBeCloseTo(2150.00, 1);
    });

    it('should scope summary to own expenses for a dietitian', async () => {
      // dietitianAuth has no expenses created above (all were by admin)
      const result = await expenseService.getExpenseSummary(dietitianAuth.user);

      expect(result.byCategory).toEqual([]);
      expect(result.byMonth).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return a dietitian summary for only their own expenses', async () => {
      const myExpense = await createTestExpense(dietitianAuth.user.id, {
        category: 'TRAVEL',
        amount: 80.00,
        expense_date: '2024-01-10'
      });

      const result = await expenseService.getExpenseSummary(dietitianAuth.user);

      expect(result.total).toBeCloseTo(80.00, 1);
      expect(result.byCategory).toHaveLength(1);
      expect(result.byCategory[0].category).toBe('TRAVEL');
    });

    it('should filter summary by date range', async () => {
      const result = await expenseService.getExpenseSummary(adminAuth.user, {
        start_date: '2024-02-01',
        end_date: '2024-02-28'
      });

      // Only the two February expenses (500 + 150 = 650)
      expect(result.total).toBeCloseTo(650.00, 1);
    });

    it('should return numeric values (not strings) for total and count fields', async () => {
      const result = await expenseService.getExpenseSummary(adminAuth.user);

      expect(typeof result.total).toBe('number');
      result.byCategory.forEach(entry => {
        expect(typeof entry.total).toBe('number');
        expect(typeof entry.count).toBe('number');
      });
      result.byMonth.forEach(entry => {
        expect(typeof entry.total).toBe('number');
        expect(typeof entry.count).toBe('number');
      });
    });

    it('should return empty summary structure (not an error) when no expenses exist', async () => {
      // No expenses in this fresh context
      const freshAdmin = await testAuth.createAdmin();
      // Reset to wipe all expenses seeded above, then re-seed base data
      await testDb.reset();
      await testDb.seedBaseData();
      // Recreate admins (reset wiped them)
      const cleanAdmin = await testAuth.createAdmin();

      const result = await expenseService.getExpenseSummary(cleanAdmin.user);

      expect(result.byCategory).toEqual([]);
      expect(result.byMonth).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
