const express = require('express');
const router = express.Router();
const sidebarMenuConfigController = require('../controllers/sidebarMenuConfigController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

// GET / — All authenticated users (sidebar needs this)
router.get('/', authenticate, sidebarMenuConfigController.getAll);

// PUT /bulk — Admin only
router.put('/bulk', authenticate, requireRole('ADMIN'), sidebarMenuConfigController.bulkUpdate);

// PUT /reorder — Admin only
router.put('/reorder', authenticate, requireRole('ADMIN'), sidebarMenuConfigController.reorder);

// POST /reset — Admin only
router.post('/reset', authenticate, requireRole('ADMIN'), sidebarMenuConfigController.resetToDefaults);

module.exports = router;
