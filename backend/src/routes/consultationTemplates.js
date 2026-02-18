const express = require('express');
const router = express.Router();
const controller = require('../controllers/consultationTemplateController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// Template CRUD
router.get('/', authenticate, requirePermission('consultation_templates.read'), controller.getAllTemplates);
router.post('/', authenticate, requirePermission('consultation_templates.create'), controller.createTemplate);
router.get('/:id', authenticate, requirePermission('consultation_templates.read'), controller.getTemplateById);
router.put('/:id', authenticate, requirePermission('consultation_templates.update'), controller.updateTemplate);
router.delete('/:id', authenticate, requirePermission('consultation_templates.delete'), controller.deleteTemplate);
router.post('/:id/duplicate', authenticate, requirePermission('consultation_templates.create'), controller.duplicateTemplate);

// Item operations
router.post('/:id/items', authenticate, requirePermission('consultation_templates.update'), controller.addItem);
router.post('/:id/items/reorder', authenticate, requirePermission('consultation_templates.update'), controller.reorderItems);
router.put('/items/:itemId', authenticate, requirePermission('consultation_templates.update'), controller.updateItem);
router.delete('/items/:itemId', authenticate, requirePermission('consultation_templates.delete'), controller.removeItem);

module.exports = router;
