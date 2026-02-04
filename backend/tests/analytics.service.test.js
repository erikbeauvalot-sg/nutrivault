/**
 * Analytics Service Tests
 * Tests for the analytics service functions
 */

const testDb = require('./setup/testDb');

let db;
let analyticsService;
let testPatient1;
let testPatient2;
let testDietitian;
let testMeasureDefinition;
let testMeasureDefinition2;

describe('Analytics Service', () => {
  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    analyticsService = require('../src/services/analytics.service');
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
      dietitian_id: testDietitian.id
    });

    testPatient2 = await db.Patient.create({
      first_name: 'Marie',
      last_name: 'Martin',
      email: 'marie.martin@example.com',
      phone: '0623456789',
      date_of_birth: '1990-08-22',
      is_active: true,
      dietitian_id: testDietitian.id
    });

    // Create measure definitions
    testMeasureDefinition = await db.MeasureDefinition.create({
      name: 'weight',
      display_name: 'Weight',
      unit: 'kg',
      category: 'anthropometric',
      data_type: 'numeric',
      normal_range_min: 50,
      normal_range_max: 100,
      alert_threshold_min: 40,
      alert_threshold_max: 120,
      is_active: true
    });

    testMeasureDefinition2 = await db.MeasureDefinition.create({
      name: 'blood_pressure_systolic',
      display_name: 'Blood Pressure (Systolic)',
      unit: 'mmHg',
      category: 'vitals',
      data_type: 'numeric',
      normal_range_min: 90,
      normal_range_max: 140,
      alert_threshold_min: 80,
      alert_threshold_max: 180,
      is_active: true
    });
  });

  describe('getHealthTrends', () => {
    it('should return health trends with empty data when no measures exist', async () => {
      const result = await analyticsService.getHealthTrends({});

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('topMeasures');
      expect(result).toHaveProperty('measureStats');
      expect(result).toHaveProperty('riskDistribution');
      expect(result.summary.totalMeasures).toBe(0);
    });

    it('should calculate health trends with patient measures', async () => {
      // Create patient measures
      await db.PatientMeasure.bulkCreate([
        {
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 75,
          measured_at: new Date(),
          recorded_by: testDietitian.id
        },
        {
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 76,
          measured_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          recorded_by: testDietitian.id
        },
        {
          patient_id: testPatient2.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 68,
          measured_at: new Date(),
          recorded_by: testDietitian.id
        }
      ]);

      const result = await analyticsService.getHealthTrends({});

      expect(result.summary.totalMeasures).toBe(3);
      expect(result.summary.totalPatientsWithMeasures).toBe(2);
      expect(result.topMeasures.length).toBeGreaterThan(0);
      expect(result.topMeasures[0].name).toBe('Weight');
    });

    it('should filter health trends by date range', async () => {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      await db.PatientMeasure.bulkCreate([
        {
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 75,
          measured_at: now,
          recorded_by: testDietitian.id
        },
        {
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 78,
          measured_at: twoMonthsAgo,
          recorded_by: testDietitian.id
        }
      ]);

      const result = await analyticsService.getHealthTrends({
        startDate: oneMonthAgo.toISOString(),
        endDate: now.toISOString()
      });

      expect(result.summary.totalMeasures).toBe(1);
    });

    it('should calculate risk distribution correctly', async () => {
      // Normal range measure
      await db.PatientMeasure.create({
        patient_id: testPatient1.id,
        measure_definition_id: testMeasureDefinition.id,
        numeric_value: 75, // Within normal range (50-100)
        measured_at: new Date(),
        recorded_by: testDietitian.id
      });

      // Out of range measure
      await db.PatientMeasure.create({
        patient_id: testPatient2.id,
        measure_definition_id: testMeasureDefinition.id,
        numeric_value: 110, // Above normal max (100)
        measured_at: new Date(),
        recorded_by: testDietitian.id
      });

      const result = await analyticsService.getHealthTrends({});

      expect(result.riskDistribution).toBeDefined();
      expect(result.riskDistribution.low).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average measures per patient', async () => {
      await db.PatientMeasure.bulkCreate([
        {
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 75,
          measured_at: new Date(),
          recorded_by: testDietitian.id
        },
        {
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 76,
          measured_at: new Date(),
          recorded_by: testDietitian.id
        },
        {
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition2.id,
          numeric_value: 120,
          measured_at: new Date(),
          recorded_by: testDietitian.id
        }
      ]);

      const result = await analyticsService.getHealthTrends({});

      expect(result.summary.avgMeasuresPerPatient).toBe(3); // 3 measures / 1 patient
    });
  });

  describe('getFinancialMetrics', () => {
    beforeEach(async () => {
      // Create test billings
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
          payment_method: 'CASH',
          payment_date: new Date(),
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
          status: 'SENT',
          is_active: true
        },
        {
          patient_id: testPatient1.id,
          invoice_number: 'INV-003',
          invoice_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          amount_total: 80,
          amount_paid: 0,
          amount_due: 80,
          status: 'OVERDUE',
          is_active: true
        }
      ]);
    });

    it('should return financial metrics summary', async () => {
      const result = await analyticsService.getFinancialMetrics({});

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('revenueByStatus');
      expect(result).toHaveProperty('monthlyRevenue');
      expect(result).toHaveProperty('paymentMethods');

      expect(result.summary.totalInvoices).toBe(3);
      expect(result.summary.totalRevenue).toBe(330); // 100 + 150 + 80
    });

    it('should calculate total collected and outstanding', async () => {
      const result = await analyticsService.getFinancialMetrics({});

      expect(result.summary.totalCollected).toBe(100);
      expect(result.summary.totalOutstanding).toBe(230); // 150 + 80
    });

    it('should count overdue invoices', async () => {
      const result = await analyticsService.getFinancialMetrics({});

      expect(result.summary.overdueCount).toBe(1);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = await analyticsService.getFinancialMetrics({
        startDate: oneWeekAgo.toISOString(),
        endDate: now.toISOString()
      });

      // Only invoices from the last week
      expect(result.summary.totalInvoices).toBe(2);
    });

    it('should calculate revenue by status', async () => {
      const result = await analyticsService.getFinancialMetrics({});

      const paidStatus = result.revenueByStatus.find(r => r.status === 'PAID');
      const sentStatus = result.revenueByStatus.find(r => r.status === 'SENT');

      expect(paidStatus).toBeDefined();
      expect(paidStatus.total).toBe(100);
      expect(sentStatus).toBeDefined();
      expect(sentStatus.total).toBe(150);
    });

    it('should breakdown payment methods', async () => {
      const result = await analyticsService.getFinancialMetrics({});

      expect(result.paymentMethods.length).toBeGreaterThan(0);
      const cashMethod = result.paymentMethods.find(p => p.method === 'CASH');
      expect(cashMethod).toBeDefined();
      expect(cashMethod.totalPaid).toBe(100);
    });

    it('should calculate average payment days', async () => {
      const result = await analyticsService.getFinancialMetrics({});

      expect(result.summary.avgPaymentDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCommunicationEffectiveness', () => {
    beforeEach(async () => {
      // Create email logs
      await db.EmailLog.bulkCreate([
        {
          patient_id: testPatient1.id,
          email_type: 'reminder',
          sent_to: testPatient1.email,
          template_slug: 'appointment-reminder',
          subject: 'Appointment Reminder',
          status: 'sent',
          sent_at: new Date()
        },
        {
          patient_id: testPatient1.id,
          email_type: 'reminder',
          sent_to: testPatient1.email,
          template_slug: 'appointment-reminder',
          subject: 'Appointment Reminder',
          status: 'sent',
          sent_at: new Date()
        },
        {
          patient_id: testPatient2.id,
          email_type: 'newsletter',
          sent_to: testPatient2.email,
          template_slug: 'monthly-newsletter',
          subject: 'Monthly Newsletter',
          status: 'failed',
          sent_at: new Date()
        }
      ]);

      // Create visits for reminder effectiveness
      await db.Visit.bulkCreate([
        {
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'COMPLETED',
          reminders_sent: 2,
          visit_type: 'CONSULTATION'
        },
        {
          patient_id: testPatient2.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'NO_SHOW',
          reminders_sent: 0,
          visit_type: 'CONSULTATION'
        }
      ]);
    });

    it('should return communication effectiveness summary', async () => {
      const result = await analyticsService.getCommunicationEffectiveness({});

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('emailsByType');
      expect(result).toHaveProperty('monthlyEmails');
      expect(result).toHaveProperty('visitStats');
      expect(result).toHaveProperty('reminderEffectiveness');

      expect(result.summary.totalEmails).toBe(3);
      expect(result.summary.sentEmails).toBe(2);
      expect(result.summary.failedEmails).toBe(1);
    });

    it('should calculate delivery rate', async () => {
      const result = await analyticsService.getCommunicationEffectiveness({});

      // 2 sent / 3 total = 66.7%
      expect(parseFloat(result.summary.deliveryRate)).toBeCloseTo(66.7, 1);
    });

    it('should breakdown emails by type', async () => {
      const result = await analyticsService.getCommunicationEffectiveness({});

      const reminderType = result.emailsByType.find(e => e.type === 'reminder');
      const newsletterType = result.emailsByType.find(e => e.type === 'newsletter');

      expect(reminderType).toBeDefined();
      expect(reminderType.sent).toBe(2);
      expect(newsletterType).toBeDefined();
      expect(newsletterType.failed).toBe(1);
    });

    it('should calculate visit statistics', async () => {
      const result = await analyticsService.getCommunicationEffectiveness({});

      const completedStatus = result.visitStats.find(v => v.status === 'COMPLETED');
      const noShowStatus = result.visitStats.find(v => v.status === 'NO_SHOW');

      expect(completedStatus).toBeDefined();
      expect(completedStatus.count).toBe(1);
      expect(noShowStatus).toBeDefined();
      expect(noShowStatus.count).toBe(1);
    });

    it('should calculate reminder effectiveness', async () => {
      const result = await analyticsService.getCommunicationEffectiveness({});

      // Patients with reminders have better attendance
      expect(result.summary.noShowRateWithReminder).toBeDefined();
      expect(result.summary.noShowRateWithoutReminder).toBeDefined();
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const result = await analyticsService.getCommunicationEffectiveness({
        startDate: oneHourAgo.toISOString(),
        endDate: oneWeekFromNow.toISOString()
      });

      expect(result.summary.totalEmails).toBe(3);
    });
  });

  describe('calculatePatientHealthScore', () => {
    it('should calculate health score for patient with no data', async () => {
      const result = await analyticsService.calculatePatientHealthScore(testPatient1.id);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('details');

      // Score should be low due to no measures/visits
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should calculate health score with measures and visits', async () => {
      // Create measures for the last 6 months
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        await db.PatientMeasure.create({
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 75,
          measured_at: new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000),
          recorded_by: testDietitian.id
        });
      }

      // Create completed visits
      await db.Visit.bulkCreate([
        {
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          status: 'COMPLETED',
          visit_type: 'CONSULTATION'
        },
        {
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          status: 'COMPLETED',
          visit_type: 'CONSULTATION'
        }
      ]);

      const result = await analyticsService.calculatePatientHealthScore(testPatient1.id);

      expect(result.score).toBeGreaterThan(50); // Should have a good score
      expect(result.components.measureCompliance).toBe(100); // 6 measures = 100%
      expect(result.components.visitCompliance).toBe(100); // 2 visits in 6 months = 100%
    });

    it('should detect out of range measures', async () => {
      // Create an out of range measure
      await db.PatientMeasure.create({
        patient_id: testPatient1.id,
        measure_definition_id: testMeasureDefinition.id,
        numeric_value: 110, // Above normal max (100)
        measured_at: new Date(),
        recorded_by: testDietitian.id
      });

      const result = await analyticsService.calculatePatientHealthScore(testPatient1.id);

      expect(result.components.outOfRangePercent).toBe(100); // 1/1 = 100%
    });

    it('should calculate no-show rate impact', async () => {
      // Create a no-show visit
      await db.Visit.create({
        patient_id: testPatient1.id,
        dietitian_id: testDietitian.id,
        visit_date: new Date(),
        status: 'NO_SHOW',
        visit_type: 'CONSULTATION'
      });

      const result = await analyticsService.calculatePatientHealthScore(testPatient1.id);

      expect(result.components.noShowRate).toBe(100); // 1/1 no-show
      expect(result.details.noShowVisits).toBe(1);
    });

    it('should determine correct risk level', async () => {
      // Create good compliance data
      for (let i = 0; i < 6; i++) {
        await db.PatientMeasure.create({
          patient_id: testPatient1.id,
          measure_definition_id: testMeasureDefinition.id,
          numeric_value: 75,
          measured_at: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
          recorded_by: testDietitian.id
        });
      }

      await db.Visit.bulkCreate([
        {
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(),
          status: 'COMPLETED',
          visit_type: 'CONSULTATION'
        },
        {
          patient_id: testPatient1.id,
          dietitian_id: testDietitian.id,
          visit_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          status: 'COMPLETED',
          visit_type: 'CONSULTATION'
        }
      ]);

      const result = await analyticsService.calculatePatientHealthScore(testPatient1.id);

      // With good data, risk level should be low
      expect(['low', 'medium']).toContain(result.riskLevel);
    });
  });
});
