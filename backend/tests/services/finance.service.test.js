/**
 * Finance Service Tests
 * Tests for finance dashboard (including adjustments), cash flow, aging report
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures, visits: visitFixtures } = require('../fixtures');

let db;
let financeService;

describe('Finance Service', () => {
  let adminAuth, dietitianAuth;
  let testPatient;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    financeService = require('../../src/services/finance.service');
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

    // Create test patient with M2M link
    testPatient = await db.Patient.create({
      ...patientFixtures.validPatient,
      assigned_dietitian_id: dietitianAuth.user.id
    });
    await db.PatientDietitian.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });
  });

  // ========================================
  // getDashboard
  // ========================================
  describe('getDashboard', () => {
    it('should return all KPI fields', async () => {
      const dashboard = await financeService.getDashboard(adminAuth.user);

      expect(dashboard).toHaveProperty('totalRevenue');
      expect(dashboard).toHaveProperty('totalExpenses');
      expect(dashboard).toHaveProperty('totalAdjustments');
      expect(dashboard).toHaveProperty('netProfit');
      expect(dashboard).toHaveProperty('profitMargin');
      expect(dashboard).toHaveProperty('collectionRate');
      expect(dashboard).toHaveProperty('overdueCount');
      expect(dashboard).toHaveProperty('overdueAmount');
      expect(dashboard).toHaveProperty('avgPaymentDays');
      expect(dashboard).toHaveProperty('totalBilled');
    });

    it('should return zeros when no data', async () => {
      const dashboard = await financeService.getDashboard(adminAuth.user);

      expect(dashboard.totalRevenue).toBe(0);
      expect(dashboard.totalExpenses).toBe(0);
      expect(dashboard.totalAdjustments).toBe(0);
      expect(dashboard.netProfit).toBe(0);
    });

    it('should calculate revenue from billing amount_paid', async () => {
      await db.Billing.create({
        invoice_number: 'INV-FIN-001',
        patient_id: testPatient.id,
        service_description: 'Consultation',
        amount_total: 100,
        amount_paid: 80,
        amount_due: 20,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 86400000),
        status: 'SENT',
        is_active: true
      });

      const dashboard = await financeService.getDashboard(adminAuth.user);

      expect(dashboard.totalRevenue).toBe(80);
    });

    it('should calculate expenses from Expense.amount', async () => {
      await db.Expense.create({
        description: 'Office rent',
        amount: 500,
        category: 'RENT',
        expense_date: new Date(),
        created_by: adminAuth.user.id,
        is_active: true
      });

      const dashboard = await financeService.getDashboard(adminAuth.user);

      expect(dashboard.totalExpenses).toBe(500);
    });

    it('should include accounting entry adjustments in dashboard', async () => {
      // Create a CREDIT and a DEBIT entry
      await db.AccountingEntry.create({
        description: 'Refund credit',
        amount: 300,
        entry_type: 'CREDIT',
        entry_date: new Date(),
        created_by: adminAuth.user.id,
        is_active: true
      });
      await db.AccountingEntry.create({
        description: 'Bank fee',
        amount: -100,
        entry_type: 'DEBIT',
        entry_date: new Date(),
        created_by: adminAuth.user.id,
        is_active: true
      });

      const dashboard = await financeService.getDashboard(adminAuth.user);

      // Net adjustment = 300 + (-100) = 200
      expect(dashboard.totalAdjustments).toBe(200);
    });

    it('should calculate netProfit = revenue - expenses + adjustments', async () => {
      // Revenue: 1000 (from billing)
      await db.Billing.create({
        invoice_number: 'INV-FIN-002',
        patient_id: testPatient.id,
        service_description: 'Session',
        amount_total: 1000,
        amount_paid: 1000,
        amount_due: 0,
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 86400000),
        status: 'PAID',
        is_active: true
      });

      // Expense: 400
      await db.Expense.create({
        description: 'Software',
        amount: 400,
        category: 'SOFTWARE',
        expense_date: new Date(),
        created_by: adminAuth.user.id,
        is_active: true
      });

      // Adjustment: +150 credit
      await db.AccountingEntry.create({
        description: 'Credit adjustment',
        amount: 150,
        entry_type: 'CREDIT',
        entry_date: new Date(),
        created_by: adminAuth.user.id,
        is_active: true
      });

      const dashboard = await financeService.getDashboard(adminAuth.user);

      expect(dashboard.totalRevenue).toBe(1000);
      expect(dashboard.totalExpenses).toBe(400);
      expect(dashboard.totalAdjustments).toBe(150);
      expect(dashboard.netProfit).toBe(750); // 1000 - 400 + 150
    });

    it('should not include soft-deleted entries in adjustments', async () => {
      await db.AccountingEntry.create({
        description: 'Active credit',
        amount: 500,
        entry_type: 'CREDIT',
        entry_date: new Date(),
        created_by: adminAuth.user.id,
        is_active: true
      });
      await db.AccountingEntry.create({
        description: 'Deleted credit',
        amount: 999,
        entry_type: 'CREDIT',
        entry_date: new Date(),
        created_by: adminAuth.user.id,
        is_active: false
      });

      const dashboard = await financeService.getDashboard(adminAuth.user);

      expect(dashboard.totalAdjustments).toBe(500);
    });

    it('should filter by date range', async () => {
      await db.Billing.create({
        invoice_number: 'INV-JAN',
        patient_id: testPatient.id,
        service_description: 'Jan session',
        amount_total: 200,
        amount_paid: 200,
        amount_due: 0,
        invoice_date: '2026-01-15',
        due_date: '2026-02-15',
        status: 'PAID',
        is_active: true
      });

      await db.AccountingEntry.create({
        description: 'Jan adjustment',
        amount: 100,
        entry_type: 'CREDIT',
        entry_date: '2026-01-20',
        created_by: adminAuth.user.id,
        is_active: true
      });

      await db.AccountingEntry.create({
        description: 'March adjustment',
        amount: 999,
        entry_type: 'CREDIT',
        entry_date: '2026-03-20',
        created_by: adminAuth.user.id,
        is_active: true
      });

      const dashboard = await financeService.getDashboard(adminAuth.user, {
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      });

      expect(dashboard.totalRevenue).toBe(200);
      expect(dashboard.totalAdjustments).toBe(100);
    });
  });

  // ========================================
  // getAgingReport
  // ========================================
  describe('getAgingReport', () => {
    it('should return aging brackets', async () => {
      const report = await financeService.getAgingReport(adminAuth.user);

      expect(report).toHaveProperty('brackets');
      expect(report).toHaveProperty('totalOverdue');
      expect(report).toHaveProperty('totalAmount');
      expect(report.brackets.length).toBe(4);
      expect(report.brackets[0].label).toBe('0-30');
      expect(report.brackets[1].label).toBe('31-60');
      expect(report.brackets[2].label).toBe('61-90');
      expect(report.brackets[3].label).toBe('90+');
    });

    it('should correctly bucket overdue invoices', async () => {
      const now = new Date();

      // 15 days overdue → 0-30 bracket
      await db.Billing.create({
        invoice_number: 'INV-AGING-1',
        patient_id: testPatient.id,
        service_description: 'Recent due',
        amount_total: 100,
        amount_paid: 0,
        amount_due: 100,
        invoice_date: new Date(now.getTime() - 45 * 86400000),
        due_date: new Date(now.getTime() - 15 * 86400000),
        status: 'SENT',
        is_active: true
      });

      // 50 days overdue → 31-60 bracket
      await db.Billing.create({
        invoice_number: 'INV-AGING-2',
        patient_id: testPatient.id,
        service_description: 'Medium due',
        amount_total: 200,
        amount_paid: 0,
        amount_due: 200,
        invoice_date: new Date(now.getTime() - 80 * 86400000),
        due_date: new Date(now.getTime() - 50 * 86400000),
        status: 'OVERDUE',
        is_active: true
      });

      const report = await financeService.getAgingReport(adminAuth.user);

      expect(report.totalOverdue).toBe(2);
      expect(report.totalAmount).toBe(300);
      expect(report.brackets[0].count).toBe(1); // 0-30
      expect(report.brackets[0].totalDue).toBe(100);
      expect(report.brackets[1].count).toBe(1); // 31-60
      expect(report.brackets[1].totalDue).toBe(200);
    });

    it('should return empty report when no unpaid invoices', async () => {
      const report = await financeService.getAgingReport(adminAuth.user);

      expect(report.totalOverdue).toBe(0);
      expect(report.totalAmount).toBe(0);
    });
  });

  // ========================================
  // getCashFlow
  // ========================================
  describe('getCashFlow', () => {
    it('should return 12 months of data', async () => {
      const data = await financeService.getCashFlow(adminAuth.user);

      expect(data.length).toBe(12);
      data.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('monthLabel');
        expect(month).toHaveProperty('revenue');
        expect(month).toHaveProperty('expenses');
        expect(month).toHaveProperty('adjustments');
        expect(month).toHaveProperty('net');
      });
    });

    it('should include adjustments in monthly cash flow', async () => {
      const now = new Date();
      // Compute month key same way as finance.service.js: new Date(year, month, 1).toISOString().slice(0,7)
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);

      // Create an entry this month
      await db.AccountingEntry.create({
        description: 'This month credit',
        amount: 750,
        entry_type: 'CREDIT',
        entry_date: now,
        created_by: adminAuth.user.id,
        is_active: true
      });

      const data = await financeService.getCashFlow(adminAuth.user);

      // Find the current month
      const thisMonth = data.find(d => d.month === currentMonth);
      expect(thisMonth).toBeDefined();
      expect(thisMonth.adjustments).toBe(750);
    });

    it('should calculate net = revenue - expenses + adjustments', async () => {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);

      // Revenue
      await db.Billing.create({
        invoice_number: 'INV-CF-001',
        patient_id: testPatient.id,
        service_description: 'Session',
        amount_total: 500,
        amount_paid: 500,
        amount_due: 0,
        invoice_date: now,
        due_date: new Date(now.getTime() + 30 * 86400000),
        status: 'PAID',
        is_active: true
      });

      // Expense
      await db.Expense.create({
        description: 'Rent',
        amount: 200,
        category: 'RENT',
        expense_date: now,
        created_by: adminAuth.user.id,
        is_active: true
      });

      // Adjustment
      await db.AccountingEntry.create({
        description: 'Adjustment',
        amount: 100,
        entry_type: 'CREDIT',
        entry_date: now,
        created_by: adminAuth.user.id,
        is_active: true
      });

      const data = await financeService.getCashFlow(adminAuth.user);
      const thisMonth = data.find(d => d.month === currentMonth);

      expect(thisMonth.revenue).toBe(500);
      expect(thisMonth.expenses).toBe(200);
      expect(thisMonth.adjustments).toBe(100);
      expect(thisMonth.net).toBe(400); // 500 - 200 + 100
    });

    it('should not include soft-deleted entries in cash flow', async () => {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);

      await db.AccountingEntry.create({
        description: 'Deleted entry',
        amount: 999,
        entry_type: 'CREDIT',
        entry_date: now,
        created_by: adminAuth.user.id,
        is_active: false
      });

      const data = await financeService.getCashFlow(adminAuth.user);
      const thisMonth = data.find(d => d.month === currentMonth);

      expect(thisMonth.adjustments).toBe(0);
    });
  });
});
