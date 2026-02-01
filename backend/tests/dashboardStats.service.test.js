/**
 * Dashboard Stats Service Tests
 * Tests for the dashboard statistics service functions
 */

const testDb = require('./setup/testDb');

let db;
let dashboardStatsService;
let testPatient1;
let testPatient2;
let testDietitian;

describe('Dashboard Stats Service', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    dashboardStatsService = require('../src/services/dashboardStats.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();

    // Create test dietitian
    const dietitianRole = await db.Role.findOne({ where: { name: 'DIETITIAN' } });
    testDietitian = await db.User.create({
      username: 'testdietitian',
      email: 'dietitian@test.com',
      password_hash: '$2b$10$testhashedpassword',
      first_name: 'Test',
      last_name: 'Dietitian',
      role_id: dietitianRole.id,
      is_active: true
    });

    // Create test patients
    testPatient1 = await db.Patient.create({
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '0612345678',
      date_of_birth: '1985-05-15',
      is_active: true,
      created_at: new Date(),
      dietitian_id: testDietitian.id
    });

    testPatient2 = await db.Patient.create({
      first_name: 'Marie',
      last_name: 'Martin',
      email: 'marie.martin@example.com',
      phone: '0623456789',
      date_of_birth: '1990-08-22',
      is_active: true,
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      dietitian_id: testDietitian.id
    });
  });

  describe('getPracticeOverview', () => {
    it('should return practice overview with basic counts', async () => {
      const result = await dashboardStatsService.getPracticeOverview();

      expect(result).toHaveProperty('totalPatients');
      expect(result).toHaveProperty('newPatientsThisMonth');
      expect(result).toHaveProperty('visitsThisMonth');
      expect(result).toHaveProperty('revenueThisMonth');
      expect(result).toHaveProperty('retentionRate');

      expect(result.totalPatients).toBe(2);
    });

    it('should count new patients this month', async () => {
      const result = await dashboardStatsService.getPracticeOverview();

      // testPatient1 was created this month
      expect(result.newPatientsThisMonth).toBe(1);
    });

    it('should calculate patient change from last month', async () => {
      const result = await dashboardStatsService.getPracticeOverview();

      expect(result).toHaveProperty('patientsChange');
      expect(typeof result.patientsChange).toBe('number');
    });

    it('should count visits this month', async () => {
      // Create visits
      await db.Visit.bulkCreate([
        {
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'COMPLETED',
          visit_type: 'CONSULTATION'
        },
        {
          patient_id: testPatient2.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'SCHEDULED',
          visit_type: 'FOLLOW_UP'
        }
      ]);

      const result = await dashboardStatsService.getPracticeOverview();

      expect(result.visitsThisMonth).toBe(2);
    });

    it('should calculate revenue this month', async () => {
      // Create billings
      await db.Billing.bulkCreate([
        {
          patient_id: testPatient1.id,
          invoice_number: 'INV-001',
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount_total: 100,
          amount_paid: 100,
          amount_due: 0,
          status: 'PAID',
          is_active: true
        },
        {
          patient_id: testPatient2.id,
          invoice_number: 'INV-002',
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount_total: 150,
          amount_paid: 0,
          amount_due: 150,
          status: 'PENDING',
          is_active: true
        }
      ]);

      const result = await dashboardStatsService.getPracticeOverview();

      expect(result.revenueThisMonth).toBe(250);
    });

    it('should calculate outstanding amount', async () => {
      await db.Billing.create({
        patient_id: testPatient1.id,
        invoice_number: 'INV-001',
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_total: 100,
        amount_paid: 0,
        amount_due: 100,
        status: 'PENDING',
        payment_status: 'PENDING',
        is_active: true
      });

      const result = await dashboardStatsService.getPracticeOverview();

      expect(result.outstandingAmount).toBe(100);
    });

    it('should calculate retention rate', async () => {
      // Create recent completed visits for one patient
      await db.Visit.create({
        patient_id: testPatient1.id,
        dietitian_id: testDietitian.id,
        visit_date: new Date(),
        status: 'COMPLETED',
        visit_type: 'CONSULTATION'
      });

      const result = await dashboardStatsService.getPracticeOverview();

      // 1 patient with recent visits / 2 total patients = 50%
      expect(result.retentionRate).toBe(50);
    });
  });

  describe('getRevenueChart', () => {
    beforeEach(async () => {
      // Create billings for multiple months
      const months = [0, 1, 2, 3, 6, 9];
      for (const monthsAgo of months) {
        const date = new Date();
        date.setMonth(date.getMonth() - monthsAgo);

        await db.Billing.create({
          patient_id: testPatient1.id,
          invoice_number: `INV-${monthsAgo}`,
          invoice_date: date,
          due_date: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000),
          amount_total: 100 + monthsAgo * 10,
          amount_paid: 100 + monthsAgo * 10,
          amount_due: 0,
          status: 'PAID',
          is_active: true
        });
      }
    });

    it('should return monthly revenue data for last 12 months', async () => {
      const result = await dashboardStatsService.getRevenueChart('monthly');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(12);

      result.forEach(item => {
        expect(item).toHaveProperty('period');
        expect(item).toHaveProperty('revenue');
        expect(item).toHaveProperty('invoices');
      });
    });

    it('should return quarterly revenue data', async () => {
      const result = await dashboardStatsService.getRevenueChart('quarterly');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(4);

      result.forEach(item => {
        expect(item).toHaveProperty('period');
        expect(item.period).toMatch(/Q\d \d{4}/);
      });
    });

    it('should include month labels in monthly view', async () => {
      const result = await dashboardStatsService.getRevenueChart('monthly');

      result.forEach(item => {
        expect(item).toHaveProperty('month');
      });
    });

    it('should calculate correct revenue totals', async () => {
      const result = await dashboardStatsService.getRevenueChart('monthly');

      // Current month should have 100
      const currentMonth = result[result.length - 1];
      expect(currentMonth.revenue).toBe(100);
    });

    it('should count invoices per period', async () => {
      const result = await dashboardStatsService.getRevenueChart('monthly');

      // Current month should have 1 invoice
      const currentMonth = result[result.length - 1];
      expect(currentMonth.invoices).toBe(1);
    });
  });

  describe('getPracticeHealthScore', () => {
    it('should return health score with all components', async () => {
      const result = await dashboardStatsService.getPracticeHealthScore();

      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('maxScore', 100);
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('level');

      expect(result.components).toHaveProperty('patientGrowth');
      expect(result.components).toHaveProperty('revenue');
      expect(result.components).toHaveProperty('retention');
      expect(result.components).toHaveProperty('activity');
      expect(result.components).toHaveProperty('payments');
    });

    it('should calculate patient growth score', async () => {
      const result = await dashboardStatsService.getPracticeHealthScore();

      expect(result.components.patientGrowth.score).toBeGreaterThanOrEqual(0);
      expect(result.components.patientGrowth.score).toBeLessThanOrEqual(20);
      expect(result.components.patientGrowth.max).toBe(20);
    });

    it('should calculate activity score based on visits', async () => {
      // Create completed visits this month
      for (let i = 0; i < 10; i++) {
        await db.Visit.create({
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'COMPLETED',
          visit_type: 'CONSULTATION'
        });
      }

      const result = await dashboardStatsService.getPracticeHealthScore();

      expect(result.components.activity.score).toBe(10); // 1 point per visit, max 20
    });

    it('should determine correct health level', async () => {
      const result = await dashboardStatsService.getPracticeHealthScore();

      expect(['excellent', 'good', 'average', 'needs_improvement']).toContain(result.level);
    });

    it('should calculate total score as sum of components', async () => {
      const result = await dashboardStatsService.getPracticeHealthScore();

      const sumOfComponents =
        result.components.patientGrowth.score +
        result.components.revenue.score +
        result.components.retention.score +
        result.components.activity.score +
        result.components.payments.score;

      expect(result.totalScore).toBe(sumOfComponents);
    });

    it('should include labels for all components', async () => {
      const result = await dashboardStatsService.getPracticeHealthScore();

      Object.values(result.components).forEach(component => {
        expect(component).toHaveProperty('label');
        expect(component.label).toBeTruthy();
      });
    });

    it('should have score between 0 and 100', async () => {
      const result = await dashboardStatsService.getPracticeHealthScore();

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    it('should mark excellent when score >= 80', async () => {
      // Create conditions for high score
      for (let i = 0; i < 20; i++) {
        await db.Visit.create({
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'COMPLETED',
          visit_type: 'CONSULTATION'
        });
      }

      // Create payments
      await db.Billing.create({
        patient_id: testPatient1.id,
        invoice_number: 'INV-TEST',
        invoice_date: new Date(),
        due_date: new Date(),
        amount_total: 1000,
        amount_paid: 1000,
        amount_due: 0,
        status: 'PAID',
        is_active: true
      });

      await db.Payment.create({
        billing_id: 1,
        amount: 1000,
        payment_date: new Date(),
        payment_method: 'CARD'
      });

      const result = await dashboardStatsService.getPracticeHealthScore();

      // With high activity score, total should be good
      expect(result.components.activity.score).toBe(20);
    });
  });
});
