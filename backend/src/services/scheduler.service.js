/**
 * Scheduler Service
 * Manages all cron jobs and scheduled tasks
 */

const cron = require('node-cron');
const appointmentReminderService = require('./appointmentReminder.service');
const campaignSenderService = require('./campaignSender.service');
const db = require('../../../models');

const { SystemSetting } = db;

// Store active cron jobs
const jobs = {
  appointmentReminders: null,
  scheduledCampaigns: null
};

// Job metadata (descriptions, etc.)
const jobMeta = {
  appointmentReminders: {
    description: 'Sends appointment reminder emails to patients based on configured rules',
    triggerFn: 'triggerAppointmentRemindersNow',
    enabledKey: 'appointment_reminders_enabled'
  },
  scheduledCampaigns: {
    description: 'Processes and sends scheduled email campaigns',
    triggerFn: 'triggerScheduledCampaignsNow',
    enabledKey: 'scheduled_campaigns_enabled'
  }
};

// In-memory execution tracking per job
const executionLog = {};

function initExecutionLog(jobName) {
  if (!executionLog[jobName]) {
    executionLog[jobName] = {
      lastRunAt: null,
      lastFinishedAt: null,
      lastResult: null,
      lastError: null,
      runCount: 0,
      isExecuting: false
    };
  }
}

/**
 * Wrap a cron callback to record execution stats
 */
function wrapCallback(jobName, callback) {
  initExecutionLog(jobName);
  return async () => {
    const log = executionLog[jobName];
    log.isExecuting = true;
    log.lastRunAt = new Date().toISOString();
    log.lastError = null;
    log.lastResult = null;
    try {
      const result = await callback();
      log.lastResult = result || { success: true };
      log.runCount++;
    } catch (error) {
      log.lastError = error.message || String(error);
      log.runCount++;
    } finally {
      log.isExecuting = false;
      log.lastFinishedAt = new Date().toISOString();
    }
  };
}

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

    // Check if job is enabled
    const enabled = await SystemSetting.getValue('appointment_reminders_enabled');
    if (enabled === false) {
      console.log('[Scheduler] Appointment reminders job is disabled, skipping');
      initExecutionLog('appointmentReminders');
      return;
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
      wrapCallback('appointmentReminders', async () => {
        console.log('[Scheduler] Running appointment reminder job...');
        const result = await appointmentReminderService.processScheduledReminders();
        console.log(`[Scheduler] Appointment reminder job complete: ${result.totalSent} sent, ${result.totalFailed} failed`);
        return { totalSent: result.totalSent, totalFailed: result.totalFailed };
      }),
      {
        scheduled: true,
        timezone: process.env.TZ || 'Europe/Paris'
      }
    );

    // Initialize execution log
    initExecutionLog('appointmentReminders');

    console.log('[Scheduler] Appointment reminder job scheduled successfully');
  } catch (error) {
    console.error('[Scheduler] Error scheduling appointment reminders:', error);
  }
}

/**
 * Schedule campaign sender job
 * Checks for scheduled campaigns every minute
 */
