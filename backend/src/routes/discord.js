/**
 * Discord Webhook Routes
 * Admin-only routes for managing Discord webhook notifications
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { requireAnyRole } = require('../middleware/rbac');
const discordController = require('../controllers/discordController');

// All routes require admin role
router.use(authenticate, requireAnyRole(['ADMIN']));

// GET /api/discord/settings
router.get('/settings', discordController.getSettings);

// PUT /api/discord/settings
router.put('/settings', discordController.updateSettings);

// POST /api/discord/test
router.post('/test', discordController.testWebhook);

module.exports = router;
