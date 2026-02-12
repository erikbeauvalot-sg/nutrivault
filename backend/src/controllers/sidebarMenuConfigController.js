const sidebarMenuConfigService = require('../services/sidebarMenuConfig.service');

/**
 * GET / — Get all sidebar menu configs
 */
async function getAll(req, res) {
  try {
    const configs = await sidebarMenuConfigService.getAllConfigs();
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error fetching sidebar configs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sidebar configs' });
  }
}

/**
 * PUT /bulk — Bulk update sidebar menu items (admin only)
 */
async function bulkUpdate(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    // Ensure ADMIN is always in allowed_roles to prevent lock-out
    for (const item of items) {
      if (item.allowed_roles && !item.allowed_roles.includes('ADMIN')) {
        item.allowed_roles.push('ADMIN');
      }
    }

    const configs = await sidebarMenuConfigService.bulkUpdate(items);
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error bulk updating sidebar configs:', error);
    res.status(500).json({ success: false, error: 'Failed to update sidebar configs' });
  }
}

/**
 * PUT /reorder — Reorder items within a section (admin only)
 */
async function reorder(req, res) {
  try {
    const { section, orderData } = req.body;
    if (!section || !Array.isArray(orderData)) {
      return res.status(400).json({ success: false, error: 'section and orderData are required' });
    }

    const configs = await sidebarMenuConfigService.reorderItems(section, orderData);
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error reordering sidebar configs:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder sidebar configs' });
  }
}

/**
 * POST /reset — Reset to defaults (admin only)
 */
async function resetToDefaults(req, res) {
  try {
    const configs = await sidebarMenuConfigService.resetToDefaults();
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error resetting sidebar configs:', error);
    res.status(500).json({ success: false, error: 'Failed to reset sidebar configs' });
  }
}

module.exports = {
  getAll,
  bulkUpdate,
  reorder,
  resetToDefaults
};
