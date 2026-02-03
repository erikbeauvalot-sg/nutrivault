'use strict';

const crypto = require('crypto');

const SETTINGS = [
  {
    setting_key: 'appointment_reminders_enabled',
    setting_value: 'true',
    description: 'Whether the appointment reminders job is enabled',
    data_type: 'boolean'
  },
  {
    setting_key: 'scheduled_campaigns_enabled',
    setting_value: 'true',
    description: 'Whether the scheduled campaigns job is enabled',
    data_type: 'boolean'
  }
];

module.exports = {
  up: async (queryInterface) => {
    for (const s of SETTINGS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM system_settings WHERE setting_key = '${s.setting_key}'`
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO system_settings (id, setting_key, setting_value, description, data_type, created_at, updated_at)
           VALUES ('${crypto.randomUUID()}', '${s.setting_key}', '${s.setting_value}', '${s.description}', '${s.data_type}', datetime('now'), datetime('now'))`
        );
      }
    }
  },

  down: async (queryInterface) => {
    for (const s of SETTINGS) {
      await queryInterface.sequelize.query(
        `DELETE FROM system_settings WHERE setting_key = '${s.setting_key}'`
      );
    }
  }
};
