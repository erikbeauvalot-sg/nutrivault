/**
 * Discord Webhook Controller
 * Admin endpoints for managing Discord webhook settings
 */

const db = require('../../../models');
const discordService = require('../services/discord.service');

/**
 * GET /api/discord/settings
 * Returns webhook URL, enabled events, and available events list
 */
async function getSettings(req, res) {
  try {
    const webhookUrl = await db.SystemSetting.getValue('discord_webhook_url');
    const enabledEvents = await db.SystemSetting.getValue('discord_enabled_events');

    res.json({
      success: true,
      data: {
        webhookUrl: webhookUrl || '',
        enabledEvents: Array.isArray(enabledEvents) ? enabledEvents : [],
        availableEvents: discordService.AVAILABLE_EVENTS
      }
    });
  } catch (error) {
    console.error('Discord getSettings error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load Discord settings' });
  }
}

/**
 * PUT /api/discord/settings
 * Saves webhook URL and enabled events
 */
async function updateSettings(req, res) {
  try {
    const { webhookUrl, enabledEvents } = req.body;

    if (webhookUrl !== undefined) {
      await db.SystemSetting.setValue('discord_webhook_url', webhookUrl);
    }

    if (enabledEvents !== undefined) {
      if (!Array.isArray(enabledEvents)) {
        return res.status(400).json({ success: false, error: 'enabledEvents must be an array' });
      }
      await db.SystemSetting.setValue('discord_enabled_events', enabledEvents);
    }

    // Invalidate cached settings in discord service
    discordService.invalidateCache();

    res.json({ success: true, message: 'Discord settings updated' });
  } catch (error) {
    console.error('Discord updateSettings error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update Discord settings' });
  }
}

/**
 * POST /api/discord/test
 * Sends a test message to the provided webhook URL
 */
async function testWebhook(req, res) {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: 'webhookUrl is required' });
    }

    await discordService.sendTestMessage(webhookUrl);

    // Auto-save URL on successful test
    await db.SystemSetting.setValue('discord_webhook_url', webhookUrl);
    discordService.invalidateCache();

    res.json({ success: true, message: 'Test message sent successfully' });
  } catch (error) {
    console.error('Discord testWebhook error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  testWebhook
};
