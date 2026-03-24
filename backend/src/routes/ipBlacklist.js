/**
 * IP Blacklist Routes — Admin only
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const authenticate = require('../middleware/authenticate');
const { requireAnyRole } = require('../middleware/rbac');
const db = require('../../../models');
const { invalidateBlacklistCache } = require('../middleware/ipBlacklist');

// All routes require ADMIN role
router.use(authenticate, requireAnyRole(['ADMIN']));

/**
 * GET /api/ip-blacklist
 * List all blacklisted IPs (active and historical)
 */
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active === 'true') where.is_active = true;
    if (active === 'false') where.is_active = false;

    const entries = await db.IpBlacklist.findAll({
      where,
      order: [['blocked_at', 'DESC']],
      limit: 200
    });

    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ip-blacklist
 * Manually add an IP to the blacklist
 */
router.post('/', async (req, res, next) => {
  try {
    const { ip_address, reason } = req.body;

    if (!ip_address) {
      return res.status(400).json({ success: false, error: 'ip_address is required' });
    }

    // Deactivate any existing entry for this IP first
    await db.IpBlacklist.update(
      { is_active: false, unblocked_at: new Date(), unblocked_by: req.user.id },
      { where: { ip_address, is_active: true } }
    );

    const entry = await db.IpBlacklist.create({
      ip_address,
      reason: reason || 'Bloqué manuellement par un administrateur',
      auto_blocked: false,
      is_active: true,
      blocked_at: new Date()
    });

    invalidateBlacklistCache();

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/ip-blacklist/:id
 * Unblock an IP (sets is_active = false)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const entry = await db.IpBlacklist.findByPk(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    await entry.update({
      is_active: false,
      unblocked_at: new Date(),
      unblocked_by: req.user.id
    });

    invalidateBlacklistCache();

    res.json({ success: true, message: 'IP unblocked successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
