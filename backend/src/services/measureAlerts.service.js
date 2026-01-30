/**
 * Measure Alerts Service
 *
 * Handles generation and management of alerts for out-of-range health measures
 *
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 */

const db = require('../../../models');
const MeasureAlert = db.MeasureAlert;
const MeasureDefinition = db.MeasureDefinition;
const PatientMeasure = db.PatientMeasure;
const Patient = db.Patient;
const User = db.User;
const { Op } = db.Sequelize;
const emailService = require('./email.service');
const { formatDateTime } = require('../utils/timezone');

/**
 * Check measure value and calculate severity level
 * @param {number} value - The measured value
 * @param {Object} measureDef - MeasureDefinition instance
 * @returns {Object} { severity: string, alertType: string, threshold: number }
 */
function checkMeasureValue(value, measureDef) {
  const numValue = parseFloat(value);

  // Check critical thresholds first
  if (measureDef.alert_threshold_min !== null && numValue < parseFloat(measureDef.alert_threshold_min)) {
    return {
      severity: 'critical',
      alertType: 'below_critical',
      threshold: parseFloat(measureDef.alert_threshold_min)
    };
  }

  if (measureDef.alert_threshold_max !== null && numValue > parseFloat(measureDef.alert_threshold_max)) {
    return {
      severity: 'critical',
      alertType: 'above_critical',
      threshold: parseFloat(measureDef.alert_threshold_max)
    };
  }

  // Check normal range (warning level)
  if (measureDef.normal_range_min !== null && numValue < parseFloat(measureDef.normal_range_min)) {
    return {
      severity: 'warning',
      alertType: 'below_normal',
      threshold: parseFloat(measureDef.normal_range_min)
    };
  }

  if (measureDef.normal_range_max !== null && numValue > parseFloat(measureDef.normal_range_max)) {
    return {
      severity: 'warning',
      alertType: 'above_normal',
      threshold: parseFloat(measureDef.normal_range_max)
    };
  }

  // Within normal range
  return {
    severity: 'info',
    alertType: null,
    threshold: null
  };
}

/**
 * Check if there's a recent alert to prevent duplicates
 * @param {string} patientId - Patient UUID
 * @param {string} measureDefId - MeasureDefinition UUID
 * @param {number} hours - Hours to look back (default 24)
 * @returns {Promise<boolean>} True if recent alert exists
 */
async function hasRecentAlert(patientId, measureDefId, hours = 24) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  const recentAlert = await MeasureAlert.findOne({
    where: {
      patient_id: patientId,
      measure_definition_id: measureDefId,
      created_at: {
        [Op.gte]: cutoffTime
      }
    },
    order: [['created_at', 'DESC']]
  });

  return !!recentAlert;
}

/**
 * Generate alert message based on alert type
 * @param {Object} params - Message parameters
 * @returns {string} Alert message
 */
function generateAlertMessage({ measureName, value, unit, alertType, threshold, patientName }) {
  const formattedValue = `${parseFloat(value).toFixed(2)} ${unit || ''}`.trim();
  const formattedThreshold = threshold ? `${parseFloat(threshold).toFixed(2)} ${unit || ''}`.trim() : '';

  switch (alertType) {
    case 'below_critical':
      return `CRITICAL: ${patientName}'s ${measureName} is critically low (${formattedValue}), below threshold of ${formattedThreshold}`;
    case 'above_critical':
      return `CRITICAL: ${patientName}'s ${measureName} is critically high (${formattedValue}), above threshold of ${formattedThreshold}`;
    case 'below_normal':
      return `WARNING: ${patientName}'s ${measureName} is below normal range (${formattedValue}), expected minimum is ${formattedThreshold}`;
    case 'above_normal':
      return `WARNING: ${patientName}'s ${measureName} is above normal range (${formattedValue}), expected maximum is ${formattedThreshold}`;
    default:
      return `${patientName}'s ${measureName}: ${formattedValue}`;
  }
}

/**
 * Generate measure alert for out-of-range value
 * @param {Object} patientMeasure - PatientMeasure instance
 * @param {Object} measureDef - MeasureDefinition instance
 * @param {Object} user - User who recorded the measure
 * @returns {Promise<Object|null>} Created alert or null
 */
