'use strict';

const { v4: uuidv4 } = require('uuid');

const DEFAULT_ENABLED_EVENTS = [
  'users.LOGIN',
  'users.CREATE',
  'users.DELETE',
  'patients.CREATE',
  'patients.DELETE',
  'visits.CREATE',
  'visits.DELETE',
  'recipes.UPDATE',
  'document.CREATE',
  'document.SHARE'
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('system_settings', [
      {
        id: uuidv4(),
        setting_key: 'discord_webhook_url',
        setting_value: '',
        description: 'Discord webhook URL for sending notifications',
        data_type: 'string',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        setting_key: 'discord_enabled_events',
        setting_value: JSON.stringify(DEFAULT_ENABLED_EVENTS),
        description: 'List of audit event types that trigger Discord notifications',
        data_type: 'json',
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');
    await queryInterface.bulkDelete('system_settings', {
      setting_key: {
        [Op.in]: ['discord_webhook_url', 'discord_enabled_events']
      }
    });
  }
};
