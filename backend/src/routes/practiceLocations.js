/**
 * Practice Locations Routes
 * Configurable list of consultation locations (cabinets).
 */

const express = require('express');
const router = express.Router();
const practiceLocationController = require('../controllers/practiceLocationController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// GET /api/practice-locations — any authenticated user (used to populate dropdowns)
router.get('/', authenticate, practiceLocationController.getAllPracticeLocations);

// Managing the list requires the settings permission (admin / dietitian).
router.post('/', authenticate, requirePermission('settings.manage'), practiceLocationController.createPracticeLocation);
router.put('/reorder', authenticate, requirePermission('settings.manage'), practiceLocationController.reorderPracticeLocations);
router.put('/:id', authenticate, requirePermission('settings.manage'), practiceLocationController.updatePracticeLocation);
router.delete('/:id', authenticate, requirePermission('settings.manage'), practiceLocationController.deletePracticeLocation);

module.exports = router;
