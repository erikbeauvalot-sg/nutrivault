/**
 * Email Logs Routes
 * API endpoints for email communication history
 */

const express = require('express');
const router = express.Router();
const emailLogController = require('../controllers/emailLogController');
const authenticate = require('../middleware/authenticate');

// All routes require authentication
router.use(authenticate);

// Get available email types
router.get('/types', emailLogController.getEmailTypes);

// Get a single email log
router.get('/:id', emailLogController.getEmailLog);

module.exports = router;
