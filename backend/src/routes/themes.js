const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const db = require('../../../models');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const uuidParam = [
  param('id').isUUID().withMessage('Invalid theme ID')
];

const themeValidation = [
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required (max 100 chars)'),
  body('description').optional({ checkFalsy: true }).trim(),
  body('colors').notEmpty().isObject().withMessage('Colors must be a JSON object')
];

const themeUpdateValidation = [
  body('name').optional().trim().isLength({ max: 100 }),
  body('description').optional({ checkFalsy: true }).trim(),
  body('colors').optional().isObject()
];

// GET /api/themes — list all themes (any authenticated user)
router.get('/', authenticate, async (req, res) => {
  try {
    const themes = await db.Theme.findAll({
      include: [{ model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }],
      order: [['is_system', 'DESC'], ['name', 'ASC']]
    });
    res.json({ success: true, data: themes });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch themes' });
  }
});

// GET /api/themes/:id — get single theme
router.get('/:id', authenticate, uuidParam, validate, async (req, res) => {
  try {
    const theme = await db.Theme.findByPk(req.params.id, {
      include: [{ model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }]
    });
    if (!theme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }
    res.json({ success: true, data: theme });
  } catch (error) {
    console.error('Error fetching theme:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch theme' });
  }
});

// POST /api/themes — create theme (ADMIN only)
router.post('/', authenticate, requireRole('ADMIN'), themeValidation, validate, async (req, res) => {
  try {
    const { name, description, colors } = req.body;
    const theme = await db.Theme.create({
      name,
      description: description || null,
      colors,
      is_system: false,
      is_default: false,
      created_by: req.user.id
    });
    const full = await db.Theme.findByPk(theme.id, {
      include: [{ model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }]
    });
    res.status(201).json({ success: true, data: full });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, error: 'A theme with this name already exists' });
    }
    console.error('Error creating theme:', error);
    res.status(500).json({ success: false, error: 'Failed to create theme' });
  }
});

// POST /api/themes/:id/duplicate — duplicate theme (ADMIN only)
router.post('/:id/duplicate', authenticate, requireRole('ADMIN'), uuidParam, validate, async (req, res) => {
  try {
    const source = await db.Theme.findByPk(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }

    // Generate unique name
    let baseName = source.name + ' (copy)';
    let name = baseName;
    let counter = 2;
    while (await db.Theme.findOne({ where: { name } })) {
      name = `${baseName} ${counter}`;
      counter++;
    }

    const theme = await db.Theme.create({
      name,
      description: source.description,
      colors: source.colors,
      is_system: false,
      is_default: false,
      created_by: req.user.id
    });
    const full = await db.Theme.findByPk(theme.id, {
      include: [{ model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }]
    });
    res.status(201).json({ success: true, data: full });
  } catch (error) {
    console.error('Error duplicating theme:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate theme' });
  }
});

// PUT /api/themes/:id — update theme (ADMIN only)
router.put('/:id', authenticate, requireRole('ADMIN'), uuidParam, themeUpdateValidation, validate, async (req, res) => {
  try {
    const theme = await db.Theme.findByPk(req.params.id);
    if (!theme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }

    // Block renaming system themes
    if (theme.is_system && req.body.name && req.body.name !== theme.name) {
      return res.status(400).json({ success: false, error: 'Cannot rename system themes' });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.colors !== undefined) updateData.colors = req.body.colors;

    await theme.update(updateData);

    const full = await db.Theme.findByPk(theme.id, {
      include: [{ model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] }]
    });
    res.json({ success: true, data: full });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, error: 'A theme with this name already exists' });
    }
    console.error('Error updating theme:', error);
    res.status(500).json({ success: false, error: 'Failed to update theme' });
  }
});

// DELETE /api/themes/:id — delete theme (ADMIN only, block system themes)
router.delete('/:id', authenticate, requireRole('ADMIN'), uuidParam, validate, async (req, res) => {
  try {
    const theme = await db.Theme.findByPk(req.params.id);
    if (!theme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }

    if (theme.is_system) {
      return res.status(400).json({ success: false, error: 'Cannot delete system themes' });
    }

    // Reset users who had this theme to null (they'll fall back to default)
    await db.User.update({ theme_id: null }, { where: { theme_id: theme.id } });

    await theme.destroy();
    res.json({ success: true, message: 'Theme deleted successfully' });
  } catch (error) {
    console.error('Error deleting theme:', error);
    res.status(500).json({ success: false, error: 'Failed to delete theme' });
  }
});

// POST /api/themes/export — export themes as JSON (ADMIN only)
router.post('/export', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { themeIds } = req.body;

    let where = {};
    if (Array.isArray(themeIds) && themeIds.length > 0) {
      where.id = themeIds;
    }

    const themes = await db.Theme.findAll({ where, order: [['name', 'ASC']] });

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      exportedBy: 'admin',
      themes: themes.map(t => ({
        name: t.name,
        description: t.description,
        colors: t.colors,
        is_system: t.is_system || false
      }))
    };

    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Error exporting themes:', error);
    res.status(500).json({ success: false, error: 'Failed to export themes' });
  }
});

// POST /api/themes/import — import themes from JSON (ADMIN only)
router.post('/import', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { importData, options = {} } = req.body;
    const skipExisting = options.skipExisting !== false; // default true

    // Validate structure
    if (!importData || !importData.version || !Array.isArray(importData.themes)) {
      return res.status(400).json({ success: false, error: 'Invalid import data: missing version or themes array' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const themeData of importData.themes) {
      // Validate each theme
      if (!themeData.name || !themeData.colors || typeof themeData.colors !== 'object') {
        results.errors.push(`Invalid theme: missing name or colors`);
        continue;
      }

      const existing = await db.Theme.findOne({ where: { name: themeData.name } });

      if (existing) {
        if (skipExisting) {
          results.skipped++;
          continue;
        }
        // Create with suffix
        themeData.name = `${themeData.name} (imported)`;
      }

      await db.Theme.create({
        name: themeData.name,
        description: themeData.description || null,
        colors: themeData.colors,
        is_system: false,
        is_default: false,
        created_by: req.user.id
      });
      results.created++;
    }

    res.json({ success: true, results });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, error: 'A theme with this name already exists' });
    }
    console.error('Error importing themes:', error);
    res.status(500).json({ success: false, error: 'Failed to import themes' });
  }
});

// PUT /api/themes/user/preference — update current user's theme preference
router.put('/user/preference', authenticate, [
  body('theme_id').optional({ nullable: true }).isUUID().withMessage('Invalid theme ID')
], validate, async (req, res) => {
  try {
    const { theme_id } = req.body;

    if (theme_id) {
      const theme = await db.Theme.findByPk(theme_id);
      if (!theme) {
        return res.status(404).json({ success: false, error: 'Theme not found' });
      }
    }

    await db.User.update({ theme_id: theme_id || null }, { where: { id: req.user.id } });
    res.json({ success: true, message: 'Theme preference updated' });
  } catch (error) {
    console.error('Error updating theme preference:', error);
    res.status(500).json({ success: false, error: 'Failed to update theme preference' });
  }
});

module.exports = router;
