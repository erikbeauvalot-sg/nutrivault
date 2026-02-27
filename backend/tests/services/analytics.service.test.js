/**
 * Analytics Service Tests
 * Tests for analytics.service.js functions:
 *   - getHealthTrends
 *   - getFinancialMetrics
 *   - getCommunicationEffectiveness
 *   - calculatePatientHealthScore
 *   - getQuoteMetrics
 *
 * MEMORY NOTE: Sequelize Op.* are Symbols — never use Object.keys() on an
 * Op-based filter object to test emptiness; use the original variables instead.
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let db;
let analyticsService;

describe('Analytics Service', () => {
  let adminAuth, dietitianAuth;

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    analyticsService = require('../../src/services/analytics.service');
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

  // ========================================
  // getHealthTrends
  // ========================================
  describe('getHealthTrends', () => {
    it('should return valid structure with empty data', async () => {
      const result = await analyticsService.getHealthTrends();

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('topMeasures');
      expect(result).toHaveProperty('measureStats');
      expect(result).toHaveProperty('riskDistribution');
      expect(result).toHaveProperty('monthlyTrends');

      expect(typeof result.summary.totalMeasures).toBe('number');
      expect(typeof result.summary.totalPatientsWithMeasures).toBe('number');
      expect(typeof result.summary.avgMeasuresPerPatient).toBe('number');
      expect(Array.isArray(result.topMeasures)).toBe(true);
      expect(Array.isArray(result.measureStats)).toBe(true);
    });

    it('should return riskDistribution with correct keys', async () => {
      const result = await analyticsService.getHealthTrends();

      expect(result.riskDistribution).toHaveProperty('low');
      expect(result.riskDistribution).toHaveProperty('medium');
      expect(result.riskDistribution).toHaveProperty('high');
      expect(result.riskDistribution).toHaveProperty('critical');
    });

    it('should accept date filters without throwing', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const result = await analyticsService.getHealthTrends({ startDate, endDate });

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalMeasures).toBe(0);
    });

    it('should aggregate measure counts when data exists', async () => {
      // Create patient and dietitian link
      const patient = await db.Patient.create({
        first_name: 'Test',
        last_name: 'Patient',
        email: 'trend.patient@test.com',
        assigned_dietitian_id: dietitianAuth.user.id
      });

      // Create a measure definition
      const measureDef = await db.MeasureDefinition.create({
        name: 'weight_test_trend',
        display_name: 'Weight',
        category: 'anthropometric',
        measure_type: 'numeric',
        unit: 'kg',
        is_active: true,
        normal_range_min: 50,
        normal_range_max: 100,
        enable_alerts: false
      });

      // Create several measures
      const measuredAt = new Date(Date.now() - 1000); // slightly in the past
      for (let i = 0; i < 3; i++) {
        await db.PatientMeasure.create({
          patient_id: patient.id,
          measure_definition_id: measureDef.id,
          numeric_value: 70 + i,
          measured_at: new Date(measuredAt.getTime() - i * 60000),
          recorded_by: adminAuth.user.id
        });
      }

      const result = await analyticsService.getHealthTrends();

      expect(result.summary.totalMeasures).toBe(3);
      expect(result.summary.totalPatientsWithMeasures).toBe(1);
      expect(result.topMeasures.length).toBeGreaterThanOrEqual(1);
    });

    it('should return avgMeasuresPerPatient of 0 when no patients have measures', async () => {
      const result = await analyticsService.getHealthTrends();
      expect(result.summary.avgMeasuresPerPatient).toBe(0);
    });
  });

  // ========================================
  // getFinancialMetrics
  // ========================================
  describe('getFinancialMetrics', () => {
    it('should return valid structure with no billing data', async () => {
      const result = await analyticsService.getFinancialMetrics();

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('revenueByStatus');
      expect(result).toHaveProperty('monthlyRevenue');
      expect(result).toHaveProperty('paymentMethods');

      expect(typeof result.summary.totalInvoices).toBe('number');
      expect(typeof result.summary.totalRevenue).toBe('number');
      expect(typeof result.summary.totalCollected).toBe('number');
      expect(typeof result.summary.totalOutstanding).toBe('number');
      expect(typeof result.summary.avgInvoiceAmount).toBe('number');
      expect(typeof result.summary.avgPaymentDays).toBe('number');
      expect(typeof result.summary.overdueCount).toBe('number');

      expect(Array.isArray(result.revenueByStatus)).toBe(true);
      expect(Array.isArray(result.monthlyRevenue)).toBe(true);
      expect(Array.isArray(result.paymentMethods)).toBe(true);
    });

    it('should return zeros for all summary fields when no invoices exist', async () => {
      const result = await analyticsService.getFinancialMetrics();

      expect(result.summary.totalInvoices).toBe(0);
      expect(result.summary.totalRevenue).toBe(0);
      expect(result.summary.overdueCount).toBe(0);
    });

    it('should accept date filters without throwing', async () => {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const result = await analyticsService.getFinancialMetrics({ startDate, endDate });

      expect(result).toHaveProperty('summary');
    });

    it('should count invoices and revenue when billing records exist', async () => {
      // Create a patient needed for Billing FK
      const patient = await db.Patient.create({
        first_name: 'Finance',
        last_name: 'Test',
        assigned_dietitian_id: adminAuth.user.id
      });

      await db.Billing.create({
        patient_id: patient.id,
        invoice_number: 'INV-TEST-001',
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PAID',
        amount_total: 150.00,
        amount_paid: 150.00,
        amount_due: 0,
        is_active: true
      });

      const result = await analyticsService.getFinancialMetrics();

      expect(result.summary.totalInvoices).toBe(1);
      expect(result.summary.totalRevenue).toBe(150);
    });

    it('should count overdue invoices correctly', async () => {
      const patient = await db.Patient.create({
        first_name: 'Overdue',
        last_name: 'Patient',
        assigned_dietitian_id: adminAuth.user.id
      });

      await db.Billing.create({
        patient_id: patient.id,
        invoice_number: 'INV-OD-001',
        invoice_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: 'OVERDUE',
        amount_total: 200.00,
        amount_paid: 0,
        amount_due: 200,
        is_active: true
      });

      const result = await analyticsService.getFinancialMetrics();

      expect(result.summary.overdueCount).toBe(1);
    });
  });

  // ========================================
  // getCommunicationEffectiveness
  // ========================================
  describe('getCommunicationEffectiveness', () => {
    it('should return valid structure with empty data', async () => {
      const result = await analyticsService.getCommunicationEffectiveness();

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('emailsByType');
      expect(result).toHaveProperty('monthlyEmails');
      expect(result).toHaveProperty('visitStats');
      expect(result).toHaveProperty('reminderEffectiveness');

      expect(typeof result.summary.totalEmails).toBe('number');
      expect(typeof result.summary.sentEmails).toBe('number');
      expect(typeof result.summary.failedEmails).toBe('number');
      expect(Array.isArray(result.emailsByType)).toBe(true);
      expect(Array.isArray(result.monthlyEmails)).toBe(true);
      expect(Array.isArray(result.visitStats)).toBe(true);
    });

    it('should return zero totals when no emails exist', async () => {
      const result = await analyticsService.getCommunicationEffectiveness();

      expect(result.summary.totalEmails).toBe(0);
      expect(result.summary.sentEmails).toBe(0);
      expect(result.summary.failedEmails).toBe(0);
    });

    it('should accept date filters without throwing', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const result = await analyticsService.getCommunicationEffectiveness({ startDate, endDate });

      expect(result).toHaveProperty('summary');
    });

    it('should count emails when email logs exist', async () => {
      await db.EmailLog.create({
        sent_to: 'recipient@test.com',
        email_type: 'appointment_reminder',
        status: 'sent',
        template_slug: 'appointment_reminder',
        subject: 'Reminder test',
        sent_at: new Date()
      });
      await db.EmailLog.create({
        sent_to: 'other@test.com',
        email_type: 'invoice',
        status: 'failed',
        template_slug: 'invoice',
        subject: 'Invoice test',
        sent_at: new Date()
      });

      const result = await analyticsService.getCommunicationEffectiveness();

      expect(result.summary.totalEmails).toBe(2);
      expect(result.summary.sentEmails).toBe(1);
      expect(result.summary.failedEmails).toBe(1);
    });

    it('should compute deliveryRate as string or numeric', async () => {
      await db.EmailLog.create({
        sent_to: 'x@test.com',
        email_type: 'appointment_reminder',
        status: 'sent',
        template_slug: 'appointment_reminder',
        subject: 'Test',
        sent_at: new Date()
      });

      const result = await analyticsService.getCommunicationEffectiveness();

      // deliveryRate may be returned as a string ("100.0") or number
      const rate = parseFloat(result.summary.deliveryRate);
      expect(rate).toBe(100);
    });
  });

  // ========================================
  // calculatePatientHealthScore
  // ========================================
  describe('calculatePatientHealthScore', () => {
    let testPatient;

    beforeEach(async () => {
      testPatient = await db.Patient.create({
        first_name: 'Score',
        last_name: 'Patient',
        email: 'score.patient@test.com',
        assigned_dietitian_id: dietitianAuth.user.id
      });
    });

    it('should return valid structure for a patient with no data', async () => {
      const result = await analyticsService.calculatePatientHealthScore(testPatient.id);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('details');

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);

      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    it('should return components object with correct fields', async () => {
      const result = await analyticsService.calculatePatientHealthScore(testPatient.id);

      expect(result.components).toHaveProperty('measureCompliance');
      expect(result.components).toHaveProperty('outOfRangePercent');
      expect(result.components).toHaveProperty('visitCompliance');
      expect(result.components).toHaveProperty('noShowRate');
    });

    it('should return details object with correct fields', async () => {
      const result = await analyticsService.calculatePatientHealthScore(testPatient.id);

      expect(result.details).toHaveProperty('measuresLogged');
      expect(result.details).toHaveProperty('outOfRangeMeasures');
      expect(result.details).toHaveProperty('totalMeasures');
      expect(result.details).toHaveProperty('completedVisits');
      expect(result.details).toHaveProperty('noShowVisits');
    });

    it('should reflect completed visits in the score', async () => {
      // Add two completed visits in last 6 months
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      for (let i = 0; i < 2; i++) {
        await db.Visit.create({
          patient_id: testPatient.id,
          dietitian_id: dietitianAuth.user.id,
          visit_date: new Date(recentDate.getTime() - i * 7 * 24 * 60 * 60 * 1000),
          status: 'COMPLETED'
        });
      }

      const result = await analyticsService.calculatePatientHealthScore(testPatient.id);

      expect(result.details.completedVisits).toBe(2);
      expect(result.components.visitCompliance).toBe(100);
    });

    it('should reflect no-show visits in noShowRate', async () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: dietitianAuth.user.id,
        visit_date: recentDate,
        status: 'NO_SHOW'
      });

      const result = await analyticsService.calculatePatientHealthScore(testPatient.id);

      expect(result.details.noShowVisits).toBe(1);
      expect(result.components.noShowRate).toBeGreaterThan(0);
    });
  });

  // ========================================
  // getQuoteMetrics
  // ========================================
  describe('getQuoteMetrics', () => {
    it('should return valid structure with no quote data', async () => {
      const result = await analyticsService.getQuoteMetrics({ user: adminAuth.user });

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('quotesByStatus');
      expect(result).toHaveProperty('monthlyQuotes');
      expect(result).toHaveProperty('conversionFunnel');

      expect(typeof result.summary.totalQuotes).toBe('number');
      expect(typeof result.summary.totalValue).toBe('number');
      expect(typeof result.summary.conversionRate).toBe('number');
      expect(Array.isArray(result.quotesByStatus)).toBe(true);
      expect(Array.isArray(result.monthlyQuotes)).toBe(true);
    });

    it('should return zero totals when no quotes exist', async () => {
      const result = await analyticsService.getQuoteMetrics({ user: adminAuth.user });

      expect(result.summary.totalQuotes).toBe(0);
      expect(result.summary.totalValue).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
    });

    it('should accept date filters without throwing', async () => {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const result = await analyticsService.getQuoteMetrics({
        user: adminAuth.user,
        startDate,
        endDate
      });

      expect(result).toHaveProperty('summary');
    });

    it('should count quotes when quote records exist', async () => {
      // Create a client first
      const client = await db.Client.create({
        client_type: 'person',
        first_name: 'Quote',
        last_name: 'Client',
        created_by: adminAuth.user.id,
        is_active: true
      });

      await db.Quote.create({
        client_id: client.id,
        quote_number: 'QUO-TEST-001',
        quote_date: new Date(),
        validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
        amount_subtotal: 100.00,
        amount_tax: 0,
        amount_total: 100.00,
        created_by: adminAuth.user.id,
        is_active: true
      });

      const result = await analyticsService.getQuoteMetrics({ user: adminAuth.user });

      expect(result.summary.totalQuotes).toBe(1);
      expect(result.summary.totalValue).toBe(100);
    });

    it('should compute conversionRate correctly with accepted/declined quotes', async () => {
      const client = await db.Client.create({
        client_type: 'person',
        first_name: 'Conversion',
        last_name: 'Client',
        created_by: adminAuth.user.id,
        is_active: true
      });

      // 1 ACCEPTED, 1 DECLINED
      await db.Quote.create({
        client_id: client.id,
        quote_number: 'QUO-ACC-001',
        quote_date: new Date(),
        validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACCEPTED',
        accepted_date: new Date(),
        amount_subtotal: 200,
        amount_tax: 0,
        amount_total: 200,
        created_by: adminAuth.user.id,
        is_active: true
      });
      await db.Quote.create({
        client_id: client.id,
        quote_number: 'QUO-DEC-001',
        quote_date: new Date(),
        validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DECLINED',
        amount_subtotal: 300,
        amount_tax: 0,
        amount_total: 300,
        created_by: adminAuth.user.id,
        is_active: true
      });

      const result = await analyticsService.getQuoteMetrics({ user: adminAuth.user });

      // 1 accepted / 2 decided = 50%
      expect(result.summary.conversionRate).toBe(50);
    });

    it('should return empty result when dietitian has no quotes', async () => {
      // dietitianAuth has no quotes created
      const result = await analyticsService.getQuoteMetrics({ user: dietitianAuth.user });

      expect(result.summary.totalQuotes).toBe(0);
    });
  });
});
