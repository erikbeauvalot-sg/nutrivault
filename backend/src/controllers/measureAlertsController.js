/**
 * Measure Alerts Controller
 *
 * Handles HTTP requests for measure alerts.
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 */

const measureAlertsService = require('../services/measureAlerts.service');

/**
 * GET /api/measure-alerts
 * Get all unacknowledged measure alerts
 */
async function getAllUnacknowledgedAlerts(req, res) {
  try {
    const options = {
      severity: req.query.severity,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const alerts = await measureAlertsService.getAllUnacknowledgedAlerts(options);

    // Group by severity for easier dashboard rendering
    const grouped = {
      critical: alerts.filter(a => a.severity === 'critical'),
      warning: alerts.filter(a => a.severity === 'warning'),
      info: alerts.filter(a => a.severity === 'info')
    };

    res.json({
      success: true,
      data: alerts,
      grouped,
      count: alerts.length,
      summary: {
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        info: grouped.info.length
      }
    });
  } catch (error) {
    console.error('Error in getAllUnacknowledgedAlerts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch measure alerts'
    });
  }
}

/**
 * GET /api/patients/:patientId/measure-alerts
 * Get measure alerts for a specific patient
 */
async function getPatientAlerts(req, res) {
  try {
    const { patientId } = req.params;

    const options = {
      includeAcknowledged: req.query.include_acknowledged === 'true',
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const alerts = await measureAlertsService.getPatientAlerts(patientId, options);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error in getPatientAlerts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch patient measure alerts'
    });
  }
}

/**
 * PATCH /api/measure-alerts/:id/acknowledge
 * Acknowledge a single measure alert
 */
async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const alert = await measureAlertsService.acknowledgeAlert(id, userId);

    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error in acknowledgeAlert:', error);
    const statusCode = error.message === 'Alert not found' ? 404 :
                       error.message === 'Alert already acknowledged' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to acknowledge alert'
    });
  }
}

/**
 * POST /api/patients/:patientId/measure-alerts/acknowledge
 * Acknowledge multiple measure alerts for a patient
 */
async function acknowledgePatientAlerts(req, res) {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;

    const options = {
      severity: req.body.severity,
      measureDefinitionId: req.body.measure_definition_id
    };

    const count = await measureAlertsService.acknowledgePatientAlerts(
      patientId,
      userId,
      options
    );

    res.json({
      success: true,
      message: `${count} alert(s) acknowledged successfully`,
      count
    });
  } catch (error) {
    console.error('Error in acknowledgePatientAlerts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to acknowledge patient alerts'
    });
  }
}

module.exports = {
  getAllUnacknowledgedAlerts,
  getPatientAlerts,
  acknowledgeAlert,
  acknowledgePatientAlerts
};
