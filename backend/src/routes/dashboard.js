/**
 * Dashboard Routes
 * Routes for dashboard-related endpoints
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');

// All dashboard routes require authentication
router.use(authenticate);

// Dashboard overview endpoints
router.get('/overview', dashboardController.getOverview);
router.get('/revenue-chart', dashboardController.getRevenueChart);
router.get('/health-score', dashboardController.getHealthScore);
router.get('/activity', dashboardController.getActivityFeed);
router.get('/activity-summary', dashboardController.getActivitySummary);
router.get('/whats-new', dashboardController.getWhatsNew);
router.get('/changelogs', dashboardController.getAllChangelogs);

// Task endpoints
router.get('/tasks', taskController.getTasks);
router.get('/tasks/stats', taskController.getTaskStats);
router.get('/tasks/due-soon', taskController.getTasksDueSoon);
router.get('/tasks/:id', taskController.getTask);
router.post('/tasks', taskController.createTask);
router.put('/tasks/:id', taskController.updateTask);
router.put('/tasks/:id/complete', taskController.completeTask);
router.delete('/tasks/:id', taskController.deleteTask);

module.exports = router;
