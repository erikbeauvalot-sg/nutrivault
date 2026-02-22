const sidebarSectionService = require('../services/sidebarSection.service');

async function getAll(req, res) {
  try {
    const sections = await sidebarSectionService.getAllSections();
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error fetching sidebar sections:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sections' });
  }
}

async function create(req, res) {
  try {
    const { label, icon, is_default_open } = req.body;
    if (!label) return res.status(400).json({ success: false, error: 'label is required' });
    const section = await sidebarSectionService.createSection({ label, icon, is_default_open });
    res.status(201).json({ success: true, data: section });
  } catch (error) {
    console.error('Error creating sidebar section:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create section' });
  }
}

async function update(req, res) {
  try {
    const section = await sidebarSectionService.updateSection(req.params.id, req.body);
    res.json({ success: true, data: section });
  } catch (error) {
    console.error('Error updating sidebar section:', error);
    if (error.message === 'Section not found') return res.status(404).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: error.message || 'Failed to update section' });
  }
}

async function remove(req, res) {
  try {
    await sidebarSectionService.deleteSection(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sidebar section:', error);
    if (error.message === 'Section not found') return res.status(404).json({ success: false, error: error.message });
    if (error.code === 'BUILTIN') return res.status(403).json({ success: false, error: error.message });
    if (error.code === 'HAS_CATEGORIES') return res.status(409).json({ success: false, error: error.message, count: error.count });
    res.status(500).json({ success: false, error: error.message || 'Failed to delete section' });
  }
}

async function reorder(req, res) {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ success: false, error: 'orderedIds array is required' });
    const sections = await sidebarSectionService.reorderSections(orderedIds);
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Error reordering sidebar sections:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder sections' });
  }
}

module.exports = { getAll, create, update, remove, reorder };
