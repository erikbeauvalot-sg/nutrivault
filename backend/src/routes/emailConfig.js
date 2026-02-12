/**
 * Email Config Routes
 * Per-user SMTP configuration management
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const userEmailConfigService = require('../services/userEmailConfig.service');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/email-config/me
 * Get current user's email config
 */
router.get('/me', async (req, res) => {
  try {
    const config = await userEmailConfigService.getConfig(req.user.id);
    res.json({
      success: true,
      data: userEmailConfigService.sanitizeConfig(config)
    });
  } catch (error) {
    console.error('Error getting email config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/email-config/me
 * Update current user's email config
 */
router.put('/me', async (req, res) => {
  try {
    const config = await userEmailConfigService.updateConfig(req.user.id, req.body);
    res.json({
      success: true,
      data: userEmailConfigService.sanitizeConfig(config)
    });
  } catch (error) {
    console.error('Error updating email config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-config/me/verify
 * Verify SMTP connection
 */
router.post('/me/verify', async (req, res) => {
  try {
    const result = await userEmailConfigService.verifyConfig(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error verifying email config:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/email-config/me/test
 * Send a test email
 */
router.post('/me/test', async (req, res) => {
  try {
    const { recipient } = req.body;
    if (!recipient) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }
    const result = await userEmailConfigService.sendTestEmail(req.user.id, recipient);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/email-config/me
 * Delete user's email config (return to global)
 */
router.delete('/me', async (req, res) => {
  try {
    await userEmailConfigService.deleteConfig(req.user.id);
    res.json({ success: true, message: 'Email configuration deleted' });
  } catch (error) {
    console.error('Error deleting email config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
