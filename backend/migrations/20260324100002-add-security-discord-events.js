'use strict';

const SECURITY_EVENTS = ['security.LOGIN_FAILED', 'security.IP_BLOCKED', 'security.ACCOUNT_LOCKED'];

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'discord_enabled_events' LIMIT 1"
    );

    if (!rows.length) return;

    let events = [];
    try { events = JSON.parse(rows[0].setting_value); } catch { events = []; }

    // Add security events if not already present
    const updated = [...new Set([...events, ...SECURITY_EVENTS])];

    await queryInterface.sequelize.query(
      "UPDATE system_settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'discord_enabled_events'",
      { replacements: [JSON.stringify(updated), new Date()] }
    );
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'discord_enabled_events' LIMIT 1"
    );

    if (!rows.length) return;

    let events = [];
    try { events = JSON.parse(rows[0].setting_value); } catch { events = []; }

    const updated = events.filter(e => !SECURITY_EVENTS.includes(e));

    await queryInterface.sequelize.query(
      "UPDATE system_settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'discord_enabled_events'",
      { replacements: [JSON.stringify(updated), new Date()] }
    );
  }
};
