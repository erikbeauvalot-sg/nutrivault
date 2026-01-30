/**
 * Appointment Reminder Controller
 * Handles HTTP requests for appointment reminder functionality
 */

const appointmentReminderService = require('../services/appointmentReminder.service');
const schedulerService = require('../services/scheduler.service');
const db = require('../../../models');

const { Patient } = db;

/**
 * POST /api/appointment-reminders/send/:visitId
 * Manual send reminder for specific visit (email without calendar invitation)
 */
const sendReminderManually = async (req, res) => {
  try {
    const { visitId } = req.params;
    const userId = req.user.id;

    const result = await appointmentReminderService.sendVisitReminder(
      visitId,
      userId,
      true // manual send
    );

    res.json({
      success: true,
      message: 'Appointment reminder sent successfully',
      data: result
    });
  } catch (error) {
    console.error('[AppointmentReminderController] Error sending manual reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to send appointment reminder'
    });
  }
};

/**
 * POST /api/appointment-reminders/invite/:visitId
 * Send calendar invitation for specific visit (email with ICS as MIME - recognized by Gmail)
 */
const sendInvitationManually = async (req, res) => {
  try {
    const { visitId } = req.params;
    const userId = req.user.id;

    const result = await appointmentReminderService.sendVisitInvitation(
      visitId,
      userId
    );

    res.json({
      success: true,
      message: 'Calendar invitation sent successfully',
      data: result
    });
  } catch (error) {
    console.error('[AppointmentReminderController] Error sending calendar invitation:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to send calendar invitation'
    });
  }
};

/**
 * POST /api/appointment-reminders/batch/send-now
 * Trigger batch reminder job manually (admin only)
 */
const sendBatchReminders = async (req, res) => {
  try {
    const result = await schedulerService.triggerAppointmentRemindersNow();

    res.json({
      success: true,
      message: 'Batch reminder job completed',
      data: result
    });
  } catch (error) {
    console.error('[AppointmentReminderController] Error triggering batch reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger batch reminders'
    });
  }
};

/**
 * GET /api/appointment-reminders/stats
 * Get reminder statistics
 */
const getReminderStats = async (req, res) => {
  try {
    const stats = await appointmentReminderService.getReminderStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[AppointmentReminderController] Error getting reminder stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get reminder statistics'
    });
  }
};

/**
 * POST /api/appointment-reminders/unsubscribe/:token
 * Public endpoint - unsubscribe patient from reminders
 */
const unsubscribeFromReminders = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Unsubscribe token is required'
      });
    }

    // Find patient by unsubscribe token
    const patient = await Patient.findOne({
      where: { unsubscribe_token: token }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Invalid unsubscribe token'
      });
    }

    // Update patient preference
    await patient.update({
      appointment_reminders_enabled: false
    });

    res.json({
      success: true,
      message: 'You have been unsubscribed from appointment reminders',
      data: {
        patientId: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name
      }
    });
  } catch (error) {
    console.error('[AppointmentReminderController] Error unsubscribing patient:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unsubscribe from reminders'
    });
  }
};

/**
 * POST /api/appointment-reminders/resubscribe
 * Re-enable reminders for patient (authenticated)
 */
const resubscribeToReminders = async (req, res) => {
  try {
    const userId = req.user.id;

    // For now, assuming the user is associated with a patient
    // In a real system, you'd need to determine which patient to resubscribe
    // This endpoint might need to be patient-specific
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required'
      });
    }

    const patient = await Patient.findByPk(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    await patient.update({
      appointment_reminders_enabled: true
    });

    res.json({
      success: true,
      message: 'You have been resubscribed to appointment reminders',
      data: {
        patientId: patient.id,
        appointmentRemindersEnabled: patient.appointment_reminders_enabled
      }
    });
  } catch (error) {
    console.error('[AppointmentReminderController] Error resubscribing patient:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resubscribe to reminders'
    });
  }
};

module.exports = {
  sendReminderManually,
  sendInvitationManually,
  sendBatchReminders,
  getReminderStats,
  unsubscribeFromReminders,
  resubscribeToReminders
};
