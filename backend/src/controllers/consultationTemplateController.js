const consultationTemplateService = require('../services/consultationTemplate.service');

const getAllTemplates = async (req, res) => {
  try {
    const { is_active, template_type, search } = req.query;
    const filters = {};
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (template_type) filters.template_type = template_type;
    if (search) filters.search = search;

    const templates = await consultationTemplateService.getTemplates(req.user, filters);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error getting templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const template = await consultationTemplateService.getTemplateById(req.params.id, req.user);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error getting template:', error);
    const status = error.message === 'Template not found' ? 404 : error.message.includes('permission') ? 403 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const createTemplate = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ success: false, error: 'Template name is required' });
    }
    const template = await consultationTemplateService.createTemplate(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Template created successfully', data: template });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error creating template:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const template = await consultationTemplateService.updateTemplate(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Template updated successfully', data: template });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error updating template:', error);
    const status = error.message === 'Template not found' ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const result = await consultationTemplateService.deleteTemplate(req.params.id, req.user);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error deleting template:', error);
    const status = error.message === 'Template not found' ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const duplicateTemplate = async (req, res) => {
  try {
    const template = await consultationTemplateService.duplicateTemplate(req.params.id, req.body.name, req.user.id);
    res.status(201).json({ success: true, message: 'Template duplicated successfully', data: template });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error duplicating template:', error);
    const status = error.message === 'Template not found' ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Item operations
const addItem = async (req, res) => {
  try {
    if (!req.body.item_type) {
      return res.status(400).json({ success: false, error: 'item_type is required' });
    }
    const item = await consultationTemplateService.addItem(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error adding item:', error);
    const status = error.message.includes('not found') ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const item = await consultationTemplateService.updateItem(req.params.itemId, req.body, req.user);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error updating item:', error);
    const status = error.message.includes('not found') ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const removeItem = async (req, res) => {
  try {
    const result = await consultationTemplateService.removeItem(req.params.itemId, req.user);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error removing item:', error);
    const status = error.message.includes('not found') ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

const reorderItems = async (req, res) => {
  try {
    if (!req.body.itemIds || !Array.isArray(req.body.itemIds)) {
      return res.status(400).json({ success: false, error: 'itemIds array is required' });
    }
    await consultationTemplateService.reorderItems(req.params.id, req.body.itemIds, req.user);
    res.json({ success: true, message: 'Items reordered successfully' });
  } catch (error) {
    console.error('[ConsultationTemplateController] Error reordering items:', error);
    const status = error.message.includes('not found') ? 404 : error.message.includes('permission') ? 403 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  addItem,
  updateItem,
  removeItem,
  reorderItems
};
