const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const db = require('../../../models');

/**
 * POST /api/device-tokens — Register a device push token
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { token, platform = 'ios', device_name } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Upsert: reactivate if the same user+token combo exists
    const [deviceToken, created] = await db.DeviceToken.findOrCreate({
      where: { user_id: req.user.id, token },
      defaults: {
        platform,
        device_name,
        is_active: true,
        last_used_at: new Date(),
      },
    });

    if (!created) {
      await deviceToken.update({
        is_active: true,
        platform,
        device_name: device_name || deviceToken.device_name,
        last_used_at: new Date(),
      });
    }

    res.status(created ? 201 : 200).json({
      data: { id: deviceToken.id, platform: deviceToken.platform },
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

/**
 * DELETE /api/device-tokens — Unregister a device push token
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    await db.DeviceToken.update(
      { is_active: false },
      { where: { user_id: req.user.id, token } }
    );

    res.json({ message: 'Device token unregistered' });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({ error: 'Failed to unregister device token' });
  }
});

module.exports = router;
