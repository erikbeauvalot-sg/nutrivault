/**
 * Measure Alerts Service Tests
 * Tests for measureAlerts.service.js functions:
 *   - checkMeasureValue
 *   - generateMeasureAlert
 *   - hasRecentAlert
 *   - getAllUnacknowledgedAlerts
 *   - getPatientAlerts
 *   - acknowledgeAlert
 *   - acknowledgePatientAlerts
 *
 * MEMORY NOTE: PatientMeasure requires `recorded_by` (NOT NULL).
 * MEMORY NOTE: MeasureDefinition categories: vitals, lab_results, symptoms, anthropometric, lifestyle, other
 */

const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');

let db;
let measureAlertsService;

describe('Measure Alerts Service', () => {
  let adminAuth, dietitianAuth;
  let testPatient;
  let measureDef; // definition with normal range and alert thresholds

  beforeAll(async () => {
    db = await testDb.init();
    await testDb.seedBaseData();
    measureAlertsService = require('../../src/services/measureAlerts.service');
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

    // Create patient linked to dietitian
    testPatient = await db.Patient.create({
      first_name: 'Alert',
      last_name: 'Patient',
      email: 'alert.patient@test.com',
      assigned_dietitian_id: dietitianAuth.user.id
    });
    await db.PatientDietitian.create({
      patient_id: testPatient.id,
      dietitian_id: dietitianAuth.user.id
    });

    // Measure definition with thresholds — alerts enabled
    measureDef = await db.MeasureDefinition.create({
      name: 'glucose_alert_test',
      display_name: 'Glucose',
      category: 'vitals',
      measure_type: 'numeric',
      unit: 'mg/dL',
      normal_range_min: 70,
      normal_range_max: 110,
      alert_threshold_min: 50,
      alert_threshold_max: 180,
      enable_alerts: true,
      is_active: true
    });
  });

  // ========================================
  // checkMeasureValue (pure function)
  // ========================================
  describe('checkMeasureValue', () => {
    it('should return info severity when value is within normal range', () => {
      const result = measureAlertsService.checkMeasureValue(90, measureDef);
      expect(result.severity).toBe('info');
      expect(result.alertType).toBeNull();
    });

    it('should return warning/below_normal when value is below normal_range_min', () => {
      const result = measureAlertsService.checkMeasureValue(60, measureDef);
      expect(result.severity).toBe('warning');
      expect(result.alertType).toBe('below_normal');
      expect(result.threshold).toBe(70);
    });

    it('should return warning/above_normal when value is above normal_range_max', () => {
      const result = measureAlertsService.checkMeasureValue(130, measureDef);
      expect(result.severity).toBe('warning');
      expect(result.alertType).toBe('above_normal');
      expect(result.threshold).toBe(110);
    });

    it('should return critical/below_critical when value is below alert_threshold_min', () => {
      const result = measureAlertsService.checkMeasureValue(40, measureDef);
      expect(result.severity).toBe('critical');
      expect(result.alertType).toBe('below_critical');
      expect(result.threshold).toBe(50);
    });

    it('should return critical/above_critical when value is above alert_threshold_max', () => {
      const result = measureAlertsService.checkMeasureValue(200, measureDef);
      expect(result.severity).toBe('critical');
      expect(result.alertType).toBe('above_critical');
      expect(result.threshold).toBe(180);
    });

    it('should handle null thresholds gracefully (no alert when no ranges set)', () => {
      const defNoRanges = {
        normal_range_min: null,
        normal_range_max: null,
        alert_threshold_min: null,
        alert_threshold_max: null
      };
      const result = measureAlertsService.checkMeasureValue(999, defNoRanges);
      expect(result.severity).toBe('info');
      expect(result.alertType).toBeNull();
    });
  });

  // ========================================
  // generateMeasureAlert
  // ========================================
  describe('generateMeasureAlert', () => {
    it('should create a warning alert when value is below normal range', async () => {
      const measuredAt = new Date(Date.now() - 1000);
      const measure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 60, // below normal_range_min (70)
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });

      const alert = await measureAlertsService.generateMeasureAlert(measure, measureDef, adminAuth.user);

      expect(alert).not.toBeNull();
      expect(alert.severity).toBe('warning');
      expect(alert.alert_type).toBe('below_normal');
      expect(alert.patient_id).toBe(testPatient.id);
    });

    it('should create a critical alert when value is below alert threshold', async () => {
      const measuredAt = new Date(Date.now() - 1000);
      const measure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 40, // below alert_threshold_min (50)
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });

      const alert = await measureAlertsService.generateMeasureAlert(measure, measureDef, adminAuth.user);

      expect(alert).not.toBeNull();
      expect(alert.severity).toBe('critical');
      expect(alert.alert_type).toBe('below_critical');
    });

    it('should return null when value is within normal range', async () => {
      const measuredAt = new Date(Date.now() - 1000);
      const measure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 90, // within normal range
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });

      const alert = await measureAlertsService.generateMeasureAlert(measure, measureDef, adminAuth.user);

      expect(alert).toBeNull();
    });

    it('should return null when enable_alerts is false', async () => {
      const defNoAlerts = await db.MeasureDefinition.create({
        name: 'no_alerts_def',
        display_name: 'No Alerts',
        category: 'vitals',
        measure_type: 'numeric',
        unit: 'x',
        normal_range_min: 10,
        normal_range_max: 20,
        enable_alerts: false,
        is_active: true
      });

      const measuredAt = new Date(Date.now() - 1000);
      const measure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: defNoAlerts.id,
        numeric_value: 5, // out of range but alerts disabled
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });

      const alert = await measureAlertsService.generateMeasureAlert(measure, defNoAlerts, adminAuth.user);

      expect(alert).toBeNull();
    });

    it('should skip duplicate alert within 24-hour cooldown', async () => {
      const measuredAt = new Date(Date.now() - 1000);
      const measure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 60,
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });

      // First alert — should be created
      const alert1 = await measureAlertsService.generateMeasureAlert(measure, measureDef, adminAuth.user);
      expect(alert1).not.toBeNull();

      // Second alert for same patient/measure — should be skipped (cooldown)
      const measure2 = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 62,
        measured_at: new Date(Date.now() - 500),
        recorded_by: adminAuth.user.id
      });

      const alert2 = await measureAlertsService.generateMeasureAlert(measure2, measureDef, adminAuth.user);
      expect(alert2).toBeNull();
    });
  });

  // ========================================
  // hasRecentAlert
  // ========================================
  describe('hasRecentAlert', () => {
    it('should return false when no alerts exist', async () => {
      const result = await measureAlertsService.hasRecentAlert(testPatient.id, measureDef.id, 24);
      expect(result).toBe(false);
    });

    it('should return true when a recent alert exists within the window', async () => {
      const measuredAt = new Date(Date.now() - 1000);
      const measure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 60,
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });

      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: measure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 60,
        threshold_value: 70,
        message: 'Test alert',
        email_sent: false
      });

      const result = await measureAlertsService.hasRecentAlert(testPatient.id, measureDef.id, 24);
      expect(result).toBe(true);
    });
  });

  // ========================================
  // getAllUnacknowledgedAlerts
  // ========================================
  describe('getAllUnacknowledgedAlerts', () => {
    let seededMeasure;

    beforeEach(async () => {
      const measuredAt = new Date(Date.now() - 1000);
      seededMeasure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 60,
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });
    });

    it('should return empty array when no unacknowledged alerts exist', async () => {
      const alerts = await measureAlertsService.getAllUnacknowledgedAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });

    it('should return unacknowledged alerts when they exist', async () => {
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 60,
        threshold_value: 70,
        message: 'Alert: glucose below normal',
        email_sent: false
      });

      const alerts = await measureAlertsService.getAllUnacknowledgedAlerts();
      expect(alerts.length).toBe(1);
      expect(alerts[0].acknowledged_at).toBeNull();
    });

    it('should not return acknowledged alerts', async () => {
      const alert = await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 60,
        threshold_value: 70,
        message: 'Already ack',
        email_sent: false,
        acknowledged_at: new Date(),
        acknowledged_by: adminAuth.user.id
      });

      const alerts = await measureAlertsService.getAllUnacknowledgedAlerts();
      expect(alerts.length).toBe(0);
    });

    it('should filter by severity when provided', async () => {
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 60,
        threshold_value: 70,
        message: 'Warning alert',
        email_sent: false
      });

      const criticalAlerts = await measureAlertsService.getAllUnacknowledgedAlerts({ severity: 'critical' });
      expect(criticalAlerts.length).toBe(0);

      const warningAlerts = await measureAlertsService.getAllUnacknowledgedAlerts({ severity: 'warning' });
      expect(warningAlerts.length).toBe(1);
    });
  });

  // ========================================
  // getPatientAlerts
  // ========================================
  describe('getPatientAlerts', () => {
    let seededMeasure;

    beforeEach(async () => {
      const measuredAt = new Date(Date.now() - 1000);
      seededMeasure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 55,
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });
    });

    it('should return empty array when patient has no alerts', async () => {
      const alerts = await measureAlertsService.getPatientAlerts(testPatient.id);
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });

    it('should return unacknowledged alerts for the patient', async () => {
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 55,
        threshold_value: 70,
        message: 'Glucose low',
        email_sent: false
      });

      const alerts = await measureAlertsService.getPatientAlerts(testPatient.id);
      expect(alerts.length).toBe(1);
      expect(alerts[0].patient_id).toBe(testPatient.id);
    });

    it('should exclude acknowledged alerts by default', async () => {
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 55,
        threshold_value: 70,
        message: 'Ack alert',
        email_sent: false,
        acknowledged_at: new Date(),
        acknowledged_by: adminAuth.user.id
      });

      const alerts = await measureAlertsService.getPatientAlerts(testPatient.id);
      expect(alerts.length).toBe(0);
    });

    it('should include acknowledged alerts when includeAcknowledged is true', async () => {
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 55,
        threshold_value: 70,
        message: 'Ack alert included',
        email_sent: false,
        acknowledged_at: new Date(),
        acknowledged_by: adminAuth.user.id
      });

      const alerts = await measureAlertsService.getPatientAlerts(testPatient.id, { includeAcknowledged: true });
      expect(alerts.length).toBe(1);
    });
  });

  // ========================================
  // acknowledgeAlert
  // ========================================
  describe('acknowledgeAlert', () => {
    let testAlert, seededMeasure;

    beforeEach(async () => {
      const measuredAt = new Date(Date.now() - 1000);
      seededMeasure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 60,
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });

      testAlert = await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 60,
        threshold_value: 70,
        message: 'Acknowledge this alert',
        email_sent: false
      });
    });

    it('should mark an alert as acknowledged', async () => {
      const result = await measureAlertsService.acknowledgeAlert(testAlert.id, adminAuth.user.id);

      expect(result.acknowledged_at).not.toBeNull();
      expect(result.acknowledged_by).toBe(adminAuth.user.id);
    });

    it('should throw an error when alert does not exist', async () => {
      const fakeId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      await expect(
        measureAlertsService.acknowledgeAlert(fakeId, adminAuth.user.id)
      ).rejects.toThrow('Alert not found');
    });

    it('should throw an error when alert is already acknowledged', async () => {
      // First acknowledgement
      await measureAlertsService.acknowledgeAlert(testAlert.id, adminAuth.user.id);

      // Second acknowledgement — should throw
      await expect(
        measureAlertsService.acknowledgeAlert(testAlert.id, adminAuth.user.id)
      ).rejects.toThrow('Alert already acknowledged');
    });
  });

  // ========================================
  // acknowledgePatientAlerts
  // ========================================
  describe('acknowledgePatientAlerts', () => {
    let seededMeasure;

    beforeEach(async () => {
      const measuredAt = new Date(Date.now() - 1000);
      seededMeasure = await db.PatientMeasure.create({
        patient_id: testPatient.id,
        measure_definition_id: measureDef.id,
        numeric_value: 55,
        measured_at: measuredAt,
        recorded_by: adminAuth.user.id
      });
    });

    it('should return 0 when no unacknowledged alerts exist', async () => {
      const count = await measureAlertsService.acknowledgePatientAlerts(
        testPatient.id,
        adminAuth.user.id
      );
      expect(count).toBe(0);
    });

    it('should acknowledge all unacknowledged alerts for a patient', async () => {
      // Create 2 alerts
      for (let i = 0; i < 2; i++) {
        await db.MeasureAlert.create({
          patient_id: testPatient.id,
          patient_measure_id: seededMeasure.id,
          measure_definition_id: measureDef.id,
          severity: 'warning',
          alert_type: 'below_normal',
          value: 55 + i,
          threshold_value: 70,
          message: `Bulk ack alert ${i}`,
          email_sent: false
        });
      }

      const count = await measureAlertsService.acknowledgePatientAlerts(
        testPatient.id,
        adminAuth.user.id
      );
      expect(count).toBe(2);

      // Verify all are acknowledged
      const remaining = await measureAlertsService.getPatientAlerts(testPatient.id);
      expect(remaining.length).toBe(0);
    });

    it('should only acknowledge alerts matching the severity filter', async () => {
      // 1 warning, 1 critical
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'warning',
        alert_type: 'below_normal',
        value: 55,
        threshold_value: 70,
        message: 'Warning alert',
        email_sent: false
      });
      await db.MeasureAlert.create({
        patient_id: testPatient.id,
        patient_measure_id: seededMeasure.id,
        measure_definition_id: measureDef.id,
        severity: 'critical',
        alert_type: 'below_critical',
        value: 40,
        threshold_value: 50,
        message: 'Critical alert',
        email_sent: false
      });

      const count = await measureAlertsService.acknowledgePatientAlerts(
        testPatient.id,
        adminAuth.user.id,
        { severity: 'warning' }
      );
      expect(count).toBe(1);

      // Critical alert should still be unacknowledged
      const remaining = await measureAlertsService.getPatientAlerts(testPatient.id);
      expect(remaining.length).toBe(1);
      expect(remaining[0].severity).toBe('critical');
    });
  });
});