async function generateMeasureAlert(patientMeasure, measureDef, user) {
  try {
    // Skip if alerts not enabled for this measure
    if (!measureDef.enable_alerts) {
      return null;
    }

    // Skip if no ranges configured
    if (!measureDef.normal_range_min && !measureDef.normal_range_max &&
        !measureDef.alert_threshold_min && !measureDef.alert_threshold_max) {
      return null;
    }

    // Get the numeric value
    const value = measureDef.getValue(patientMeasure);
    if (value === null || value === undefined) {
      return null;
    }

    // Check the value against ranges
    const check = checkMeasureValue(value, measureDef);

    // If within normal range, no alert needed
    if (check.severity === 'info' || !check.alertType) {
      return null;
    }

    // Check for recent duplicate alerts (24-hour cooldown)
    const hasRecent = await hasRecentAlert(
      patientMeasure.patient_id,
      patientMeasure.measure_definition_id,
      24
    );

    if (hasRecent) {
      console.log(`⏭️  Skipping duplicate alert for patient ${patientMeasure.patient_id}, measure ${measureDef.display_name}`);
      return null;
    }

    // Load patient for alert message
    const patient = await Patient.findByPk(patientMeasure.patient_id);
    if (!patient) {
      console.error('❌ Patient not found for alert generation');
      return null;
    }

    // Generate alert message
    const message = generateAlertMessage({
      measureName: measureDef.display_name,
      value,
      unit: measureDef.unit,
      alertType: check.alertType,
      threshold: check.threshold,
      patientName: `${patient.first_name} ${patient.last_name}`
    });

    // Create the alert
    const alert = await MeasureAlert.create({
      patient_id: patientMeasure.patient_id,
      patient_measure_id: patientMeasure.id,
      measure_definition_id: patientMeasure.measure_definition_id,
      severity: check.severity,
      alert_type: check.alertType,
      value,
      threshold_value: check.threshold,
      message,
      email_sent: false
    });

    console.log(`🚨 Alert created: ${check.severity} - ${message}`);

    // Send email notification for critical alerts
    if (check.severity === 'critical') {
      await sendAlertEmail(alert, patientMeasure, measureDef, patient);
    }

    return alert;
  } catch (error) {
    console.error('❌ Error generating measure alert:', error);
    // Don't throw - we don't want alert generation to break measure recording
    return null;
  }
}

/**
 * Send email notification for measure alert
 * @param {Object} alert - MeasureAlert instance
 * @param {Object} patientMeasure - PatientMeasure instance
 * @param {Object} measureDef - MeasureDefinition instance
 * @param {Object} patient - Patient instance
 * @returns {Promise<boolean>} True if email sent successfully
 */
