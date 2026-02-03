/**
 * Scheduler Routes
 * Admin-only routes for viewing and triggering scheduled jobs
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { requireAnyRole } = require('../middleware/rbac');
const schedulerController = require('../controllers/schedulerController');

// All routes require admin role
router.use(authenticate, requireAnyRole(['ADMIN']));

// GET /api/scheduler/jobs - List all jobs with status
router.get('/jobs', schedulerController.getScheduledJobs);

// POST /api/scheduler/jobs/:name/trigger - Manually trigger a job
router.post('/jobs/:name/trigger', schedulerController.triggerJob);

// PUT /api/scheduler/jobs/:name - Update a job's cron schedule
router.put('/jobs/:name', schedulerController.updateJob);

// PATCH /api/scheduler/jobs/:name/toggle - Enable or disable a job
router.patch('/jobs/:name/toggle', schedulerController.toggleJob);

module.exports = router;
