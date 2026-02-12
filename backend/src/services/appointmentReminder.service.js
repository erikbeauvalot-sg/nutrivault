/**
 * Appointment Reminder Service
 * Handles automated appointment reminder emails
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const emailService = require('./email.service');
const templateRendererService = require('./templateRenderer.service');
const { generateICalEvent } = require('../utils/icsGenerator');

const { Visit, Patient, User, EmailTemplate, SystemSetting, EmailLog } = db;

/**
 * Get eligible visits for reminders based on time threshold
 * @param {number} reminderHoursBefore - Hours before appointment to send reminder
 * @returns {Promise<Array>} List of eligible visits
 */
async function getEligibleVisits(reminderHoursBefore) {
  try {
    const now = new Date();

    // Calculate time window for this reminder threshold
    // We want visits that are exactly reminderHoursBefore away (with ±1 hour tolerance)
    const targetTime = new Date(now.getTime() + reminderHoursBefore * 60 * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - 60 * 60 * 1000); // -1 hour
    const windowEnd = new Date(targetTime.getTime() + 60 * 60 * 1000); // +1 hour

    // Get max reminders setting
    const maxReminders = await SystemSetting.getValue('max_reminders_per_visit') || 2;

    // 12 hours ago (prevent duplicate sends)
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const visits = await Visit.findAll({
      where: {
        status: 'SCHEDULED',
        visit_date: {
          [Op.between]: [windowStart, windowEnd]
        },
        reminders_sent: {
          [Op.lt]: maxReminders
        },
        [Op.or]: [
          { last_reminder_date: null },
          { last_reminder_date: { [Op.lt]: twelveHoursAgo } }
        ]
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          where: {
            email: { [Op.ne]: null },
            appointment_reminders_enabled: true
          },
          required: true
        },
        {
          model: User,
          as: 'dietitian',
          required: true
        }
      ]
    });

    console.log(`[AppointmentReminder] Found ${visits.length} eligible visits for ${reminderHoursBefore}h reminder window`);
    return visits;
  } catch (error) {
    console.error('[AppointmentReminder] Error finding eligible visits:', error);
    throw error;
  }
}

/**
 * Send appointment reminder email for a specific visit
 * @param {string} visitId - Visit ID
 * @param {string} userId - User ID triggering the send (for audit)
 * @param {boolean} manual - Whether this is a manual send (default: false)
 * @returns {Promise<Object>} Result of the send operation
 */
async function sendVisitReminder(visitId, userId, manual = false) {
  let visit = null;
  try {
    // Get visit with patient and dietitian
    visit = await Visit.findByPk(visitId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          required: true
        },
        {
          model: User,
          as: 'dietitian',
          required: true
        }
      ]
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    // Always require email address (can't send without one)
    if (!visit.patient.email) {
      throw new Error('Patient has no email address');
    }

    // Always validate status and date
    if (visit.status !== 'SCHEDULED') {
      throw new Error('Visit is not scheduled');
    }

    if (new Date(visit.visit_date) <= new Date()) {
      throw new Error('Visit is in the past');
    }

    if (!visit.patient.appointment_reminders_enabled) {
      throw new Error('Patient has opted out of appointment reminders');
    }

    // Only check max reminders for automatic sends (allow manual override)
    if (!manual) {
      const maxReminders = await SystemSetting.getValue('max_reminders_per_visit') || 2;
      if (visit.reminders_sent >= maxReminders) {
        throw new Error('Maximum reminders already sent for this visit');
      }
    }

    // Get appointment reminder template
    const template = await EmailTemplate.findOne({
      where: {
        category: 'appointment_reminder',
        is_active: true
      }
    });

    if (!template) {
      throw new Error('No active appointment reminder template found');
    }

    // Prepare template data
    const templateData = {
      patient: visit.patient,
      visit: visit,
      dietitian: visit.dietitian
    };

    // Build variable context
    const variableContext = templateRendererService.buildVariableContext(templateData);

    // Render template
    const rendered = templateRendererService.renderTemplate(template, variableContext);

    // Send reminder email (without calendar invitation)
    const emailResult = await emailService.sendEmail({
      to: visit.patient.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      sendingUserId: visit.dietitian_id
    });

    // Update visit reminder tracking
    await visit.update({
      reminders_sent: visit.reminders_sent + 1,
      last_reminder_date: new Date()
    });

    // Send push notification in addition to email
    try {
      const pushNotificationService = require('./pushNotification.service');
      await pushNotificationService.sendAppointmentReminder(visit);
    } catch (pushErr) {
      // Non-critical: log and continue
      console.error('[AppointmentReminder] Push notification failed:', pushErr.message);
    }

    // Log email
    await EmailLog.create({
      template_id: template.id,
      template_slug: template.slug,
      email_type: 'reminder',
      sent_to: visit.patient.email,
      patient_id: visit.patient.id,
      visit_id: visit.id,
      subject: rendered.subject,
      body_html: rendered.html,
      body_text: rendered.text,
      status: 'sent',
      sent_by: userId,
      variables_used: {
        visit_id: visit.id,
        visit_date: visit.visit_date,
        manual_send: manual,
        message_id: emailResult.messageId
      }
    });

    console.log(`[AppointmentReminder] Sent reminder for visit ${visitId} to ${visit.patient.email}`);

    return {
      success: true,
      visitId: visit.id,
      patientEmail: visit.patient.email,
      remindersSent: visit.reminders_sent
    };
  } catch (error) {
    console.error(`[AppointmentReminder] Error sending reminder for visit ${visitId}:`, error);

    // Log failed attempt
    try {
      await EmailLog.create({
        template_slug: 'appointment_reminder',
        sent_to: visit?.patient?.email || 'unknown@example.com',
        patient_id: visit?.patient?.id,
        subject: 'Appointment Reminder',
        status: 'failed',
        error_message: error.message,
        sent_by: userId,
        variables_used: {
          visit_id: visitId,
          manual_send: manual
        }
      });
    } catch (logError) {
      console.error('[AppointmentReminder] Error logging failed send:', logError);
    }

    throw error;
  }
}

