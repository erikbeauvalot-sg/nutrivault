/**
 * Dashboard Routes
 * Routes for dashboard-related endpoints
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// All dashboard routes require authentication
router.use(authenticate);

// Dashboard overview endpoints
router.get('/overview', requirePermission('dashboard.read'), dashboardController.getOverview);
router.get('/revenue-chart', requirePermission('dashboard.read'), dashboardController.getRevenueChart);
router.get('/health-score', requirePermission('dashboard.read'), dashboardController.getHealthScore);
router.get('/activity', requirePermission('dashboard.read'), dashboardController.getActivityFeed);
router.get('/activity-summary', requirePermission('dashboard.read'), dashboardController.getActivitySummary);
router.get('/whats-new', requirePermission('dashboard.read'), dashboardController.getWhatsNew);
router.get('/changelogs', requirePermission('dashboard.read'), dashboardController.getAllChangelogs);
router.get('/recent-journal', requirePermission('dashboard.read'), dashboardController.getRecentJournal);

// Day stats (all stat counts in one call)
router.get('/day-stats', requirePermission('dashboard.read'), dashboardController.getDayStats);

// Dashboard preferences
router.get('/preferences', requirePermission('dashboard.read'), dashboardController.getDashboardPreferences);
router.put('/preferences', requirePermission('dashboard.update'), dashboardController.updateDashboardPreferences);

// Task endpoints
router.get('/tasks', requirePermission('tasks.read'), taskController.getTasks);
router.get('/tasks/stats', requirePermission('tasks.read'), taskController.getTaskStats);
router.get('/tasks/due-soon', requirePermission('tasks.read'), taskController.getTasksDueSoon);
router.get('/tasks/:id', requirePermission('tasks.read'), taskController.getTask);
router.post('/tasks', requirePermission('tasks.create'), taskController.createTask);
router.put('/tasks/:id', requirePermission('tasks.update'), taskController.updateTask);
router.put('/tasks/:id/complete', requirePermission('tasks.update'), taskController.completeTask);
router.delete('/tasks/:id', requirePermission('tasks.delete'), taskController.deleteTask);

module.exports = router;
