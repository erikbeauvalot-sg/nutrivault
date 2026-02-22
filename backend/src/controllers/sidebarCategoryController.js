const sidebarCategoryService = require('../services/sidebarCategory.service');

/**
 * GET / — Get all categories (authenticated)
 */
async function getAll(req, res) {
  try {
    const categories = await sidebarCategoryService.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching sidebar categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sidebar categories' });
  }
}

/**
 * POST / — Create a new category (admin only)
 */
async function create(req, res) {
  try {
    const { label, icon, section, is_default_open } = req.body;
    if (!label) {
      return res.status(400).json({ success: false, error: 'label is required' });
    }
    const category = await sidebarCategoryService.createCategory({ label, icon, section, is_default_open });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating sidebar category:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create category' });
  }
}

/**
 * PUT /:id — Update a category (admin only)
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { label, icon, is_default_open } = req.body;
    const category = await sidebarCategoryService.updateCategory(id, { label, icon, is_default_open });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating sidebar category:', error);
    if (error.message === 'Category not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to update category' });
  }
}

/**
 * DELETE /:id — Delete a category (admin only)
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    await sidebarCategoryService.deleteCategory(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sidebar category:', error);
    if (error.message === 'Category not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.code === 'HAS_ITEMS') {
      return res.status(409).json({ success: false, error: error.message, count: error.count });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to delete category' });
  }
}

/**
 * PUT /reorder — Reorder categories within a section (admin only)
 */
async function reorder(req, res) {
  try {
    const { section, orderedIds } = req.body;
    if (!section || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'section and orderedIds array are required' });
    }
    const categories = await sidebarCategoryService.reorderCategories(section, orderedIds);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error reordering sidebar categories:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder categories' });
  }
}

module.exports = { getAll, create, update, remove, reorder };
