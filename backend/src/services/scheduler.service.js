/**
 * Scheduler Service
 * Manages all cron jobs and scheduled tasks
 */

const cron = require('node-cron');
const appointmentReminderService = require('./appointmentReminder.service');
const db = require('../../../models');

const { SystemSetting } = db;

// Store active cron jobs
const jobs = {
  appointmentReminders: null
};

/**
 * Schedule appointment reminder job
 */
async function scheduleAppointmentReminders() {
  try {
    // Stop existing job if running
    if (jobs.appointmentReminders) {
      jobs.appointmentReminders.stop();
      jobs.appointmentReminders = null;
    }

    // Get cron schedule from settings
    const cronSchedule = await SystemSetting.getValue('appointment_reminder_cron') || '0 * * * *';

    console.log(`[Scheduler] Scheduling appointment reminders with cron: ${cronSchedule}`);

    // Validate cron expression
    if (!cron.validate(cronSchedule)) {
      console.error(`[Scheduler] Invalid cron expression: ${cronSchedule}`);
      return;
    }

    // Create and start the job
    jobs.appointmentReminders = cron.schedule(
      cronSchedule,
      async () => {
        console.log('[Scheduler] Running appointment reminder job...');
        try {
          const result = await appointmentReminderService.processScheduledReminders();
          console.log(`[Scheduler] Appointment reminder job complete: ${result.totalSent} sent, ${result.totalFailed} failed`);
        } catch (error) {
          console.error('[Scheduler] Error in appointment reminder job:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'Europe/Paris'
      }
    );

    console.log('[Scheduler] Appointment reminder job scheduled successfully');
  } catch (error) {
    console.error('[Scheduler] Error scheduling appointment reminders:', error);
  }
}

/**
 * Initialize all scheduled jobs
 */
async function initializeScheduledJobs() {
  try {
    console.log('[Scheduler] Initializing scheduled jobs...');

    // Schedule appointment reminders
    await scheduleAppointmentReminders();

    console.log('[Scheduler] All scheduled jobs initialized');
  } catch (error) {
    console.error('[Scheduler] Error initializing scheduled jobs:', error);
  }
}

/**
 * Stop all running jobs
 */
function stopAllJobs() {
  console.log('[Scheduler] Stopping all scheduled jobs...');

  Object.keys(jobs).forEach((jobName) => {
    if (jobs[jobName]) {
      jobs[jobName].stop();
      console.log(`[Scheduler] Stopped job: ${jobName}`);
    }
  });

  console.log('[Scheduler] All jobs stopped');
}

/**
 * Get status of all scheduled jobs
 */
function getJobStatus() {
  return {
    appointmentReminders: {
      running: jobs.appointmentReminders !== null,
      schedule: process.env.REMINDER_CRON || '0 * * * *'
    }
  };
}

/**
 * Manually trigger appointment reminder job
 */
async function triggerAppointmentRemindersNow() {
  console.log('[Scheduler] Manually triggering appointment reminder job...');
  try {
    const result = await appointmentReminderService.processScheduledReminders();
    console.log(`[Scheduler] Manual appointment reminder job complete: ${result.totalSent} sent, ${result.totalFailed} failed`);
    return result;
  } catch (error) {
    console.error('[Scheduler] Error in manual appointment reminder job:', error);
    throw error;
  }
}

module.exports = {
  initializeScheduledJobs,
  scheduleAppointmentReminders,
  stopAllJobs,
  getJobStatus,
  triggerAppointmentRemindersNow
};