/**
 * Send calendar invitation email for a specific visit (with ICS as MIME)
 * Gmail and other email clients will recognize this as a calendar invitation
 * @param {string} visitId - Visit ID
 * @param {string} userId - User ID triggering the send (for audit)
 * @returns {Promise<Object>} Result of the send operation
 */
async function sendVisitInvitation(visitId, userId) {
  try {
    // Get visit with patient and dietitian
    const visit = await Visit.findByPk(visitId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          required: true
        },
        {
          model: User,
          as: 'dietitian',
          required: true
        }
      ]
    });

    if (!visit) {
      throw new Error('Visit not found');
    }

    if (!visit.patient.email) {
      throw new Error('Patient has no email address');
    }

    if (visit.status !== 'SCHEDULED') {
      throw new Error('Visit is not scheduled');
    }

    if (new Date(visit.visit_date) <= new Date()) {
      throw new Error('Visit is in the past');
    }

    // Get appointment invitation template (or fallback to reminder template)
    let template = await EmailTemplate.findOne({
      where: {
        category: 'appointment_invitation',
        is_active: true
      }
    });

    // Fallback to reminder template if no specific invitation template exists
    if (!template) {
      template = await EmailTemplate.findOne({
        where: {
          category: 'appointment_reminder',
          is_active: true
        }
      });
    }

    if (!template) {
      throw new Error('No active appointment template found');
    }

    // Prepare template data
    const templateData = {
      patient: visit.patient,
      visit: visit,
      dietitian: visit.dietitian
    };

    // Build variable context
    const variableContext = templateRendererService.buildVariableContext(templateData);

    // Render template
    const rendered = templateRendererService.renderTemplate(template, variableContext);

    // Generate iCalendar event (Gmail will recognize this as a calendar invitation)
    const icalEvent = generateICalEvent({
      visit,
      patient: visit.patient,
      dietitian: visit.dietitian
    });

    // Send email with iCalendar event (displayed as invitation in Gmail)
    const emailResult = await emailService.sendEmail({
      to: visit.patient.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      icalEvent,
      sendingUserId: visit.dietitian_id || userId
    });

    // Log email
    await EmailLog.create({
      template_id: template.id,
      template_slug: template.slug,
      email_type: 'invitation',
      sent_to: visit.patient.email,
      patient_id: visit.patient.id,
      visit_id: visit.id,
      subject: rendered.subject,
      body_html: rendered.html,
      body_text: rendered.text,
      status: 'sent',
      sent_by: userId,
      variables_used: {
        visit_id: visit.id,
        visit_date: visit.visit_date,
        invitation: true,
        message_id: emailResult.messageId
      }
    });

    console.log(`[AppointmentInvitation] Sent invitation for visit ${visitId} to ${visit.patient.email}`);

    return {
      success: true,
      visitId: visit.id,
      patientEmail: visit.patient.email,
      type: 'invitation'
    };
  } catch (error) {
    console.error(`[AppointmentInvitation] Error sending invitation for visit ${visitId}:`, error);

    // Log failed attempt
    try {
      await EmailLog.create({
        template_slug: 'appointment_invitation',
        email_type: 'invitation',
        sent_to: 'unknown@example.com',
        subject: 'Appointment Invitation',
        status: 'failed',
        error_message: error.message,
        sent_by: userId,
        variables_used: {
          visit_id: visitId,
          invitation: true
        }
      });
    } catch (logError) {
      console.error('[AppointmentInvitation] Error logging failed send:', logError);
    }

    throw error;
  }
}

/**
 * Process all scheduled reminders (called by cron job)
 * @returns {Promise<Object>} Summary of reminders sent
 */
