const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sidebarCategoryController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

// GET / — All authenticated users (sidebar needs this)
router.get('/', authenticate, ctrl.getAll);

// POST / — Admin only
router.post('/', authenticate, requireRole('ADMIN'), ctrl.create);

// PUT /reorder — Admin only (must be before /:id)
router.put('/reorder', authenticate, requireRole('ADMIN'), ctrl.reorder);

// PUT /:id — Admin only
router.put('/:id', authenticate, requireRole('ADMIN'), ctrl.update);

// DELETE /:id — Admin only
router.delete('/:id', authenticate, requireRole('ADMIN'), ctrl.remove);

module.exports = router;
