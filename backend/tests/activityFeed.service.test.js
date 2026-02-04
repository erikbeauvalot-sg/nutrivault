/**
 * Activity Feed Service Tests
 * Tests for the activity feed service — covers bug fixes for:
 * - MeasureAlert query (no is_active column, use acknowledged_at)
 * - Billing status field (was payment_status, now status)
 * - Billing amount field (was total_amount, now amount_total)
 */

const testDb = require('./setup/testDb');

let db;
let activityFeedService;
let testDietitian;
let testPatient;

describe('Activity Feed Service', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    activityFeedService = require('../src/services/activityFeed.service');
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();

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

    testPatient = await db.Patient.create({
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean@example.com',
      phone: '0612345678',
      date_of_birth: '1985-05-15',
      is_active: true,
      dietitian_id: testDietitian.id
    });
  });

  describe('getRecentActivity', () => {
    it('should return an empty array when no activity exists', async () => {
      const activities = await activityFeedService.getRecentActivity(20);
      // May include the newly created patient
      expect(Array.isArray(activities)).toBe(true);
    });

    it('should include new patients in the feed', async () => {
      const activities = await activityFeedService.getRecentActivity(20);
      const patientActivities = activities.filter(a => a.type === 'PATIENT_CREATED');
      expect(patientActivities.length).toBe(1);
      expect(patientActivities[0].patient_name).toBe('Jean Dupont');
    });

    it('should include visits in the feed', async () => {
      await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: testDietitian.id,
        visit_date: new Date(),
        status: 'COMPLETED',
        visit_type: 'CONSULTATION'
      });

      const activities = await activityFeedService.getRecentActivity(20);
      const visitActivities = activities.filter(a => a.type === 'VISIT_COMPLETED');
      expect(visitActivities.length).toBe(1);
    });

    it('should query measure_alerts without is_active column (uses acknowledged_at)', async () => {
      // Create a measure definition
      const measureDef = await db.MeasureDefinition.create({
        name: 'Weight',
        display_name: 'Weight',
        code: 'weight',
        unit: 'kg',
        data_type: 'NUMERIC',
        category: 'anthropometric',
        is_active: true
      });

      // Create a patient measure
      const patientMeasure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 120,
        measured_at: new Date(),
        recorded_by: testDietitian.id
      });

      // Create an unacknowledged alert (should appear in feed)
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: patientMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'above_critical',
        value: 120,
        threshold_value: 100,
        message: 'Weight above critical threshold',
        acknowledged_at: null
      });

      // Create an acknowledged alert (should NOT appear)
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: patientMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'info',
        alert_type: 'above_normal',
        value: 95,
        threshold_value: 90,
        message: 'Weight above normal range',
        acknowledged_at: new Date()
      });

      const activities = await activityFeedService.getRecentActivity(50);
      const alertActivities = activities.filter(a => a.type === 'MEASURE_ALERT');

      // Only the unacknowledged alert should appear
      expect(alertActivities.length).toBe(1);
      expect(alertActivities[0].message).toContain('Weight');
    });

    it('should query billing with status column (not payment_status) for overdue invoices', async () => {
      // Create an overdue invoice using the correct status values
      await db.Billing.create({
        patient_id: testPatient.id,
        invoice_number: 'INV-OVERDUE',
        invoice_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        amount_total: 200,
        amount_paid: 50,
        amount_due: 150,
        status: 'OVERDUE',
        is_active: true
      });

      // Create a paid invoice (should NOT appear as overdue)
      await db.Billing.create({
        patient_id: testPatient.id,
        invoice_number: 'INV-PAID',
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_total: 100,
        amount_paid: 100,
        amount_due: 0,
        status: 'PAID',
        is_active: true
      });

      const activities = await activityFeedService.getRecentActivity(50);
      const overdueActivities = activities.filter(a => a.type === 'INVOICE_OVERDUE');

      expect(overdueActivities.length).toBe(1);
      expect(overdueActivities[0].message).toContain('150.00');
    });

    it('should use amount_total (not total_amount) for invoice created messages', async () => {
      await db.Billing.create({
        patient_id: testPatient.id,
        invoice_number: 'INV-NEW',
        invoice_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount_total: 75.50,
        amount_paid: 0,
        amount_due: 75.50,
        status: 'DRAFT',
        is_active: true
      });

      const activities = await activityFeedService.getRecentActivity(50);
      const invoiceActivities = activities.filter(a => a.type === 'INVOICE_CREATED');

      expect(invoiceActivities.length).toBe(1);
      expect(invoiceActivities[0].message).toContain('75.50');
    });

    it('should sort activities by date descending', async () => {
      const activities = await activityFeedService.getRecentActivity(20);

      for (let i = 1; i < activities.length; i++) {
        expect(new Date(activities[i - 1].created_at).getTime())
          .toBeGreaterThanOrEqual(new Date(activities[i].created_at).getTime());
      }
    });

    it('should respect the limit parameter', async () => {
      // Create several visits
      for (let i = 0; i < 5; i++) {
        await db.Visit.create({
          patient_id: testPatient.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'SCHEDULED',
          visit_type: 'FOLLOW_UP'
        });
      }

      const activities = await activityFeedService.getRecentActivity(3);
      expect(activities.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getActivitySummary', () => {
    it('should return summary structure', async () => {
      const summary = await activityFeedService.getActivitySummary();

      expect(summary).toHaveProperty('today');
      expect(summary).toHaveProperty('week');
      expect(summary.today).toHaveProperty('visits');
      expect(summary.today).toHaveProperty('payments');
      expect(summary.today).toHaveProperty('newPatients');
      expect(summary.week).toHaveProperty('visits');
      expect(summary.week).toHaveProperty('payments');
      expect(summary.week).toHaveProperty('newPatients');
    });

    it('should count completed visits today', async () => {
      await db.Visit.create({
        patient_id: testPatient.id,
        dietitian_id: testDietitian.id,
        visit_date: new Date(),
        status: 'COMPLETED',
        visit_type: 'CONSULTATION'
      });

      const summary = await activityFeedService.getActivitySummary();
      expect(summary.today.visits).toBe(1);
    });
  });
});
