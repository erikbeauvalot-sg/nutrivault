const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sidebarSectionController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, requireRole('ADMIN'), ctrl.create);
router.put('/reorder', authenticate, requireRole('ADMIN'), ctrl.reorder);
router.put('/:id', authenticate, requireRole('ADMIN'), ctrl.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), ctrl.remove);

module.exports = router;
