/**
 * Email Log Controller
 * Handles HTTP requests for email communication logs
 */

const emailLogService = require('../services/emailLog.service');

/**
 * Get email logs for a patient
 * GET /api/patients/:patientId/email-logs
 */
async function getPatientEmailLogs(req, res) {
  try {
    const { patientId } = req.params;
    const {
      email_type,
      status,
      startDate,
      endDate,
      limit,
      offset,
      sortBy,
      sortOrder
    } = req.query;

    const result = await emailLogService.getPatientEmailLogs(patientId, {
      email_type,
      status,
      startDate,
      endDate,
      limit,
      offset,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: result.rows,
      total: result.count,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });
  } catch (error) {
    console.error('Error fetching patient email logs:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email logs'
    });
  }
}

/**
 * Get a single email log by ID
 * GET /api/email-logs/:id
 */
async function getEmailLog(req, res) {
  try {
    const { id } = req.params;
    const emailLog = await emailLogService.getEmailLogById(id);

    if (!emailLog) {
      return res.status(404).json({
        success: false,
        error: 'Email log not found'
      });
    }

    res.json({
      success: true,
      data: emailLog
    });
  } catch (error) {
    console.error('Error fetching email log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email log'
    });
  }
}

/**
 * Get email statistics for a patient
 * GET /api/patients/:patientId/email-stats
 */
async function getPatientEmailStats(req, res) {
  try {
    const { patientId } = req.params;
    const stats = await emailLogService.getPatientEmailStats(patientId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email statistics'
    });
  }
}

/**
 * Get available email types
 * GET /api/email-logs/types
 */
async function getEmailTypes(req, res) {
  try {
    const types = emailLogService.getEmailTypes();
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Error fetching email types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email types'
    });
  }
}

/**
 * Get email logs for a visit
 * GET /api/visits/:visitId/email-logs
 */
async function getVisitEmailLogs(req, res) {
  try {
    const { visitId } = req.params;
    const result = await emailLogService.getVisitEmailLogs(visitId);

    res.json({
      success: true,
      data: result.rows,
      total: result.count
    });
  } catch (error) {
    console.error('Error fetching visit email logs:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email logs'
    });
  }
}

module.exports = {
  getPatientEmailLogs,
  getEmailLog,
  getPatientEmailStats,
  getEmailTypes,
  getVisitEmailLogs
};
