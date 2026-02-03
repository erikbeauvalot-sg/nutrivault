/**
 * Scheduler Controller
 * Admin-only endpoints for viewing and triggering scheduled jobs
 */

const schedulerService = require('../services/scheduler.service');

/**
 * Get all scheduled jobs with detailed status
 * GET /api/scheduler/jobs
 */
async function getScheduledJobs(req, res) {
  try {
    const jobs = await schedulerService.getDetailedJobStatus();
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('[SchedulerController] Error getting scheduled jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve scheduled jobs' });
  }
}

/**
 * Manually trigger a specific job by name
 * POST /api/scheduler/jobs/:name/trigger
 */
async function triggerJob(req, res) {
  const { name } = req.params;

  const triggers = {
    appointmentReminders: schedulerService.triggerAppointmentRemindersNow,
    scheduledCampaigns: schedulerService.triggerScheduledCampaignsNow
  };

  const triggerFn = triggers[name];
  if (!triggerFn) {
    return res.status(404).json({ success: false, error: `Unknown job: ${name}` });
  }

  try {
    const result = await triggerFn();
    res.json({ success: true, data: { job: name, result } });
  } catch (error) {
    console.error(`[SchedulerController] Error triggering job ${name}:`, error);
    res.status(500).json({ success: false, error: `Failed to trigger job: ${error.message}` });
  }
}

/**
 * Update a job's cron schedule
 * PUT /api/scheduler/jobs/:name
 */
async function updateJob(req, res) {
  const { name } = req.params;
  const { cronSchedule } = req.body;

  if (!cronSchedule) {
    return res.status(400).json({ success: false, error: 'cronSchedule is required' });
  }

  try {
    const jobs = await schedulerService.updateJobSchedule(name, cronSchedule);
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error(`[SchedulerController] Error updating job ${name}:`, error);
    const status = error.message.includes('Unknown job') ? 404
      : error.message.includes('Invalid cron') ? 400
      : 500;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * Enable or disable a job
 * PATCH /api/scheduler/jobs/:name/toggle
 */
async function toggleJob(req, res) {
  const { name } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, error: 'enabled (boolean) is required' });
  }

  try {
    const jobs = await schedulerService.toggleJob(name, enabled);
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error(`[SchedulerController] Error toggling job ${name}:`, error);
    const status = error.message.includes('Unknown job') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
}

module.exports = {
  getScheduledJobs,
  triggerJob,
  updateJob,
  toggleJob
};