async function sendAlertEmail(alert, patientMeasure, measureDef, patient) {
  try {
    // Get the practitioner assigned to the patient
    const practitioner = patient.assigned_dietitian_id
      ? await User.findByPk(patient.assigned_dietitian_id)
      : null;

    if (!practitioner || !practitioner.email) {
      console.log('⚠️  No practitioner email available for alert notification');
      return false;
    }

    const subject = `🚨 CRITICAL ALERT: ${measureDef.display_name} - ${patient.first_name} ${patient.last_name}`;

    const formattedValue = `${parseFloat(alert.value).toFixed(2)} ${measureDef.unit || ''}`.trim();
    const formattedThreshold = alert.threshold_value
      ? `${parseFloat(alert.threshold_value).toFixed(2)} ${measureDef.unit || ''}`.trim()
      : 'N/A';

    const text = `
CRITICAL HEALTH ALERT

Patient: ${patient.first_name} ${patient.last_name}${patient.email ? ` (${patient.email})` : ''}
Measure: ${measureDef.display_name}
Value: ${formattedValue}
Threshold: ${formattedThreshold}
Alert Type: ${alert.alert_type.replace(/_/g, ' ').toUpperCase()}

Message: ${alert.message}

Recorded: ${formatDateTime(patientMeasure.measured_at, 'fr')}
Recorded by: ${patientMeasure.recorder ? `${patientMeasure.recorder.first_name} ${patientMeasure.recorder.last_name}` : 'System'}

Please review and take appropriate action.

---
NutriVault Alert System
    `.trim();

    const severityColor = alert.severity === 'critical' ? '#dc3545' : '#ffc107';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${severityColor}; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .alert-details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid ${severityColor}; }
    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
    .value { font-size: 24px; font-weight: bold; color: ${severityColor}; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 CRITICAL HEALTH ALERT</h1>
    </div>
    <div class="content">
      <p>Dear ${practitioner.first_name},</p>
      <p>A critical health measure has been recorded for one of your patients:</p>

      <div class="alert-details">
        <p><span class="label">Patient:</span> ${patient.first_name} ${patient.last_name}</p>
        ${patient.email ? `<p><span class="label">Email:</span> ${patient.email}</p>` : ''}
        <hr>
        <p><span class="label">Measure:</span> ${measureDef.display_name}</p>
        <p><span class="label">Value:</span> <span class="value">${formattedValue}</span></p>
        <p><span class="label">Threshold:</span> ${formattedThreshold}</p>
        <p><span class="label">Alert Type:</span> ${alert.alert_type.replace(/_/g, ' ').toUpperCase()}</p>
        <hr>
        <p><em>${alert.message}</em></p>
        <hr>
        <p><span class="label">Recorded:</span> ${formatDateTime(patientMeasure.measured_at, 'fr')}</p>
      </div>

      <p>Please review this alert and take appropriate action.</p>
      <p>Best regards,<br><strong>NutriVault Alert System</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated alert. Please log in to NutriVault to review patient details.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const result = await emailService.sendEmail({
      to: practitioner.email,
      subject,
      text,
      html
    });

    if (result.success) {
      // Update alert to mark email as sent
      alert.email_sent = true;
      alert.email_sent_at = new Date();
      await alert.save();
      console.log(`✅ Alert email sent to ${practitioner.email}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error sending alert email:', error);
    return false;
  }
}

/**
 * Get all unacknowledged alerts
 * @param {Object} options - Query options
 * @param {string} options.severity - Filter by severity (optional)
 * @param {number} options.limit - Limit results (default 100)
 * @returns {Promise<Array>} Array of alerts
 */
async function getAllUnacknowledgedAlerts(options = {}) {
  const { severity, limit = 100 } = options;

  const where = {
    acknowledged_at: null
  };

  if (severity) {
    where.severity = severity;
  }

  const alerts = await MeasureAlert.findAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['id', 'display_name', 'unit', 'category']
      }
    ],
    order: [
      ['severity', 'DESC'], // Critical first
      ['created_at', 'DESC']
    ],
    limit
  });

  return alerts;
}

/**
 * Get alerts for a specific patient
 * @param {string} patientId - Patient UUID
 * @param {Object} options - Query options
 * @param {boolean} options.includeAcknowledged - Include acknowledged alerts
 * @param {number} options.limit - Limit results (default 50)
 * @returns {Promise<Array>} Array of alerts
 */
async function getPatientAlerts(patientId, options = {}) {
  const { includeAcknowledged = false, limit = 50 } = options;

  const where = { patient_id: patientId };

  if (!includeAcknowledged) {
    where.acknowledged_at = null;
  }

  const alerts = await MeasureAlert.findAll({
    where,
    include: [
      {
        model: MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['id', 'display_name', 'unit', 'category']
      },
      {
        model: User,
        as: 'acknowledger',
        attributes: ['id', 'first_name', 'last_name'],
        required: false
      }
    ],
    order: [['created_at', 'DESC']],
    limit
  });

  return alerts;
}

/**
 * Acknowledge a single alert
 * @param {string} alertId - Alert UUID
 * @param {string} userId - User UUID who is acknowledging
 * @returns {Promise<Object>} Updated alert
 */
async function acknowledgeAlert(alertId, userId) {
  const alert = await MeasureAlert.findByPk(alertId);

  if (!alert) {
    throw new Error('Alert not found');
  }

  if (alert.acknowledged_at) {
    throw new Error('Alert already acknowledged');
  }

  await alert.acknowledge(userId);

  console.log(`✅ Alert ${alertId} acknowledged by user ${userId}`);

  return alert;
}

/**
 * Acknowledge multiple alerts for a patient
 * @param {string} patientId - Patient UUID
 * @param {string} userId - User UUID who is acknowledging
 * @param {Object} options - Options
 * @param {string} options.severity - Only acknowledge alerts of this severity
 * @param {string} options.measureDefinitionId - Only acknowledge alerts for this measure
 * @returns {Promise<number>} Number of alerts acknowledged
 */
async function acknowledgePatientAlerts(patientId, userId, options = {}) {
  const { severity, measureDefinitionId } = options;

  const where = {
    patient_id: patientId,
    acknowledged_at: null
  };

  if (severity) {
    where.severity = severity;
  }

  if (measureDefinitionId) {
    where.measure_definition_id = measureDefinitionId;
  }

  const [count] = await MeasureAlert.update(
    {
      acknowledged_at: new Date(),
      acknowledged_by: userId
    },
    { where }
  );

  console.log(`✅ Acknowledged ${count} alerts for patient ${patientId}`);

  return count;
}

module.exports = {
  checkMeasureValue,
  generateMeasureAlert,
  hasRecentAlert,
  sendAlertEmail,
  getAllUnacknowledgedAlerts,
  getPatientAlerts,
  acknowledgeAlert,
  acknowledgePatientAlerts
};
