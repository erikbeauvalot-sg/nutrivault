/**
 * App Settings Routes
 * Application-wide feature toggles (e.g. patient health score).
 */

const express = require('express');
const router = express.Router();
const appSettingsController = require('../controllers/appSettingsController');
const authenticate = require('../middleware/authenticate');
const { requireAnyRole } = require('../middleware/rbac');

// GET /api/app-settings — any authenticated user (pages adapt their display)
router.get('/', authenticate, appSettingsController.getSettings);

// PUT /api/app-settings — admin only
router.put('/', authenticate, requireAnyRole(['ADMIN']), appSettingsController.updateSettings);

module.exports = router;
