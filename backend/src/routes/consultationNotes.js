const express = require('express');
const router = express.Router();
const controller = require('../controllers/consultationNoteController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

router.post('/', authenticate, requirePermission('consultation_templates.create'), controller.createNote);
router.get('/', authenticate, requirePermission('consultation_templates.read'), controller.getNotes);
router.get('/:id', authenticate, requirePermission('consultation_templates.read'), controller.getNoteById);
router.put('/:id/values', authenticate, requirePermission('consultation_templates.update'), controller.saveNoteValues);
router.put('/:id/complete', authenticate, requirePermission('consultation_templates.update'), controller.completeNote);
router.delete('/:id', authenticate, requirePermission('consultation_templates.delete'), controller.deleteNote);

module.exports = router;
