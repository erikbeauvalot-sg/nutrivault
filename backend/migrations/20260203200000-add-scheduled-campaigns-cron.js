'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Check if the setting already exists
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM system_settings WHERE setting_key = 'scheduled_campaigns_cron'`
    );

    if (existing.length === 0) {
      await queryInterface.sequelize.query(
        `INSERT INTO system_settings (id, setting_key, setting_value, description, data_type, created_at, updated_at)
         VALUES (
           '${require('crypto').randomUUID()}',
           'scheduled_campaigns_cron',
           '* * * * *',
           'Cron schedule for campaign sender job',
           'string',
           datetime('now'),
           datetime('now')
         )`
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DELETE FROM system_settings WHERE setting_key = 'scheduled_campaigns_cron'`
    );
  }
};