async function processScheduledReminders() {
  try {
    console.log('[AppointmentReminder] Starting scheduled reminder batch...');

    // Check if reminders are enabled
    const remindersEnabled = await SystemSetting.getValue('appointment_reminders_enabled');
    if (!remindersEnabled) {
      console.log('[AppointmentReminder] Reminders are disabled in settings');
      return {
        success: true,
        remindersEnabled: false,
        totalSent: 0
      };
    }

    // Get system default reminder time thresholds
    const systemReminderTimes = await SystemSetting.getValue('appointment_reminder_times') || [1, 24];

    console.log(`[AppointmentReminder] System default reminder windows: ${systemReminderTimes.join(', ')} hours before appointment`);

    let totalSent = 0;
    let totalFailed = 0;
    const results = [];

    // Collect all unique reminder times (system defaults + patient custom)
    const allReminderTimes = new Set(systemReminderTimes);

    // Load all custom patient reminder preferences
    const customPrefs = await db.NotificationPreference.findAll({
      where: { reminder_times_hours: { [Op.ne]: null } },
      attributes: ['user_id', 'reminder_times_hours'],
    });
    const userCustomTimes = {};
    for (const pref of customPrefs) {
      const times = pref.reminder_times_hours;
      if (Array.isArray(times)) {
        userCustomTimes[pref.user_id] = times;
        times.forEach(t => allReminderTimes.add(t));
      }
    }

    // Process each reminder threshold
    for (const hours of allReminderTimes) {
      const eligibleVisits = await getEligibleVisits(hours);

      for (const visit of eligibleVisits) {
        try {
          // Check if this patient has custom reminder times
          const patientUserId = visit.patient?.user_id;
          if (patientUserId && userCustomTimes[patientUserId]) {
            // Patient has custom times — only send if this hour is in their list
            if (!userCustomTimes[patientUserId].includes(hours)) {
              continue;
            }
          } else {
            // No custom times — only send if this hour is in system defaults
            if (!systemReminderTimes.includes(hours)) {
              continue;
            }
          }

          // Use system user ID for automated sends (or first admin user)
          const systemUser = await User.findOne({
            include: [{
              model: db.Role,
              as: 'role',
              where: { name: 'ADMIN' }
            }]
          });

          const userId = systemUser?.id || visit.dietitian_id;

          await sendVisitReminder(visit.id, userId, false);
          totalSent++;
          results.push({
            visitId: visit.id,
            patientName: `${visit.patient.first_name} ${visit.patient.last_name}`,
            success: true
          });
        } catch (error) {
          totalFailed++;
          results.push({
            visitId: visit.id,
            patientName: `${visit.patient.first_name} ${visit.patient.last_name}`,
            success: false,
            error: error.message
          });
        }
      }
    }

    console.log(`[AppointmentReminder] Batch complete: ${totalSent} sent, ${totalFailed} failed`);

    return {
      success: true,
      remindersEnabled: true,
      totalSent,
      totalFailed,
      results
    };
  } catch (error) {
    console.error('[AppointmentReminder] Error processing scheduled reminders:', error);
    throw error;
  }
}

/**
 * Get reminder statistics
 * @returns {Promise<Object>} Reminder statistics
 */
async function getReminderStats() {
  try {
    // Total reminders sent (from visits table)
    const totalReminders = await Visit.sum('reminders_sent') || 0;

    // Visits with reminders sent
    const visitsWithReminders = await Visit.count({
      where: {
        reminders_sent: {
          [Op.gt]: 0
        }
      }
    });

    // Upcoming scheduled visits needing reminders
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const maxReminders = await SystemSetting.getValue('max_reminders_per_visit') || 2;

    const upcomingNeedingReminders = await Visit.count({
      where: {
        status: 'SCHEDULED',
        visit_date: {
          [Op.between]: [now, oneWeekFromNow]
        },
        reminders_sent: {
          [Op.lt]: maxReminders
        }
      },
      include: [{
        model: Patient,
        as: 'patient',
        where: {
          email: { [Op.ne]: null },
          appointment_reminders_enabled: true
        },
        required: true
      }]
    });

    // Email log stats for appointment reminders
    const emailStats = await EmailLog.count({
      where: {
        status: 'sent'
      },
      include: [{
        model: EmailTemplate,
        as: 'template',
        where: {
          category: 'appointment_reminder'
        },
        required: true
      }]
    });

    const failedEmails = await EmailLog.count({
      where: {
        status: 'failed'
      },
      include: [{
        model: EmailTemplate,
        as: 'template',
        where: {
          category: 'appointment_reminder'
        },
        required: true
      }]
    });

    // Patients opted out
    const patientsOptedOut = await Patient.count({
      where: {
        appointment_reminders_enabled: false
      }
    });

    return {
      totalReminders,
      visitsWithReminders,
      upcomingNeedingReminders,
      emailsSent: emailStats,
      emailsFailed: failedEmails,
      patientsOptedOut
    };
  } catch (error) {
    console.error('[AppointmentReminder] Error getting reminder stats:', error);
    throw error;
  }
}

module.exports = {
  getEligibleVisits,
  sendVisitReminder,
  sendVisitInvitation,
  processScheduledReminders,
  getReminderStats
};