async function scheduleScheduledCampaigns() {
  try {
    // Stop existing job if running
    if (jobs.scheduledCampaigns) {
      jobs.scheduledCampaigns.stop();
      jobs.scheduledCampaigns = null;
    }

    // Check if job is enabled
    const enabled = await SystemSetting.getValue('scheduled_campaigns_enabled');
    if (enabled === false) {
      console.log('[Scheduler] Scheduled campaigns job is disabled, skipping');
      initExecutionLog('scheduledCampaigns');
      return;
    }

    // Get cron schedule from settings
    const cronSchedule = await SystemSetting.getValue('scheduled_campaigns_cron') || '* * * * *';

    console.log(`[Scheduler] Scheduling campaign sender with cron: ${cronSchedule}`);

    // Create and start the job
    jobs.scheduledCampaigns = cron.schedule(
      cronSchedule,
      wrapCallback('scheduledCampaigns', async () => {
        await campaignSenderService.processScheduledCampaigns();
        return { success: true };
      }),
      {
        scheduled: true,
        timezone: process.env.TZ || 'Europe/Paris'
      }
    );

    // Initialize execution log
    initExecutionLog('scheduledCampaigns');

    console.log('[Scheduler] Campaign sender job scheduled successfully');
  } catch (error) {
    console.error('[Scheduler] Error scheduling campaign sender:', error);
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

    // Schedule campaign sender
    await scheduleScheduledCampaigns();

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
 * Get status of all scheduled jobs (legacy)
 */
function getJobStatus() {
  return {
    appointmentReminders: {
      running: jobs.appointmentReminders !== null,
      schedule: process.env.REMINDER_CRON || '0 * * * *'
    },
    scheduledCampaigns: {
      running: jobs.scheduledCampaigns !== null,
      schedule: '* * * * *'
    }
  };
}

/**
 * Get detailed status of all scheduled jobs including execution history
 */
async function getDetailedJobStatus() {
  // Fetch current cron schedule from DB for appointment reminders
  let appointmentCron = '0 * * * *';
  try {
    appointmentCron = await SystemSetting.getValue('appointment_reminder_cron') || '0 * * * *';
  } catch (e) {
    // ignore
  }

  let campaignCron = '* * * * *';
  try {
    campaignCron = await SystemSetting.getValue('scheduled_campaigns_cron') || '* * * * *';
  } catch (e) {
    // ignore
  }

  const schedules = {
    appointmentReminders: appointmentCron,
    scheduledCampaigns: campaignCron
  };

  const result = [];

  for (const jobName of Object.keys(jobs)) {
    initExecutionLog(jobName);
    const log = executionLog[jobName];
    const meta = jobMeta[jobName] || {};
    const schedule = schedules[jobName] || 'unknown';

    let isEnabled = true;
    if (meta.enabledKey) {
      try {
        const val = await SystemSetting.getValue(meta.enabledKey);
        isEnabled = val !== false && val !== null;
      } catch (e) {
        // default to enabled
      }
    }

    result.push({
      name: jobName,
      description: meta.description || '',
      cronSchedule: schedule,
      humanSchedule: cronToHuman(schedule),
      isActive: jobs[jobName] !== null,
      isEnabled,
      isExecuting: log.isExecuting,
      lastRunAt: log.lastRunAt,
      lastFinishedAt: log.lastFinishedAt,
      lastResult: log.lastResult,
      lastError: log.lastError,
      runCount: log.runCount
    });
  }

  return result;
}

/**
 * Convert cron expression to human-readable string
 */
function cronToHuman(expr) {
  const map = {
    '* * * * *': 'Every minute',
    '0 * * * *': 'Every hour',
    '*/5 * * * *': 'Every 5 minutes',
    '*/10 * * * *': 'Every 10 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 0 * * *': 'Every day at midnight',
    '0 8 * * *': 'Every day at 8:00 AM',
    '0 0 * * 1': 'Every Monday at midnight'
  };
  return map[expr] || expr;
}

/**
 * Manually trigger appointment reminder job
 */
async function triggerAppointmentRemindersNow() {
  console.log('[Scheduler] Manually triggering appointment reminder job...');
  initExecutionLog('appointmentReminders');
  const log = executionLog['appointmentReminders'];
  log.isExecuting = true;
  log.lastRunAt = new Date().toISOString();
  log.lastError = null;
  log.lastResult = null;

  try {
    const result = await appointmentReminderService.processScheduledReminders();
    const summary = { totalSent: result.totalSent, totalFailed: result.totalFailed };
    log.lastResult = summary;
    log.runCount++;
    console.log(`[Scheduler] Manual appointment reminder job complete: ${result.totalSent} sent, ${result.totalFailed} failed`);
    return summary;
  } catch (error) {
    log.lastError = error.message || String(error);
    log.runCount++;
    console.error('[Scheduler] Error in manual appointment reminder job:', error);
    throw error;
  } finally {
    log.isExecuting = false;
    log.lastFinishedAt = new Date().toISOString();
  }
}

/**
 * Manually trigger campaign sender job
 */
async function triggerScheduledCampaignsNow() {
  console.log('[Scheduler] Manually triggering campaign sender job...');
  initExecutionLog('scheduledCampaigns');
  const log = executionLog['scheduledCampaigns'];
  log.isExecuting = true;
  log.lastRunAt = new Date().toISOString();
  log.lastError = null;
  log.lastResult = null;

  try {
    await campaignSenderService.processScheduledCampaigns();
    const summary = { success: true };
    log.lastResult = summary;
    log.runCount++;
    console.log('[Scheduler] Manual campaign sender job complete');
    return summary;
  } catch (error) {
    log.lastError = error.message || String(error);
    log.runCount++;
    console.error('[Scheduler] Error in manual campaign sender job:', error);
    throw error;
  } finally {
    log.isExecuting = false;
    log.lastFinishedAt = new Date().toISOString();
  }
}

/**
 * Enable or disable a job: persist to DB and start/stop the cron
 */
async function toggleJob(jobName, enabled) {
  const meta = jobMeta[jobName];
  if (!meta || !meta.enabledKey) {
    throw new Error(`Unknown job: ${jobName}`);
  }

  const scheduleFns = {
    appointmentReminders: scheduleAppointmentReminders,
    scheduledCampaigns: scheduleScheduledCampaigns
  };

  await SystemSetting.setValue(meta.enabledKey, enabled);

  // Reschedule (will start or skip based on the new enabled value)
  await scheduleFns[jobName]();

  console.log(`[Scheduler] Job ${jobName} ${enabled ? 'enabled' : 'disabled'}`);

  return getDetailedJobStatus();
}

/**
 * Update a job's cron schedule: validate, persist to DB, and reschedule
 */
async function updateJobSchedule(jobName, cronSchedule) {
  const settingKeys = {
    appointmentReminders: 'appointment_reminder_cron',
    scheduledCampaigns: 'scheduled_campaigns_cron'
  };

  const scheduleFns = {
    appointmentReminders: scheduleAppointmentReminders,
    scheduledCampaigns: scheduleScheduledCampaigns
  };

  const settingKey = settingKeys[jobName];
  if (!settingKey) {
    throw new Error(`Unknown job: ${jobName}`);
  }

  if (!cron.validate(cronSchedule)) {
    throw new Error(`Invalid cron expression: ${cronSchedule}`);
  }

  // Persist to DB
  await SystemSetting.setValue(settingKey, cronSchedule);

  // Reschedule the job
  await scheduleFns[jobName]();

  console.log(`[Scheduler] Updated ${jobName} schedule to: ${cronSchedule}`);

  return getDetailedJobStatus();
}

module.exports = {
  initializeScheduledJobs,
  scheduleAppointmentReminders,
  scheduleScheduledCampaigns,
  stopAllJobs,
  getJobStatus,
  getDetailedJobStatus,
  triggerAppointmentRemindersNow,
  triggerScheduledCampaignsNow,
  updateJobSchedule,
  toggleJob
};
